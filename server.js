const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();
const DB_PATH = path.join(__dirname, 'data.db');
const fs = require('fs');

// Create / open DB and ensure table
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) { console.error('DB open error', err); process.exit(1); }
  console.log('Connected to SQLite DB.');
});
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    title TEXT,
    owner TEXT,
    startDate TEXT,
    endDate TEXT,
    status TEXT,
    priority TEXT,
    notes TEXT
  )`);
});

app.use(bodyParser.json({limit: '5mb'}));
app.use(express.static(path.join(__dirname, 'public')));

// API: list
app.get('/api/projects', (req, res) => {
  db.all('SELECT * FROM projects ORDER BY rowid DESC', [], (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

// API: create or update (upsert)
app.post('/api/projects', (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const stmt = db.prepare(`INSERT OR REPLACE INTO projects
    (id, projectId, title, owner, startDate, endDate, status, priority, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  db.serialize(() => {
    for (const p of items) {
      stmt.run(p.id || p.projectId || p.title || (Math.random().toString(36).slice(2,9)),
               p.projectId||'', p.title||'', p.owner||'', p.startDate||'', p.endDate||'', p.status||'', p.priority||'', p.notes||'');
    }
    stmt.finalize((err)=>{
      if (err) return res.status(500).json({error: err.message});
      res.json({ok: true});
    });
  });
});

// API: delete
app.delete('/api/projects/:id', (req, res) => {
  db.run('DELETE FROM projects WHERE id = ?', [req.params.id], function(err){
    if (err) return res.status(500).json({error: err.message});
    res.json({deleted: this.changes});
  });
});

// catch-all serve index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log('Server listening on', port));