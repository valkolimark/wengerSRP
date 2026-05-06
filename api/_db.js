import pg from 'pg';
import { parse as parseConnectionString } from 'pg-connection-string';

const { Pool } = pg;

let pool;
function getPool() {
  if (pool) return pool;
  const connStr =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL;
  if (!connStr) throw new Error('POSTGRES_URL not configured');

  // Parse first so the URL's `sslmode=require` doesn't trump our ssl config.
  // Supabase's pooler presents a chain that node's stock root CAs don't fully
  // recognize; rejectUnauthorized:false is fine for an internal app.
  const parsed = parseConnectionString(connStr);
  pool = new Pool({
    host: parsed.host,
    port: parsed.port ? Number(parsed.port) : 5432,
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 10_000,
  });
  return pool;
}

export async function query(text, params) {
  return getPool().query(text, params);
}

let initialized = false;
export async function ensureSchema() {
  if (initialized) return;
  await query(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      rep_name TEXT,
      customer_name TEXT,
      scenario_title TEXT,
      scenario_category TEXT,
      score INTEGER,
      behaviors_hit INTEGER,
      behaviors_total INTEGER,
      breakdown JSONB,
      hit_behaviors JSONB,
      missed_behaviors JSONB,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON entries(timestamp)`);
  initialized = true;
}

export function rowToEntry(row) {
  return {
    id: row.id,
    date: row.date,
    timestamp: Number(row.timestamp),
    repName: row.rep_name,
    customerName: row.customer_name,
    scenarioTitle: row.scenario_title,
    scenarioCategory: row.scenario_category,
    score: row.score,
    behaviorsHit: row.behaviors_hit,
    behaviorsTotal: row.behaviors_total,
    breakdown: row.breakdown || [],
    hitBehaviors: row.hit_behaviors || [],
    missedBehaviors: row.missed_behaviors || [],
    notes: row.notes || '',
  };
}

export function isAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const supplied = req.headers['x-admin-password'];
  return supplied === expected;
}
