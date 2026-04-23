const express = require('express');
const router = express.Router();
const { queryOne, queryAll } = require('../database');

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { name, password, role } = req.body;
    if (!name || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, password, and role are required.' });
    }
    const user = queryOne('SELECT id,name,role,password FROM users WHERE name=? AND role=?', [name, role]);
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });
    if (user.password !== password) return res.status(401).json({ success: false, message: 'Invalid password.' });
    res.json({ success: true, message: 'Login successful', user: { id: user.id, name: user.name, role: user.role } });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/auth/users
router.get('/users', (req, res) => {
  try {
    const users = queryAll("SELECT id,name FROM users WHERE role='user' ORDER BY name");
    res.json({ success: true, users });
  } catch(err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
