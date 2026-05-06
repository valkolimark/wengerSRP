import { ensureSchema, query, rowToEntry, isAdmin } from '../_db.js';

const EDITABLE_FIELDS = new Set([
  'repName', 'customerName', 'score',
  'behaviorsHit', 'behaviorsTotal', 'notes',
  'breakdown', 'hitBehaviors', 'missedBehaviors',
]);

const FIELD_TO_COL = {
  repName: 'rep_name',
  customerName: 'customer_name',
  score: 'score',
  behaviorsHit: 'behaviors_hit',
  behaviorsTotal: 'behaviors_total',
  notes: 'notes',
  breakdown: 'breakdown',
  hitBehaviors: 'hit_behaviors',
  missedBehaviors: 'missed_behaviors',
};

const NUMERIC_COLS = new Set(['score', 'behaviors_hit', 'behaviors_total']);
const JSONB_COLS = new Set(['breakdown', 'hit_behaviors', 'missed_behaviors']);

export default async function handler(req, res) {
  try {
    await ensureSchema();

    const { id } = req.query || {};
    if (!id) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }

    if (req.method === 'PATCH') {
      if (!isAdmin(req)) {
        res.status(401).json({ error: 'Admin password required' });
        return;
      }
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const updates = Object.entries(body).filter(([k]) => EDITABLE_FIELDS.has(k));
      if (!updates.length) {
        res.status(400).json({ error: 'No editable fields supplied' });
        return;
      }

      for (const [key, value] of updates) {
        const col = FIELD_TO_COL[key];
        if (NUMERIC_COLS.has(col)) {
          await query(
            `UPDATE entries SET ${col} = $1, updated_at = NOW() WHERE id = $2`,
            [Number(value) || 0, id]
          );
        } else if (JSONB_COLS.has(col)) {
          await query(
            `UPDATE entries SET ${col} = $1::jsonb, updated_at = NOW() WHERE id = $2`,
            [JSON.stringify(value || []), id]
          );
        } else {
          await query(
            `UPDATE entries SET ${col} = $1, updated_at = NOW() WHERE id = $2`,
            [value == null ? '' : String(value), id]
          );
        }
      }

      const fetched = await query('SELECT * FROM entries WHERE id = $1', [id]);
      if (!fetched.rows.length) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json({ entry: rowToEntry(fetched.rows[0]) });
      return;
    }

    if (req.method === 'DELETE') {
      if (!isAdmin(req)) {
        res.status(401).json({ error: 'Admin password required' });
        return;
      }
      await query('DELETE FROM entries WHERE id = $1', [id]);
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'PATCH, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('entry [id] handler error', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
}
