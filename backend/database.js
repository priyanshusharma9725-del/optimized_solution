// database.js - SQLite via sql.js (pure JS, no native build needed)
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'diary.db');
let db = null;

function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  createTables();
  seedUsers();
  saveDb();
  console.log('✅ Database ready at', DB_PATH);
  return db;
}

function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    project_name TEXT NOT NULL,
    task_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    hours_assigned REAL DEFAULT 0,
    hours_spent REAL DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    remarks TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
}

function seedUsers() {
  const r = db.exec("SELECT id FROM users WHERE role='admin' LIMIT 1");
  if (!r.length || !r[0].values.length) {
    const users = [
      ['Admin','admin','admin123'],
      ['Keyur Makadia','user','keyur123'],
      ['Rahul Sharma','user','rahul123'],
      ['Priya Patel','user','priya123'],
      ['Amit Shah','user','amit123'],
      ['Neha Joshi','user','neha123'],
    ];
    for (const [name,role,pass] of users) {
      db.run('INSERT INTO users (name,role,password) VALUES (?,?,?)',[name,role,pass]);
    }
    saveDb();
    console.log('✅ Default users seeded');
  }
}

function queryAll(sql, params=[]) {
  try {
    const res = db.exec(sql, params);
    if (!res.length) return [];
    const {columns, values} = res[0];
    return values.map(row => {
      const obj={};
      columns.forEach((c,i)=>{ obj[c]=row[i]; });
      return obj;
    });
  } catch(e) { console.error('queryAll error:',e.message); return []; }
}

function queryOne(sql, params=[]) {
  return queryAll(sql, params)[0] || null;
}

function run(sql, params=[]) {
  db.run(sql, params);
  const res = db.exec('SELECT last_insert_rowid() as id');
  const lastId = res[0]?.values[0]?.[0] || null;
  saveDb();
  return lastId;
}

module.exports = { initDb, queryAll, queryOne, run, saveDb };
