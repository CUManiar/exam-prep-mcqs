const express = require('express');
const path = require('path');
const fs = require('fs');
const { Database } = require('node-sqlite3-wasm');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(__dirname, 'prelims.db');

// ── SQLite init ───────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.exec(`
  PRAGMA journal_mode=WAL;

  CREATE TABLE IF NOT EXISTS attempts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    paper_id        TEXT    NOT NULL,
    mode            TEXT    NOT NULL,
    started_at      TEXT    NOT NULL,
    finished_at     TEXT,
    duration_seconds INTEGER,
    total_questions INTEGER  DEFAULT 0,
    answered        INTEGER  DEFAULT 0,
    correct         INTEGER  DEFAULT 0,
    incorrect       INTEGER  DEFAULT 0,
    score_pct       REAL
  );

  CREATE TABLE IF NOT EXISTS answers (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id     INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_no    INTEGER NOT NULL,
    selected       TEXT,
    correct_answer TEXT,
    is_correct     INTEGER,
    UNIQUE(attempt_id, question_no)
  );
`);

// Prepared statements
const stmts = {
  insertAttempt: db.prepare(
    'INSERT INTO attempts (paper_id, mode, started_at, total_questions) VALUES (?,?,?,?)'
  ),
  getAttempt: db.prepare('SELECT * FROM attempts WHERE id=?'),
  updateAttempt: db.prepare(
    `UPDATE attempts
     SET finished_at=?, duration_seconds=?, answered=?, correct=?, incorrect=?, score_pct=?
     WHERE id=?`
  ),
  upsertAnswer: db.prepare(
    `INSERT INTO answers (attempt_id, question_no, selected, correct_answer, is_correct)
     VALUES (?,?,?,?,?)
     ON CONFLICT(attempt_id, question_no) DO UPDATE SET
       selected=excluded.selected,
       correct_answer=excluded.correct_answer,
       is_correct=excluded.is_correct`
  ),
  getAnswers: db.prepare('SELECT * FROM answers WHERE attempt_id=? ORDER BY question_no'),
  deleteAttempt: db.prepare('DELETE FROM attempts WHERE id=?'),
  deleteAnswers: db.prepare('DELETE FROM answers WHERE attempt_id=?'),
  history: db.prepare(
    'SELECT * FROM attempts WHERE finished_at IS NOT NULL ORDER BY finished_at DESC'
  ),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function discoverPapers() {
  const files = fs.readdirSync(DATA_DIR);
  const papers = {};

  for (const f of files) {
    const qpMatch  = f.match(/^qp_(.+)\.pdf$/);
    const akMatch  = f.match(/^ak_(.+)\.txt$/);
    const exsMatch = f.match(/^exs_(.+)\.pdf$/);

    if (qpMatch)  { const id = qpMatch[1];  if (!papers[id]) papers[id] = { id }; papers[id].qp  = f; papers[id].label = formatLabel(id); }
    if (akMatch)  { const id = akMatch[1];  if (!papers[id]) papers[id] = { id }; papers[id].ak  = f; }
    if (exsMatch) { const id = exsMatch[1]; if (!papers[id]) papers[id] = { id }; papers[id].exs = f; }
  }

  return Object.values(papers).filter(p => p.qp);
}

function formatLabel(id) {
  const parts = id.split('_');
  const year = parts[0];
  const rest = parts.slice(1).map(p => p.toUpperCase()).join(' ');
  return `${year} \u2013 ${rest}`;
}

function parseAnswerKey(filePath) {
  const answers = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.trim().match(/^(\d+)[.)]\s*([A-Da-d])/);
    if (m) answers[parseInt(m[1])] = m[2].toUpperCase();
  }
  return answers;
}

function computeStats(attempt_id) {
  const rows = stmts.getAnswers.all(attempt_id);
  const answered  = rows.filter(r => r.selected).length;
  const correct   = rows.filter(r => r.is_correct === 1).length;
  const incorrect = rows.filter(r => r.is_correct === 0).length;
  return { rows, answered, correct, incorrect };
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(DATA_DIR));

// ── Papers ────────────────────────────────────────────────────────────────────
app.get('/api/papers', (req, res) => res.json(discoverPapers()));

app.get('/api/papers/:id/answers', (req, res) => {
  const akPath = path.join(DATA_DIR, `ak_${req.params.id}.txt`);
  if (!fs.existsSync(akPath)) return res.json({});
  res.json(parseAnswerKey(akPath));
});

app.post('/api/papers/:id/answers', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });
  fs.writeFileSync(path.join(DATA_DIR, `ak_${req.params.id}.txt`), text, 'utf8');
  res.json({ ok: true });
});

// ── Attempts ──────────────────────────────────────────────────────────────────
app.post('/api/attempts', (req, res) => {
  const { paper_id, mode, total_questions } = req.body;
  const result = stmts.insertAttempt.run(paper_id, mode, new Date().toISOString(), total_questions || 0);
  res.json({ attempt_id: result.lastInsertRowid });
});

// Save / update a single answer (practice – live feedback)
app.post('/api/attempts/:id/answer', (req, res) => {
  const attempt_id = parseInt(req.params.id);
  const { question_no, selected, correct_answer } = req.body;
  const is_correct = selected && correct_answer ? (selected === correct_answer ? 1 : 0) : null;
  stmts.upsertAnswer.run(attempt_id, question_no, selected, correct_answer || null, is_correct);
  res.json({ ok: true, is_correct: is_correct === null ? null : !!is_correct });
});

// Finish attempt (mock: bulk-save all answers; practice: just compute stats)
app.post('/api/attempts/:id/finish', (req, res) => {
  const attempt_id = parseInt(req.params.id);
  const { answers_payload, duration_seconds } = req.body;

  if (answers_payload && Array.isArray(answers_payload)) {
    for (const a of answers_payload) {
      const is_correct = a.selected && a.correct_answer ? (a.selected === a.correct_answer ? 1 : 0) : null;
      stmts.upsertAnswer.run(attempt_id, a.question_no, a.selected || null, a.correct_answer || null, is_correct);
    }
  }

  const { rows, answered, correct, incorrect } = computeStats(attempt_id);
  const attempt = stmts.getAttempt.get(attempt_id);
  const total = attempt?.total_questions || rows.length;
  const score_pct = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

  stmts.updateAttempt.run(new Date().toISOString(), duration_seconds || null, answered, correct, incorrect, score_pct, attempt_id);
  res.json({ attempt_id, answered, correct, incorrect, total, score_pct, rows });
});

// Get a single attempt with all answers
app.get('/api/attempts/:id', (req, res) => {
  const attempt_id = parseInt(req.params.id);
  const attempt = stmts.getAttempt.get(attempt_id);
  if (!attempt) return res.status(404).json({ error: 'Not found' });
  const answers = stmts.getAnswers.all(attempt_id);
  // Convert sqlite integer booleans back to JS booleans for frontend
  res.json({ ...attempt, answers: answers.map(a => ({ ...a, is_correct: a.is_correct === null ? null : !!a.is_correct })) });
});

// All finished attempts
app.get('/api/history', (req, res) => res.json(stmts.history.all()));

// Delete an attempt (cascades to answers via FK)
app.delete('/api/attempts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  stmts.deleteAnswers.run(id);
  stmts.deleteAttempt.run(id);
  res.json({ ok: true });
});

// SPA fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎯 Prelims Practice → http://localhost:${PORT}`);
  console.log(`   On your network  → http://<your-ip>:${PORT}\n`);
});
