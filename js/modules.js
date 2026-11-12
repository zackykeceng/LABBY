/* MODULES.JS - Gamifikasi, Kuis, Misi, LKPD */
const Progress = {
  state: { badges: [], missions: {}, data: {}, quiz: {} },
  init() {
    const saved = localStorage.getItem('biolab_progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.state = Object.assign({ badges: [], missions: {}, data: {}, quiz: {} }, parsed);
      } catch (e) { console.warn('Progress corrupt, reset.'); }
    }
  },
  save() { localStorage.setItem('biolab_progress', JSON.stringify(this.state)); },

  completeMission(exp, id, silent = false) {
    if (!this.state.missions[exp]) this.state.missions[exp] = [];
    if (!this.state.missions[exp].includes(id)) {
      this.state.missions[exp].push(id);
      this.save();
      if (!silent) {
        const list = (exp === 'heart' ? HeartExperiment?.missions : LungsExperiment?.missions) || [];
        const m = list.find(x => x.id === id);
        if (m && typeof Utils !== 'undefined') Utils.toast(`Misi selesai! ${m.text}`, 'success');
      }
      this.checkBadges(exp);
      if (exp === 'heart' && typeof HeartExperiment !== 'undefined')
        renderMissions('missionHeart', 'heart', HeartExperiment.missions);
      if (exp === 'lungs' && typeof LungsExperiment !== 'undefined')
        renderMissions('missionLungs', 'lungs', LungsExperiment.missions);
      this.updateHeaderProgress();
      return true;
    }
    return false;
  },

  addData(exp, row) {
    if (!this.state.data[exp]) this.state.data[exp] = [];
    this.state.data[exp].push(row);
    if (this.state.data[exp].length > 20) this.state.data[exp].shift();
    this.save();
    if (exp === 'heart') renderLKPD('lkpdHeart', 'heart');
    if (exp === 'lungs') renderLKPD('lkpdLungs', 'lungs');
  },

  saveQuizAnswer(exp, qIndex, chosenIdx, correct) {
    if (!this.state.quiz[exp]) this.state.quiz[exp] = {};
    this.state.quiz[exp][qIndex] = { chosenIdx, correct };
    this.save();
  },

  isQuizComplete(exp) {
    const total = (QuizData[exp] || []).length;
    const answered = this.state.quiz[exp] || {};
    const correctCount = Object.values(answered).filter(a => a.correct).length;
    return { total, answered: Object.keys(answered).length, correct: correctCount, done: correctCount === total };
  },

  checkBadges(exp) {
    const missions = this.state.missions[exp] || [];
    const badgeId = exp === 'heart' ? 'ahli_jantung' : 'ahli_paru';
    const badgeName = exp === 'heart' ? 'Ahli Jantung' : 'Ahli Paru-paru';
    if (missions.length >= 3 && !this.state.badges.includes(badgeId)) {
      this.state.badges.push(badgeId);
      this.save();
      showBadgeNotification(`Lencana baru: ${badgeName}`);
      if (typeof Sound !== 'undefined') Sound.fanfare();
    }
  },

  updateHeaderProgress() {
    const el = document.getElementById('headerProgress');
    if (!el) return;
    const heartM = (this.state.missions.heart || []).length;
    const lungsM = (this.state.missions.lungs || []).length;
    const total = heartM + lungsM;
    const max = 6;
    const badgeCount = (this.state.badges || []).length;
    const pips = Array.from({ length: max }, (_, i) => `<i class="pip ${i < total ? 'on' : ''}"></i>`).join('');
    el.innerHTML = `
      <div class="progress-bar" role="img" aria-label="Misi selesai ${total} dari ${max}">${pips}</div>
      <span>Misi ${total}/${max}</span>
      ${badgeCount > 0 ? `<span class="badge-count" title="${badgeCount} lencana"><svg class="ico" aria-hidden="true"><use href="#i-medal"/></svg>${badgeCount}</span>` : ''}
    `;
    if (typeof updateHomeProgress === 'function') updateHomeProgress();
  }
};

function showBadgeNotification(text) {
  const div = document.createElement('div');
  div.className = 'badge-notification';
  div.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-medal"/></svg><span>${text}</span>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

function renderMissions(containerId, exp, missionList) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let html = `<div class="addon-card">
    <div class="addon-header">
      <h3 class="addon-title"><svg class="ico" aria-hidden="true"><use href="#i-flag"/></svg> Misi penyelidikan</h3>
    </div>
    <div class="mission-list">`;
  missionList.forEach(m => {
    const isDone = (Progress.state.missions[exp] || []).includes(m.id);
    html += `
      <div class="mission-item ${isDone ? 'completed' : ''}">
        <div class="mission-check" aria-hidden="true">${isDone ? '✓' : ''}</div>
        <div class="mission-text">${m.text}</div>
      </div>
    `;
  });
  html += `</div></div>`;
  container.innerHTML = html;
}

function renderLKPD(containerId, exp) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const data = Progress.state.data[exp] || [];
  let html = `<div class="addon-card">
    <div class="addon-header">
      <h3 class="addon-title"><svg class="ico" aria-hidden="true"><use href="#i-notebook"/></svg> Lembar kerja</h3>
      ${data.length ? `<button class="btn btn-secondary btn-sm" onclick="window.print()"><svg class="ico" aria-hidden="true"><use href="#i-print"/></svg> Cetak</button>` : ''}
    </div>`;
  if (data.length === 0) {
    html += `<div class="empty-state">
      <div class="empty-text">Belum ada data. Coba ganti aktivitas atau geser slider di panel kontrol, hasilnya otomatis tercatat di sini.</div>
    </div>`;
  } else {
    html += `<table class="lkpd-table">
      <thead><tr><th style="width:2.5rem;">No</th><th>Kondisi</th><th>Hasil</th></tr></thead>
      <tbody>`;
    data.forEach((row, i) => {
      html += `<tr><td>${i+1}</td><td>${row.condition}</td><td>${row.value}</td></tr>`;
    });
    html += `</tbody></table>`;
  }
  html += `</div>`;
  container.innerHTML = html;
}

const _quizShuffled = {};

function getShuffledOptions(exp, qIndex) {
  const key = `${exp}_${qIndex}`;
  if (!_quizShuffled[key]) {
    const q = QuizData[exp][qIndex];
    const order = Utils.shuffle(q.opts.map((_, i) => i));
    _quizShuffled[key] = order;
  }
  return _quizShuffled[key];
}

function renderQuiz(containerId, exp) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const questions = QuizData[exp];
  const saved = Progress.state.quiz[exp] || {};
  const letters = ['A', 'B', 'C', 'D', 'E'];

  let html = `<div class="addon-card">
    <div class="addon-header">
      <h3 class="addon-title"><svg class="ico" aria-hidden="true"><use href="#i-quiz"/></svg> Uji pemahaman</h3>
      <span class="value-badge" id="quizScore-${exp}">0/${questions.length}</span>
    </div>
    <div class="quiz-progress" id="quizProgress-${exp}">`;
  questions.forEach((_, i) => {
    const s = saved[i];
    const cls = s ? (s.correct ? 'correct' : 'wrong') : '';
    html += `<div class="quiz-dot ${cls}" data-q="${i}"></div>`;
  });
  html += `</div>`;

  questions.forEach((q, i) => {
    const savedAns = saved[i];
    html += `<div class="quiz-question">
      <p class="quiz-q-text"><span class="quiz-q-number">${i+1}</span><span>${q.q}</span></p>
      <div id="quiz-${exp}-${i}">`;
    const order = getShuffledOptions(exp, i);
    order.forEach((origIdx, pos) => {
      const opt = q.opts[origIdx];
      let cls = 'quiz-option';
      if (savedAns) {
        if (origIdx === q.a) cls += ' correct';
        else if (origIdx === savedAns.chosenIdx) cls += ' wrong';
      }
      const disabled = savedAns ? 'disabled' : '';
      html += `<button class="${cls}" ${disabled} onclick="answerQuiz('${exp}', ${i}, ${origIdx})">
        <span class="quiz-option-letter">${letters[pos]}</span>
        <span>${opt}</span>
      </button>`;
    });
    html += `</div><div id="feedback-${exp}-${i}" class="quiz-feedback ${savedAns ? 'show ' + (savedAns.correct ? 'correct' : 'wrong') : ''}">`;
    if (savedAns) {
      html += `<b>${savedAns.correct ? 'Benar, keren!' : 'Belum tepat, baca penjelasannya ya.'}</b><br>${q.exp}`;
    }
    html += `</div></div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
  updateQuizScore(exp);
}

function updateQuizScore(exp) {
  const el = document.getElementById(`quizScore-${exp}`);
  if (!el) return;
  const { total, correct } = Progress.isQuizComplete(exp);
  el.textContent = `${correct}/${total}`;
}

function answerQuiz(exp, qIndex, chosenIdx) {
  const q = QuizData[exp][qIndex];
  const isCorrect = chosenIdx === q.a;
  const container = document.getElementById(`quiz-${exp}-${qIndex}`);
  const feedback = document.getElementById(`feedback-${exp}-${qIndex}`);
  if (!container || !feedback) return;

  container.querySelectorAll('button').forEach((btn) => {
    btn.disabled = true;
    const onclick = btn.getAttribute('onclick') || '';
    const m = onclick.match(/, (\d+)\)/);
    if (m) {
      const origIdx = parseInt(m[1], 10);
      if (origIdx === q.a) btn.classList.add('correct');
      else if (origIdx === chosenIdx) btn.classList.add('wrong');
    }
  });
  feedback.className = `quiz-feedback show ${isCorrect ? 'correct' : 'wrong'}`;
  feedback.innerHTML = `<b>${isCorrect ? 'Benar, keren!' : 'Belum tepat, baca penjelasannya ya.'}</b><br>${q.exp}`;

  Progress.saveQuizAnswer(exp, qIndex, chosenIdx, isCorrect);
  updateQuizScore(exp);

  const dot = document.querySelector(`#quizProgress-${exp} .quiz-dot[data-q="${qIndex}"]`);
  if (dot) dot.classList.add(isCorrect ? 'correct' : 'wrong');

  if (isCorrect) {
    if (typeof Sound !== 'undefined') Sound.success();
  } else {
    if (typeof Sound !== 'undefined') Sound.error();
  }

  const { done } = Progress.isQuizComplete(exp);
  if (done) Progress.completeMission(exp, 'm3');
}