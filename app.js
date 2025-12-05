// app.js

// ====== CONFIG ======

// How many questions in each exam
const EXAM_SIZE = 25;

// Exam duration in minutes
const EXAM_DURATION_MIN = 20;

// Google Apps Script Web App URL (for saving results to Google Sheets)
const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbx6GxRULVqXlFoM36pCdvfPWqEN1GlqG-SfhyQ0NW4BBNOJU4qPtGZbu8gYUuKfBe8c/exec";

// ====== STATE ======

let allQuestions = [];
let examQuestions = [];

let examStarted = false;
let examFinished = false;
let examStartTime = null;

// timer state
let timerInterval = null;
let remainingSeconds = 0;

// DOM references
let startBtn,
  finishBtn,
  statusDiv,
  quizContainer,
  resultContainer,
  nameInput,
  timerDiv,
  progressTextEl,
  progressBarEl,
  backToTopBtn;

// ====== INIT ======

document.addEventListener("DOMContentLoaded", function () {
  startBtn = document.getElementById("startBtn");
  finishBtn = document.getElementById("finishBtn");
  statusDiv = document.getElementById("status");
  quizContainer = document.getElementById("quizContainer");
  resultContainer = document.getElementById("resultContainer");
  nameInput = document.getElementById("studentName");
  timerDiv = document.getElementById("timer");
  progressTextEl = document.getElementById("progressText");
  progressBarEl = document.getElementById("progressBar");
  backToTopBtn = document.getElementById("backToTop");

  startBtn.disabled = true;
  finishBtn.disabled = true;

  updateTimerDisplay(); // show "Time: --:--" at start
  updateProgress(); // initial

  loadQuestions();

  startBtn.addEventListener("click", handleStart);
  finishBtn.addEventListener("click", function () {
    handleFinish(false); // manual finish
  });

  // Update progress when any radio changes (event delegation)
  quizContainer.addEventListener("change", function (e) {
    if (e.target && e.target.matches('input[type="radio"]')) {
      updateProgress();
    }
  });

  // Back-to-top behaviour
  backToTopBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", function () {
    if (window.scrollY > 200) {
      backToTopBtn.classList.add("visible");
    } else {
      backToTopBtn.classList.remove("visible");
    }
  });
});

// ====== LOAD QUESTIONS ======

function loadQuestions() {
  statusDiv.textContent = "Loading questions…";

  fetch("questions.json")
    .then(function (res) {
      if (!res.ok) {
        throw new Error("Failed to load questions.json");
      }
      return res.json();
    })
    .then(function (data) {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("questions.json is empty or invalid.");
      }

      allQuestions = data;
      statusDiv.textContent = "";
      startBtn.disabled = false;
    })
    .catch(function (err) {
      console.error(err);
      statusDiv.textContent =
        "Error loading questions. Check that questions.json is in the same folder as index.html.";
    });
}

// ====== EXAM FLOW ======

function handleStart() {
  if (!allQuestions.length) {
    statusDiv.textContent = "Questions not loaded yet.";
    return;
  }

  examQuestions = pickRandomQuestions(allQuestions, EXAM_SIZE);
  examStarted = true;
  examFinished = false;
  examStartTime = new Date();

  renderExam();

  startBtn.disabled = true;
  finishBtn.disabled = false;
  resultContainer.innerHTML = "";
  statusDiv.textContent = "Exam started. You have 25 questions.";

  // timer
  remainingSeconds = EXAM_DURATION_MIN * 60;
  updateTimerDisplay();
  startTimer();

  updateProgress();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function pickRandomQuestions(questions, count) {
  var shuffled = questions.slice().sort(function () {
    return Math.random() - 0.5;
  });
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function renderExam() {
  quizContainer.innerHTML = "";

  examQuestions.forEach(function (q, index) {
    var block = document.createElement("div");
    block.className = "question-block";

    var qTitle = document.createElement("div");
    qTitle.innerHTML = "<strong>" + (index + 1) + ".</strong> " + q.question;
    block.appendChild(qTitle);

    (q.options || []).forEach(function (optText, optIndex) {
      if (!optText || !optText.trim()) return;

      var letter = indexToLetter(optIndex);
      var name = "q_" + index;
      var id = "q_" + index + "_" + optIndex;

      var label = document.createElement("label");
      label.setAttribute("for", id);

      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = name;
      radio.id = id;
      radio.value = String(optIndex);

      label.appendChild(radio);
      label.appendChild(
        document.createTextNode(" " + letter + ") " + optText)
      );

      block.appendChild(label);
    });

    quizContainer.appendChild(block);
  });

  updateProgress();
}

// ====== TIMER ======

function startTimer() {
  stopTimer(); // safety
  timerInterval = setInterval(tickTimer, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function tickTimer() {
  if (!examStarted) {
    stopTimer();
    return;
  }

  remainingSeconds -= 1;
  if (remainingSeconds <= 0) {
    remainingSeconds = 0;
    updateTimerDisplay();
    stopTimer();
    if (examStarted && !examFinished) {
      // auto-submit
      handleFinish(true);
    }
  } else {
    updateTimerDisplay();
  }
}

function updateTimerDisplay() {
  if (!timerDiv) return;

  if (!examStarted && remainingSeconds === 0) {
    timerDiv.textContent = "Time: --:--";
    return;
  }

  var m = Math.floor(remainingSeconds / 60);
  var s = remainingSeconds % 60;
  var mm = m < 10 ? "0" + m : String(m);
  var ss = s < 10 ? "0" + s : String(s);
  timerDiv.textContent = "Time left: " + mm + ":" + ss;
}

// ====== PROGRESS BAR ======

function updateProgress() {
  if (!progressTextEl || !progressBarEl) return;

  if (!examQuestions || !examQuestions.length) {
    progressTextEl.textContent = "Answered 0 / " + EXAM_SIZE;
    progressBarEl.style.width = "0%";
    return;
  }

  var answered = 0;
  for (var i = 0; i < examQuestions.length; i++) {
    var sel = document.querySelector('input[name="q_' + i + '"]:checked');
    if (sel) answered++;
  }

  var total = examQuestions.length;
  var percent = total ? Math.round((answered / total) * 100) : 0;

  progressTextEl.textContent = "Answered " + answered + " / " + total;
  progressBarEl.style.width = percent + "%";
}

// ====== FINISH & REVIEW ======

/**
 * autoSubmit = true  → time over
 * autoSubmit = false → user clicked Finish
 */
function handleFinish(autoSubmit) {
  if (!examStarted || examFinished) {
    return;
  }

  examFinished = true;
  examStarted = false;
  stopTimer();
  updateTimerDisplay(); // reset to "--:--"

  var correct = 0;
  var answered = 0;

  var feedbackHtml = "";

  examQuestions.forEach(function (q, index) {
    var selected = document.querySelector('input[name="q_' + index + '"]:checked');
    var userAnswerIndex = selected ? parseInt(selected.value, 10) : null;

    var correctIndex = q.correctIndex;
    var correctLetter = indexToLetter(correctIndex);
    var correctText = q.options && q.options[correctIndex]
      ? q.options[correctIndex]
      : "";

    var userLetter = "(no answer)";
    var userText = "";
    var wasCorrect = false;

    if (userAnswerIndex !== null && !isNaN(userAnswerIndex)) {
      answered++;
      userLetter = indexToLetter(userAnswerIndex);
      userText =
        q.options && q.options[userAnswerIndex]
          ? q.options[userAnswerIndex]
          : "";
      wasCorrect = userAnswerIndex === correctIndex;
      if (wasCorrect) correct++;
    }

    var bgColor = wasCorrect ? "#ecfdf5" : "#fef2f2";
    var borderColor = wasCorrect ? "#6ee7b7" : "#fecaca";

    feedbackHtml +=
      '<div style="margin-bottom: 16px; padding: 12px; border-radius: 8px; background: ' +
      bgColor +
      "; border: 1px solid " +
      borderColor +
      ';">' +
      "<div><strong>" +
      (index + 1) +
      ". " +
      escapeHtml(q.question) +
      "</strong></div>" +
      "<div><strong>Your answer:</strong> " +
      escapeHtml(userLetter) +
      (userText ? " - " + escapeHtml(userText) : "") +
      "</div>" +
      "<div><strong>Correct answer:</strong> " +
      escapeHtml(correctLetter) +
      (correctText ? " - " + escapeHtml(correctText) : "") +
      "</div>" +
      "<div><strong>Result:</strong> " +
      (wasCorrect ? "✔ Correct" : "✘ Incorrect") +
      "</div>" +
      "</div>";
  });

  var total = examQuestions.length;
  var percent = Math.round((correct / total) * 100);
  var studentName = nameInput.value.trim();
  var endTime = new Date();
  var durationSec = examStartTime
    ? Math.round((endTime - examStartTime) / 1000)
    : null;

  var html = '<div class="score-box">';
  html += "<strong>Score:</strong> " + correct + " / " + total + " (" + percent + "%)<br/>";
  if (studentName) {
    html += "<strong>Student:</strong> " + escapeHtml(studentName) + "<br/>";
  }
  html += "<strong>Questions answered:</strong> " + answered + " / " + total + "<br/>";
  if (durationSec !== null) {
    html += "<strong>Time used:</strong> " + durationSec + " seconds<br/>";
  }
  html += "</div><br/>";

  html += "<h2>Answer Review</h2>";
  html += feedbackHtml;

  resultContainer.innerHTML = html;

  // make sure progress is fully updated at the end
  updateProgress();

  // Send result to Google Sheets (non-blocking)
  sendResultToSheet({
    studentName: studentName,
    score: correct,
    total: total,
    percent: percent,
    answered: answered,
    durationSec: durationSec
  });

  startBtn.disabled = false;
  finishBtn.disabled = true;

  if (autoSubmit) {
    statusDiv.textContent =
      "Time is up. Exam submitted automatically. Review your answers below.";
  } else {
    statusDiv.textContent = "Exam finished. Review your answers below.";
  }
}

// ====== GOOGLE SHEETS INTEGRATION ======

function sendResultToSheet(payload) {
  if (!SHEET_ENDPOINT) {
    console.warn("SHEET_ENDPOINT is not configured.");
 
::contentReference[oaicite:0]{index=0}
