const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run } = require('../database');

function isWithin5Days(createdAt) {
  if (!createdAt) return false;
  const created = new Date(createdAt.replace(' ', 'T') + 'Z');
  const diff = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= 5;
}

function applySmartHourLogic(user_id, date, newEntryId) {
  const all = queryAll('SELECT id,hours_assigned,hours_spent FROM entries WHERE user_id=? AND date=? ORDER BY created_at ASC', [user_id, date]);
  const newEntry = all.find(e => e.id === newEntryId);
  if (!newEntry) return;
  const newSpent = parseFloat(newEntry.hours_spent) || 0;
  const others = all.filter(e => e.id !== newEntryId);
  let remaining = newSpent;
  for (const other of others) {
    const assigned = parseFloat(other.hours_assigned) || 0;
    if (remaining >= assigned) {
      run('UPDATE entries SET hours_spent=0 WHERE id=?', [other.id]);
      remaining -= assigned;
    }
  }
}

// POST /api/entries
router.post('/', (req, res) => {
  try {
    const { user_id, date, project_name, task_name, description, hours_assigned, hours_spent, status, remarks } = req.body;
    if (!user_id || !date || !project_name || !task_name) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    const newId = run(
      'INSERT INTO entries (user_id,date,project_name,task_name,description,hours_assigned,hours_spent,status,remarks) VALUES (?,?,?,?,?,?,?,?,?)',
      [user_id, date, project_name, task_name, description||'', parseFloat(hours_assigned)||0, parseFloat(hours_spent)||0, status||'Pending', remarks||'']
    );
    applySmartHourLogic(user_id, date, newId);
    const entry = queryOne('SELECT * FROM entries WHERE id=?', [newId]);
    res.status(201).json({ success: true, message: 'Entry added.', entry });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/entries/user/:userId
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const entries = queryAll(`
      SELECT e.*,u.name as employee_name FROM entries e
      JOIN users u ON e.user_id=u.id
      WHERE e.user_id=? ORDER BY e.date DESC,e.created_at DESC
    `, [userId]);
    const visible = entries.filter(e => isWithin5Days(e.created_at));
    res.json({ success: true, entries: visible });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/entries/admin
router.get('/admin', (req, res) => {
  try {
    const { date, employee_name } = req.query;
    let sql = `SELECT e.*,u.name as employee_name FROM entries e JOIN users u ON e.user_id=u.id WHERE 1=1`;
    const params = [];
    if (date) { sql += ' AND e.date=?'; params.push(date); }
    if (employee_name) { sql += ' AND u.name LIKE ?'; params.push(`%${employee_name}%`); }
    sql += ' ORDER BY e.date DESC,e.created_at DESC';
    const entries = queryAll(sql, params);
    res.json({ success: true, entries });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/entries/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, hours_spent, status, remarks } = req.body;
    const entry = queryOne('SELECT * FROM entries WHERE id=?', [id]);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found.' });
    if (entry.user_id !== parseInt(user_id)) return res.status(403).json({ success: false, message: 'Not authorized.' });
    if (!isWithin5Days(entry.created_at)) return res.status(403).json({ success: false, message: 'Edit window expired (5 days).' });
    run('UPDATE entries SET hours_spent=?,status=?,remarks=? WHERE id=?',
      [parseFloat(hours_spent)||0, status||entry.status, remarks!==undefined?remarks:entry.remarks, id]);
    applySmartHourLogic(entry.user_id, entry.date, parseInt(id));
    const updated = queryOne('SELECT * FROM entries WHERE id=?', [id]);
    res.json({ success: true, message: 'Entry updated.', entry: updated });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /api/entries/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    const entry = queryOne('SELECT * FROM entries WHERE id=?', [id]);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found.' });
    if (entry.user_id !== parseInt(user_id)) return res.status(403).json({ success: false, message: 'Not authorized.' });
    if (!isWithin5Days(entry.created_at)) return res.status(403).json({ success: false, message: 'Delete window expired (5 days).' });
    run('DELETE FROM entries WHERE id=?', [id]);
    res.json({ success: true, message: 'Entry deleted.' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
