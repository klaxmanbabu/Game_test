(function () {
  const QUESTION_COUNT = 5;
  const BEST_SCORE_KEY = "rsq_best_percent_v1";
  const NICKNAME_KEY = "rsq_nickname_v1";
  const PASS_MARK = 80; // fixed pass mark (change if you want)

  const els = {
    startScreen: document.getElementById("startScreen"),
    quizScreen: document.getElementById("quizScreen"),
    resultScreen: document.getElementById("resultScreen"),
    startBtn: document.getElementById("startBtn"),
    nextBtn: document.getElementById("nextBtn"),
    restartBtn: document.getElementById("restartBtn"),
    nickname: document.getElementById("nickname"),
    questionBlock: document.getElementById("questionBlock"),
    progressText: document.getElementById("progressText"),
    scoreSoFar: document.getElementById("scoreSoFar"),
    resultSummary: document.getElementById("resultSummary"),
    reviewBlock: document.getElementById("reviewBlock")
  };

  const bank = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickN(arr, n) {
    return shuffle(arr).slice(0, Math.min(n, arr.length));
  }

  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getBestPercent() {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function setBestPercent(p) {
    localStorage.setItem(BEST_SCORE_KEY, String(p));
  }

  function getNickname() {
    return (localStorage.getItem(NICKNAME_KEY) || "").trim();
  }

  function setNickname(n) {
    localStorage.setItem(NICKNAME_KEY, (n || "").trim());
  }

  function bestLineHtml() {
    const best = getBestPercent();
    return (best === null)
      ? `<div><strong>Best:</strong> Not set</div>`
      : `<div><strong>Best:</strong> ${best}%</div>`;
  }

  let quiz = {
    questions: [],
    index: 0,
    answers: new Map()
  };

  function startQuiz() {
    setNickname(els.nickname ? els.nickname.value : "");

    quiz.questions = pickN(bank, QUESTION_COUNT);
    quiz.index = 0;
    quiz.answers = new Map();

    hide(els.startScreen);
    hide(els.resultScreen);
    show(els.quizScreen);

    renderQuestion();
  }

  function renderQuestion() {
    const qObj = quiz.questions[quiz.index];
    if (!qObj) return;

    els.nextBtn.disabled = true;

    const chosen = quiz.answers.get(qObj.id);

    els.progressText.textContent = `Question ${quiz.index + 1} of ${quiz.questions.length}`;
    els.scoreSoFar.innerHTML = `
      <div>Answered: ${quiz.answers.size}/${quiz.questions.length}</div>
      ${bestLineHtml()}
    `;

    const optionsHtml = qObj.options
      .map((opt, idx) => {
        const checked = chosen === idx ? "checked" : "";
        return `
          <label class="option">
            <input type="radio" name="opt" value="${idx}" ${checked} />
            <span>${escapeHtml(opt)}</span>
          </label>
        `;
      })
      .join("");

    els.questionBlock.innerHTML = `
      <h2>${escapeHtml(qObj.q)}</h2>
      <div class="options">${optionsHtml}</div>
    `;

    els.questionBlock.querySelectorAll('input[name="opt"]').forEach((r) => {
      r.addEventListener("change", (e) => {
        const val = Number(e.target.value);
        quiz.answers.set(qObj.id, val);
        els.nextBtn.disabled = false;
      });
    });

    if (typeof chosen === "number") els.nextBtn.disabled = false;

    els.nextBtn.textContent = (quiz.index === quiz.questions.length - 1) ? "Finish" : "Next";
  }

  function finishQuiz() {
    const total = quiz.questions.length;
    let correct = 0;

    const reviewItems = quiz.questions.map((q) => {
      const selected = quiz.answers.get(q.id);
      const isCorrect = selected === q.answerIndex;
      if (isCorrect) correct += 1;

      const selectedText = (typeof selected === "number") ? q.options[selected] : "No answer";
      const correctText = q.options[q.answerIndex];

      return { q: q.q, selectedText, correctText, isCorrect };
    });

    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = percent >= PASS_MARK;

    const prevBest = getBestPercent();
    if (prevBest === null || percent > prevBest) setBestPercent(percent);

    const nick = getNickname();
    const whoLine = nick ? `<strong>Player:</strong> ${escapeHtml(nick)}<br />` : "";

    els.resultSummary.innerHTML = `
      ${whoLine}
      <strong>Score:</strong> ${correct}/${total} (${percent}%)
      <span class="badge ${passed ? "pass" : "fail"}">${passed ? "PASS" : "FAIL"}</span>
      <br />
      <strong>Pass mark:</strong> ${PASS_MARK}%
      <br />
      <strong>Best:</strong> ${getBestPercent()}%
    `;

    els.reviewBlock.innerHTML = reviewItems.map((it, i) => `
      <div class="reviewItem">
        <div>
          <strong>Q${i + 1}.</strong> ${escapeHtml(it.q)}
          <span class="badge ${it.isCorrect ? "pass" : "fail"}">${it.isCorrect ? "Correct" : "Incorrect"}</span>
        </div>
        <div><strong>Your answer:</strong> ${escapeHtml(it.selectedText)}</div>
        <div><strong>Correct answer:</strong> ${escapeHtml(it.correctText)}</div>
      </div>
    `).join("");

    hide(els.quizScreen);
    show(els.resultScreen);
  }

  function next() {
    const qObj = quiz.questions[quiz.index];
    if (!qObj) return;
    if (!quiz.answers.has(qObj.id)) return;

    if (quiz.index === quiz.questions.length - 1) {
      finishQuiz();
      return;
    }

    quiz.index += 1;
    renderQuestion();
  }

  function restart() {
    hide(els.resultScreen);
    hide(els.quizScreen);

    if (els.nickname) els.nickname.value = getNickname();
    show(els.startScreen);
  }

  els.startBtn.addEventListener("click", startQuiz);
  els.nextBtn.addEventListener("click", next);
  els.restartBtn.addEventListener("click", restart);

  if (bank.length === 0) {
    els.startBtn.disabled = true;
    els.startScreen.insertAdjacentHTML(
      "beforeend",
      `<p class="hint">Question bank not found. Ensure <code>questions.js</code> is loading correctly.</p>`
    );
  } else {
    if (els.nickname) els.nickname.value = getNickname();
    els.startScreen.insertAdjacentHTML("beforeend", `<p class="hint">${bestLineHtml()}</p>`);
  }
})();
