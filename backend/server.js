// server.js - Main Express Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin:'*', methods:['GET','POST','PUT','DELETE'], allowedHeaders:['Content-Type'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check
app.get('/api/health', (req, res) => res.json({ status:'ok', timestamp: new Date().toISOString() }));

// Initialize DB, then start server
initDb().then(() => {
  const authRoutes = require('./routes/auth');
  const entriesRoutes = require('./routes/entries');
  const exportRoutes = require('./routes/export');

  app.use('/api/auth', authRoutes);
  app.use('/api/entries', entriesRoutes);
  app.use('/api/export', exportRoutes);

  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend', 'index.html')));

  app.listen(PORT, () => {
    console.log(`\n🚀 Daily Work Diary running at http://localhost:${PORT}`);
    console.log(`\n👤 Login Credentials:`);
    console.log(`   Admin    → Name: Admin          | Password: admin123`);
    console.log(`   Employee → Name: Keyur Makadia   | Password: keyur123`);
    console.log(`   Employee → Name: Rahul Sharma    | Password: rahul123`);
    console.log(`   Employee → Name: Priya Patel     | Password: priya123`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
