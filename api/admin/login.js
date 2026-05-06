export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    res.status(500).json({ error: 'ADMIN_PASSWORD not configured on server' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const supplied = body.password || '';

  if (supplied !== expected) {
    res.status(401).json({ ok: false });
    return;
  }
  res.status(200).json({ ok: true });
}
