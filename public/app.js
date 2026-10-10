/* ── State ──────────────────────────────────────────────────────────────────── */
const state = {
  papers: [],
  history: [],
  currentPaper: null,
  session: null,   // active test session
};

/* ── Navigation ─────────────────────────────────────────────────────────────── */
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  const navEl = document.getElementById(`nav-${page}`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const page = link.dataset.page;
    navigate(page);
    if (page === 'dashboard') loadDashboard();
    if (page === 'tests') loadTests();
    if (page === 'history') loadHistory();
  });
});

/* ── API Helpers ─────────────────────────────────────────────────────────────── */
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json();
}

/* ── Dashboard ───────────────────────────────────────────────────────────────── */
async function loadDashboard() {
  const [papers, history] = await Promise.all([
    api('/api/papers'),
    api('/api/history'),
  ]);
  state.papers = papers;
  state.history = history;

  // Stats
  const totalAttempts = history.length;
  const avgScore = totalAttempts
    ? Math.round(history.reduce((s, a) => s + (a.score_pct || 0), 0) / totalAttempts)
    : 0;
  const bestScore = totalAttempts ? Math.max(...history.map(a => a.score_pct || 0)) : 0;

  document.getElementById('dashboard-stats').innerHTML = `
    <div class="stat-card"><div class="stat-val">${papers.length}</div><div class="stat-label">Papers Available</div></div>
    <div class="stat-card"><div class="stat-val">${totalAttempts}</div><div class="stat-label">Total Attempts</div></div>
    <div class="stat-card"><div class="stat-val">${avgScore}%</div><div class="stat-label">Average Score</div></div>
    <div class="stat-card"><div class="stat-val">${bestScore.toFixed(1)}%</div><div class="stat-label">Best Score</div></div>
  `;

  // Papers grid
  document.getElementById('dashboard-papers').innerHTML = papers.length
    ? papers.map(p => paperCardHTML(p)).join('')
    : '<div class="empty-state">No papers found in data/ folder.</div>';

  // Recent
  const recent = history.slice(0, 5);
  document.getElementById('dashboard-recent').innerHTML = recent.length
    ? recent.map(a => recentItemHTML(a, papers)).join('')
    : '<div class="empty-state" style="font-size:13px">No attempts yet.</div>';

  attachPaperCardListeners();
  attachRecentListeners();
}

function paperCardHTML(p) {
  const tags = [
    p.ak ? '<span class="tag tag-green">✓ Answer Key</span>' : '<span class="tag tag-yellow">No Answer Key</span>',
    p.exs ? '<span class="tag tag-blue">Solutions</span>' : '',
  ].filter(Boolean).join('');
  return `
    <div class="paper-card" data-paper-id="${p.id}">
      <h3>${p.label}</h3>
      <div class="paper-meta">${tags}</div>
    </div>`;
}

function recentItemHTML(a, papers) {
  const p = papers.find(p => p.id === a.paper_id);
  const label = p ? p.label : a.paper_id;
  const modeTag = a.mode === 'mock' ? 'Mock Test' : 'Practice';
  const scoreClass = scoreColor(a.score_pct);
  return `
    <div class="recent-item" data-attempt-id="${a.id}">
      <div class="ri-top">
        <span class="ri-title">${label}</span>
        <span class="ri-score">${(a.score_pct || 0).toFixed(1)}%</span>
      </div>
      <div class="ri-meta">${modeTag} · ${a.correct}/${a.total_questions} correct · ${formatDate(a.finished_at)}</div>
    </div>`;
}

function attachPaperCardListeners() {
  document.querySelectorAll('.paper-card').forEach(card => {
    card.addEventListener('click', () => openPaper(card.dataset.paperId));
  });
}

function attachRecentListeners() {
  document.querySelectorAll('.recent-item').forEach(item => {
    item.addEventListener('click', () => openAttemptResults(item.dataset.attemptId));
  });
}

/* ── Tests Page ──────────────────────────────────────────────────────────────── */
async function loadTests() {
  if (!state.papers.length) state.papers = await api('/api/papers');
  document.getElementById('tests-list').innerHTML = state.papers.length
    ? state.papers.map(p => paperCardHTML(p)).join('')
    : '<div class="empty-state">No papers found in data/ folder.</div>';
  attachPaperCardListeners();
}

/* ── History Page ────────────────────────────────────────────────────────────── */
async function loadHistory() {
  state.history = await api('/api/history');
  const el = document.getElementById('history-list');
  if (!state.history.length) {
    el.innerHTML = '<div class="history-empty">No attempts yet. Start a practice or mock test!</div>';
    return;
  }
  el.innerHTML = `
    <table class="history-full-table">
      <thead>
        <tr>
          <th>Paper</th>
          <th>Mode</th>
          <th>Score</th>
          <th>Correct</th>
          <th>Incorrect</th>
          <th>Unanswered</th>
          <th>Date</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${state.history.map(a => historyRowHTML(a)).join('')}
      </tbody>
    </table>`;
  document.querySelectorAll('.history-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.del-btn')) return;
      openAttemptResults(row.dataset.attemptId);
    });
  });
  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this attempt?')) return;
      await api(`/api/attempts/${btn.dataset.id}`, { method: 'DELETE' });
      loadHistory();
    });
  });
}

function historyRowHTML(a) {
  const p = state.papers.find(p => p.id === a.paper_id);
  const label = p ? p.label : a.paper_id;
  const unanswered = (a.total_questions || 0) - (a.answered || 0);
  const sc = scoreColor(a.score_pct);
  return `
    <tr class="history-row" data-attempt-id="${a.id}">
      <td>${label}</td>
      <td><span class="tag ${a.mode === 'mock' ? 'tag-blue' : 'tag-green'}">${a.mode === 'mock' ? 'Mock' : 'Practice'}</span></td>
      <td><span class="score-chip ${sc}">${(a.score_pct || 0).toFixed(1)}%</span></td>
      <td style="color:var(--green)">${a.correct || 0}</td>
      <td style="color:var(--red)">${a.incorrect || 0}</td>
      <td style="color:var(--text2)">${unanswered}</td>
      <td style="color:var(--text2)">${formatDate(a.finished_at)}</td>
      <td><button class="btn btn-sm btn-secondary del-btn" data-id="${a.id}">Delete</button></td>
    </tr>`;
}

/* ── Paper Detail ────────────────────────────────────────────────────────────── */
async function openPaper(paperId) {
  if (!state.papers.length) state.papers = await api('/api/papers');
  const paper = state.papers.find(p => p.id === paperId);
  if (!paper) return;
  state.currentPaper = paper;

  // Fetch paper-specific history
  const allHistory = await api('/api/history');
  const paperHistory = allHistory.filter(a => a.paper_id === paperId);

  const el = document.getElementById('paper-detail-content');
  el.innerHTML = `
    <div class="paper-detail-header">
      <div>
        <h2>${paper.label}</h2>
        <div style="display:flex;gap:8px;margin-top:8px">
          ${paper.ak ? '<span class="tag tag-green">✓ Answer Key</span>' : '<span class="tag tag-yellow">No Answer Key</span>'}
          ${paper.exs ? '<span class="tag tag-blue">Solutions PDF</span>' : ''}
          ${paper.qp ? '<span class="tag tag-gray">Question Paper</span>' : ''}
        </div>
      </div>
      <div class="paper-detail-actions">
        <button class="btn btn-secondary" id="btn-edit-ak">✏️ Edit Answer Key</button>
        <button class="btn btn-outline" id="btn-practice" ${!paper.ak ? 'disabled title="Add answer key first"' : ''}>Practice Mode</button>
        <button class="btn btn-primary" id="btn-mock">Mock Test</button>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="ic-label">Attempts</div>
        <div class="ic-val">${paperHistory.length}</div>
      </div>
      <div class="info-card">
        <div class="ic-label">Best Score</div>
        <div class="ic-val">${paperHistory.length ? Math.max(...paperHistory.map(a => a.score_pct || 0)).toFixed(1) + '%' : '—'}</div>
      </div>
      <div class="info-card">
        <div class="ic-label">Last Attempted</div>
        <div class="ic-val">${paperHistory.length ? formatDate(paperHistory[0].finished_at || paperHistory[0].started_at) : '—'}</div>
      </div>
    </div>

    ${paperHistory.length ? `
    <div class="paper-history-title">Attempt History</div>
    <table class="history-table">
      <thead><tr><th>Mode</th><th>Score</th><th>Correct</th><th>Incorrect</th><th>Date</th></tr></thead>
      <tbody>
        ${paperHistory.map(a => `
          <tr style="cursor:pointer" onclick="openAttemptResults(${a.id})">
            <td><span class="tag ${a.mode==='mock'?'tag-blue':'tag-green'}">${a.mode==='mock'?'Mock':'Practice'}</span></td>
            <td><span class="score-chip ${scoreColor(a.score_pct)}">${(a.score_pct||0).toFixed(1)}%</span></td>
            <td style="color:var(--green)">${a.correct||0}</td>
            <td style="color:var(--red)">${a.incorrect||0}</td>
            <td style="color:var(--text2)">${formatDate(a.finished_at)}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : ''}
  `;

  document.getElementById('btn-edit-ak').addEventListener('click', () => openAnswerKeyEditor(paper));
  document.getElementById('btn-practice').addEventListener('click', () => startSession(paper, 'practice'));
  document.getElementById('btn-mock').addEventListener('click', () => openMockConfig(paper));

  navigate('paper');
}

/* ── Answer Key Editor ───────────────────────────────────────────────────────── */
async function openAnswerKeyEditor(paper) {
  state.currentPaper = paper;
  document.getElementById('ak-subtitle').textContent = paper.label;
  document.getElementById('ak-status').textContent = '';

  // Load existing key
  const existing = await api(`/api/papers/${paper.id}/answers`);
  const lines = Object.entries(existing)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([n, ans]) => `${n}. ${ans}`)
    .join('\n');
  document.getElementById('ak-textarea').value = lines;

  document.getElementById('ak-back-btn').onclick = () => openPaper(paper.id);
  document.getElementById('ak-save-btn').onclick = async () => {
    const text = document.getElementById('ak-textarea').value;
    await api(`/api/papers/${paper.id}/answers`, { method: 'POST', body: { text } });
    document.getElementById('ak-status').textContent = '✓ Saved!';
    setTimeout(() => document.getElementById('ak-status').textContent = '', 2000);
    // Refresh paper list so tag updates
    state.papers = await api('/api/papers');
  };

  navigate('answer-key');
}

/* ── Mock Config Dialog ──────────────────────────────────────────────────────── */
function openMockConfig(paper) {
  const questions = prompt('Number of questions in this paper?', '80');
  if (questions === null) return;
  const mins = prompt('Timer duration (minutes)?', '120');
  if (mins === null) return;
  startSession(paper, 'mock', parseInt(questions) || 80, parseInt(mins) || 120);
}

/* ── Session ─────────────────────────────────────────────────────────────────── */
async function startSession(paper, mode, numQuestions, timerMins) {
  const answers = paper.ak ? await api(`/api/papers/${paper.id}/answers`) : {};
  const totalQ = numQuestions || Object.keys(answers).length || 80;

  const attempt = await api('/api/attempts', {
    method: 'POST',
    body: { paper_id: paper.id, mode, total_questions: totalQ },
  });

  const session = {
    paper,
    mode,
    attemptId: attempt.attempt_id,
    answers,           // correct answers map
    userAnswers: {},   // qNo -> selected
    feedback: {},      // qNo -> 'correct'|'incorrect' (practice only)
    totalQ,
    timerMins: timerMins || 120,
    timerStarted: Date.now(),
    timerInterval: null,
    startedAt: Date.now(),
  };
  state.session = session;

  renderSession();
  navigate('session');

  if (mode === 'mock') {
    startTimer(session);
  }
}

function renderSession() {
  const { session } = state;
  const { paper, mode, totalQ, answers, userAnswers, feedback, timerMins } = session;

  const isPractice = mode === 'practice';

  document.getElementById('session-container').innerHTML = `
    <div class="session-pdf">
      <iframe src="/data/${paper.qp}" title="Question Paper"></iframe>
    </div>
    <div class="session-panel">
      <div class="session-header">
        <div class="sh-top">
          <div>
            <div class="session-title">${paper.label}</div>
            <div class="session-mode">${isPractice ? 'Practice Mode' : 'Mock Test'}</div>
          </div>
          ${mode === 'mock' ? `<div class="timer-display" id="timer-display">${formatTime(timerMins * 60)}</div>` : ''}
        </div>
        <div class="session-progress">
          <div class="progress-bar-wrap"><div class="progress-bar-fill" id="progress-fill" style="width:0%"></div></div>
          <span class="progress-text" id="progress-text">0 / ${totalQ}</span>
        </div>
      </div>

      ${isPractice ? `
      <div class="session-score">
        <div class="score-item"><div class="si-val" id="score-correct" style="color:var(--green)">0</div><div class="si-label">Correct</div></div>
        <div class="score-item"><div class="si-val" id="score-incorrect" style="color:var(--red)">0</div><div class="si-label">Incorrect</div></div>
        <div class="score-item"><div class="si-val" id="score-pct" style="color:var(--accent)">0%</div><div class="si-label">Score</div></div>
      </div>` : ''}

      <div class="q-count-wrap">
        <span class="q-count-label">Questions:</span>
        <input type="number" id="q-count-input" class="q-count-input" value="${totalQ}" min="1" max="200" />
        <button class="btn btn-secondary btn-sm q-count-apply" id="q-count-apply">Apply</button>
      </div>

      <div class="q-nav-wrap">
        <div class="q-nav-title">Navigate</div>
        <div class="q-nav-grid" id="q-nav-grid"></div>
      </div>

      <div class="question-scroller" id="question-scroller">
        <!-- questions rendered here -->
      </div>

      <div class="session-footer">
        ${isPractice
          ? `<button class="btn btn-secondary" onclick="endPractice()">End Practice</button>`
          : `<button class="btn btn-red" onclick="submitMock()">Submit Test</button>`
        }
      </div>
    </div>
  `;

  document.getElementById('q-count-apply').addEventListener('click', () => {
    const val = parseInt(document.getElementById('q-count-input').value);
    if (val > 0) {
      session.totalQ = val;
      renderQuestions();
      renderNav();
    }
  });

  renderQuestions();
  renderNav();
  updateProgress();
}

function renderQuestions() {
  const { session } = state;
  const { totalQ, userAnswers, feedback, answers, mode } = session;
  const isPractice = mode === 'practice';
  const scroller = document.getElementById('question-scroller');
  if (!scroller) return;

  let html = '';
  for (let q = 1; q <= totalQ; q++) {
    const selected = userAnswers[q];
    const fb = feedback[q];
    let blockClass = 'q-block';
    if (fb === 'correct') blockClass += ' q-correct';
    else if (fb === 'incorrect') blockClass += ' q-incorrect';
    else if (selected) blockClass += ' q-answered';

    const opts = ['A', 'B', 'C', 'D'].map(opt => {
      let cls = 'q-option';
      if (selected === opt) {
        cls += ' selected';
        if (isPractice && fb) {
          cls += fb === 'correct' ? ' opt-correct' : ' opt-incorrect';
        }
      }
      if (isPractice && fb && answers[q] === opt && selected !== opt) {
        cls += ' opt-correct';
      }
      const disabled = (isPractice && fb) ? 'disabled' : '';
      return `<button class="${cls}" data-q="${q}" data-opt="${opt}" ${disabled}>${opt}</button>`;
    }).join('');

    let feedbackHTML = '';
    if (isPractice && fb) {
      feedbackHTML = `
        <div class="q-feedback ${fb === 'correct' ? 'feedback-correct' : 'feedback-incorrect'}">
          ${fb === 'correct' ? '✓ Correct!' : `✗ Wrong — Correct: <strong>${answers[q] || '?'}</strong>`}
          ${session.paper.exs ? `<button class="btn btn-secondary btn-sm" onclick="openSolution('${session.paper.exs}', ${q})">View Solution</button>` : ''}
        </div>`;
    }

    let actionsHTML = '';
    if (isPractice && !fb && selected) {
      actionsHTML = `<div class="q-actions"><button class="btn btn-primary btn-sm" data-submit-q="${q}">Submit</button></div>`;
    }

    html += `
      <div class="${blockClass}" id="qblock-${q}">
        <div class="q-number">Question ${q}</div>
        <div class="q-options">${opts}</div>
        ${actionsHTML}
        ${feedbackHTML}
      </div>`;
  }

  scroller.innerHTML = html;

  // Attach option listeners
  scroller.querySelectorAll('.q-option').forEach(btn => {
    btn.addEventListener('click', () => selectOption(btn.dataset.q, btn.dataset.opt));
  });

  // Attach submit listeners (practice)
  scroller.querySelectorAll('[data-submit-q]').forEach(btn => {
    btn.addEventListener('click', () => submitPracticeAnswer(parseInt(btn.dataset.submitQ)));
  });
}

function renderNav() {
  const { session } = state;
  const { totalQ, userAnswers, feedback, mode } = session;
  const el = document.getElementById('q-nav-grid');
  if (!el) return;
  let html = '';
  for (let q = 1; q <= totalQ; q++) {
    const sel = userAnswers[q];
    const fb = feedback[q];
    let cls = 'q-nav-btn';
    if (mode === 'practice') {
      if (fb === 'correct') cls += ' qn-correct';
      else if (fb === 'incorrect') cls += ' qn-incorrect';
      else if (sel) cls += ' qn-answered';
    } else {
      if (sel) cls += ' qn-answered';
    }
    html += `<button class="${cls}" onclick="scrollToQ(${q})">${q}</button>`;
  }
  el.innerHTML = html;
}

function scrollToQ(q) {
  const el = document.getElementById(`qblock-${q}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectOption(qNo, opt) {
  const q = parseInt(qNo);
  if (state.session.feedback[q]) return; // already submitted in practice
  state.session.userAnswers[q] = opt;
  updateProgress();
  // Re-render just this question block
  reRenderQuestion(q);
  renderNav();
}

function reRenderQuestion(q) {
  const { session } = state;
  const { userAnswers, feedback, answers, mode, paper } = session;
  const isPractice = mode === 'practice';
  const selected = userAnswers[q];
  const fb = feedback[q];

  let blockClass = 'q-block';
  if (fb === 'correct') blockClass += ' q-correct';
  else if (fb === 'incorrect') blockClass += ' q-incorrect';
  else if (selected) blockClass += ' q-answered';

  const opts = ['A', 'B', 'C', 'D'].map(opt => {
    let cls = 'q-option';
    if (selected === opt) {
      cls += ' selected';
      if (isPractice && fb) cls += fb === 'correct' ? ' opt-correct' : ' opt-incorrect';
    }
    if (isPractice && fb && answers[q] === opt && selected !== opt) cls += ' opt-correct';
    const disabled = (isPractice && fb) ? 'disabled' : '';
    return `<button class="${cls}" data-q="${q}" data-opt="${opt}" ${disabled}>${opt}</button>`;
  }).join('');

  let feedbackHTML = '';
  if (isPractice && fb) {
    feedbackHTML = `
      <div class="q-feedback ${fb === 'correct' ? 'feedback-correct' : 'feedback-incorrect'}">
        ${fb === 'correct' ? '✓ Correct!' : `✗ Wrong — Correct: <strong>${answers[q] || '?'}</strong>`}
        ${paper.exs ? `<button class="btn btn-secondary btn-sm" onclick="openSolution('${paper.exs}', ${q})">View Solution</button>` : ''}
      </div>`;
  }

  let actionsHTML = '';
  if (isPractice && !fb && selected) {
    actionsHTML = `<div class="q-actions"><button class="btn btn-primary btn-sm" data-submit-q="${q}">Submit</button></div>`;
  }

  const block = document.getElementById(`qblock-${q}`);
  if (!block) return;
  block.className = blockClass;
  block.innerHTML = `
    <div class="q-number">Question ${q}</div>
    <div class="q-options">${opts}</div>
    ${actionsHTML}
    ${feedbackHTML}
  `;
  block.querySelectorAll('.q-option').forEach(btn => {
    btn.addEventListener('click', () => selectOption(btn.dataset.q, btn.dataset.opt));
  });
  const submitBtn = block.querySelector('[data-submit-q]');
  if (submitBtn) submitBtn.addEventListener('click', () => submitPracticeAnswer(q));
}

async function submitPracticeAnswer(q) {
  const { session } = state;
  const selected = session.userAnswers[q];
  if (!selected) return;
  const correct_answer = session.answers[q];

  const result = await api(`/api/attempts/${session.attemptId}/answer`, {
    method: 'POST',
    body: { question_no: q, selected, correct_answer: correct_answer || null },
  });

  if (correct_answer) {
    session.feedback[q] = result.is_correct ? 'correct' : 'incorrect';
  } else {
    session.feedback[q] = 'unknown';
  }

  reRenderQuestion(q);
  renderNav();
  updatePracticeScore();
}

function updatePracticeScore() {
  const { session } = state;
  const correct = Object.values(session.feedback).filter(f => f === 'correct').length;
  const incorrect = Object.values(session.feedback).filter(f => f === 'incorrect').length;
  const total = session.totalQ;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const cEl = document.getElementById('score-correct');
  const iEl = document.getElementById('score-incorrect');
  const pEl = document.getElementById('score-pct');
  if (cEl) cEl.textContent = correct;
  if (iEl) iEl.textContent = incorrect;
  if (pEl) pEl.textContent = `${pct}%`;
}

function updateProgress() {
  const { session } = state;
  const answered = Object.keys(session.userAnswers).length;
  const pct = session.totalQ > 0 ? (answered / session.totalQ) * 100 : 0;
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  if (fill) fill.style.width = `${pct}%`;
  if (text) text.textContent = `${answered} / ${session.totalQ}`;
}

/* ── Timer ───────────────────────────────────────────────────────────────────── */
function startTimer(session) {
  const totalSecs = session.timerMins * 60;
  session.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - session.timerStarted) / 1000);
    const remaining = Math.max(0, totalSecs - elapsed);
    const el = document.getElementById('timer-display');
    if (el) {
      el.textContent = formatTime(remaining);
      if (remaining <= 300) el.classList.add('urgent');
    }
    if (remaining === 0) {
      clearInterval(session.timerInterval);
      submitMock(true);
    }
  }, 1000);
}

function formatTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* ── End Session ─────────────────────────────────────────────────────────────── */
async function endPractice() {
  const { session } = state;
  const duration = Math.floor((Date.now() - session.startedAt) / 1000);
  await api(`/api/attempts/${session.attemptId}/finish`, {
    method: 'POST',
    body: { duration_seconds: duration },
  });
  openAttemptResults(session.attemptId);
}

async function submitMock(auto = false) {
  const { session } = state;
  if (!auto && !confirm('Submit the test? You cannot change answers after submitting.')) return;

  if (session.timerInterval) clearInterval(session.timerInterval);

  const duration = Math.floor((Date.now() - session.startedAt) / 1000);
  const totalQ = session.totalQ;
  const answersPayload = [];
  for (let q = 1; q <= totalQ; q++) {
    answersPayload.push({
      question_no: q,
      selected: session.userAnswers[q] || null,
      correct_answer: session.answers[q] || null,
    });
  }

  const result = await api(`/api/attempts/${session.attemptId}/finish`, {
    method: 'POST',
    body: { answers_payload: answersPayload, duration_seconds: duration },
  });

  openAttemptResults(session.attemptId);
}

/* ── Results ─────────────────────────────────────────────────────────────────── */
async function openAttemptResults(attemptId) {
  if (!state.papers.length) state.papers = await api('/api/papers');
  const data = await api(`/api/attempts/${attemptId}`);
  const paper = state.papers.find(p => p.id === data.paper_id);
  const label = paper ? paper.label : data.paper_id;
  const unanswered = (data.total_questions || 0) - (data.answered || 0);
  const scoreClass = scoreColor(data.score_pct);

  const breakdownHTML = data.answers.map(a => {
    let cls = 'rb-item';
    let statusText = '';
    if (!a.selected) {
      cls += ' rb-unanswered';
      statusText = '<span style="color:var(--text2)">—</span>';
    } else if (a.is_correct === 1) {
      cls += ' rb-correct';
      statusText = `<span class="rb-ans rb-correct-ans">${a.selected}</span>`;
    } else {
      cls += ' rb-incorrect';
      statusText = `<span class="rb-ans rb-wrong-ans">${a.selected}</span>`;
    }
    const correctAns = a.correct_answer
      ? `<span class="rb-ans rb-correct-ans">${a.correct_answer}</span>`
      : '<span style="color:var(--text2)">?</span>';

    const solBtn = paper?.exs
      ? `<button class="btn btn-secondary btn-sm" onclick="openSolution('${paper.exs}', ${a.question_no})">Solution</button>`
      : '';

    return `
      <div class="${cls}">
        <span class="rb-qno">Q${a.question_no}</span>
        <span></span>
        ${statusText}
        ${correctAns}
        ${solBtn}
      </div>`;
  }).join('');

  document.getElementById('results-container').innerHTML = `
    <div class="results-wrap">
      <div class="results-header">
        <p style="color:var(--text2);margin-bottom:8px">${label}</p>
        <div class="big-score">${(data.score_pct || 0).toFixed(1)}%</div>
        <p>${data.mode === 'mock' ? 'Mock Test' : 'Practice Session'} · ${formatDate(data.finished_at)}</p>
      </div>
      <div class="results-stats">
        <div class="rs-card"><div class="rs-val" style="color:var(--text)">${data.total_questions || 0}</div><div class="rs-label">Total</div></div>
        <div class="rs-card"><div class="rs-val" style="color:var(--green)">${data.correct || 0}</div><div class="rs-label">Correct</div></div>
        <div class="rs-card"><div class="rs-val" style="color:var(--red)">${data.incorrect || 0}</div><div class="rs-label">Incorrect</div></div>
        <div class="rs-card"><div class="rs-val" style="color:var(--text2)">${unanswered}</div><div class="rs-label">Unanswered</div></div>
      </div>

      ${data.answers.length ? `
      <div class="results-breakdown">
        <h3>Answer Breakdown</h3>
        <div style="display:grid;grid-template-columns:40px 1fr 80px 80px 80px;gap:12px;padding:8px 14px;font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.05em;font-weight:600">
          <span>Q#</span><span></span><span style="text-align:center">Your Ans</span><span style="text-align:center">Correct</span><span></span>
        </div>
        <div class="rb-list">${breakdownHTML}</div>
      </div>` : ''}

      <div class="results-actions">
        <button class="btn btn-secondary" onclick="navigate('history');loadHistory()">← History</button>
        ${paper ? `<button class="btn btn-outline" onclick="openPaper('${paper.id}')">Back to Paper</button>` : ''}
        ${paper ? `<button class="btn btn-primary" onclick="startSession(state.papers.find(p=>p.id==='${paper?.id}'),'practice')">Practice Again</button>` : ''}
      </div>
    </div>
  `;

  navigate('results');
}

/* ── PDF Solution Modal ──────────────────────────────────────────────────────── */
function openSolution(exsFile, qNo) {
  document.getElementById('modal-title').textContent = `Solution – Q${qNo}`;
  document.getElementById('modal-iframe').src = `/data/${exsFile}`;
  document.getElementById('pdf-modal').classList.remove('hidden');
}

function closePdfModal() {
  document.getElementById('pdf-modal').classList.add('hidden');
  document.getElementById('modal-iframe').src = '';
}

/* ── Utility ─────────────────────────────────────────────────────────────────── */
function scoreColor(pct) {
  if (!pct) return 'score-low';
  if (pct >= 70) return 'score-high';
  if (pct >= 50) return 'score-mid';
  return 'score-low';
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/* ── Boot ────────────────────────────────────────────────────────────────────── */
loadDashboard();
