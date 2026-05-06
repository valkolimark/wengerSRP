import { ensureSchema, query, rowToEntry } from '../_db.js';

function makeId() {
  return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function dateKey(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default async function handler(req, res) {
  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const { date } = req.query || {};
      const result = date
        ? await query('SELECT * FROM entries WHERE date = $1 ORDER BY score DESC, timestamp DESC', [date])
        : await query('SELECT * FROM entries ORDER BY timestamp DESC');
      res.status(200).json({ entries: result.rows.map(rowToEntry) });
      return;
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const timestamp = Number(body.timestamp) || Date.now();
      const id = body.id || makeId();
      const date = body.date || dateKey(timestamp);

      await query(
        `INSERT INTO entries (
           id, date, timestamp, rep_name, customer_name, scenario_title,
           scenario_category, score, behaviors_hit, behaviors_total,
           breakdown, hit_behaviors, missed_behaviors, notes
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11::jsonb, $12::jsonb, $13::jsonb, $14
         )
         ON CONFLICT (id) DO NOTHING`,
        [
          id, date, timestamp,
          body.repName || '', body.customerName || '',
          body.scenarioTitle || '', body.scenarioCategory || '',
          Number(body.score) || 0,
          Number(body.behaviorsHit) || 0,
          Number(body.behaviorsTotal) || 0,
          JSON.stringify(body.breakdown || []),
          JSON.stringify(body.hitBehaviors || []),
          JSON.stringify(body.missedBehaviors || []),
          body.notes || '',
        ]
      );

      const fetched = await query('SELECT * FROM entries WHERE id = $1', [id]);
      res.status(200).json({ entry: rowToEntry(fetched.rows[0]) });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('entries handler error', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
}
