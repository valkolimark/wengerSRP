import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

// Routes the dev server understands. In production these are served by Vercel's
// file-based routing under /api; in dev we replicate that mapping here so a
// plain `npm run dev` runs the whole stack against Supabase.
const API_ROUTES = [
  { match: /^entries\/?$/,           file: 'api/entries/index.js',    extract: () => ({}) },
  { match: /^entries\/([^/]+)\/?$/,  file: 'api/entries/[id].js',     extract: (m) => ({ id: m[1] }) },
  { match: /^admin\/login\/?$/,      file: 'api/admin/login.js',      extract: () => ({}) },
];

function loadEnvLocal() {
  // Same precedence as Vercel: .env.local wins. Don't overwrite anything set
  // explicitly in the parent shell.
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  text.split(/\r?\n/).forEach((line) => {
    if (!line || line.startsWith('#')) return;
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!m) return;
    const [, k, vRaw] = m;
    if (process.env[k]) return;
    process.env[k] = vRaw.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  });
}

function makeFakeRes(realRes) {
  const fake = {
    statusCode: 200,
    headersSent: false,
    status(code) { realRes.statusCode = code; return fake; },
    setHeader(k, v) { realRes.setHeader(k, v); return fake; },
    json(payload) {
      realRes.setHeader('Content-Type', 'application/json');
      realRes.end(JSON.stringify(payload));
      return fake;
    },
    end(body) { realRes.end(body); return fake; },
  };
  return fake;
}

function devApiPlugin() {
  return {
    name: 'wenger-dev-api',
    configureServer(server) {
      loadEnvLocal();

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();

        const url = new URL(req.url, 'http://localhost');
        const tail = url.pathname.slice('/api/'.length);

        const route = API_ROUTES.find((r) => r.match.test(tail));
        if (!route) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `No dev API route for ${tail}` }));
          return;
        }

        // Read raw body for non-GET requests.
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf8');
        let body = {};
        if (raw) {
          try { body = JSON.parse(raw); } catch { body = raw; }
        }

        const query = Object.fromEntries(url.searchParams.entries());
        const dyn = route.extract(tail.match(route.match));
        Object.assign(query, dyn);

        const fakeReq = {
          method: req.method,
          headers: req.headers,
          url: req.url,
          query,
          body,
        };
        const fakeRes = makeFakeRes(res);

        try {
          const filePath = resolve(process.cwd(), route.file);
          // Cache-bust on every request so edits to /api files take effect
          // without restarting the dev server.
          const mod = await import(`${pathToFileURL(filePath).href}?t=${Date.now()}`);
          await mod.default(fakeReq, fakeRes);
        } catch (err) {
          console.error('[dev-api]', tail, err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Server error' }));
          }
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  server: {
    port: 5173,
    open: true,
  },
});
