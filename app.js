// app.js

// How many questions in each exam
const EXAM_SIZE = 25;

// Exam duration in seconds (20 minutes = 1200 seconds)
const EXAM_DURATION_SECONDS = 20 * 60;

// Google Apps Script Web App URL (for saving results to Google Sheets)
const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbx6GxRULVqXlFoM36pCdvfPWqEN1GlqG-SfhyQ0NW4BBNOJU4qPtGZbu8gYUuKfBe8c/exec";

let allQuestions = [];
let examQuestions = [];
let examStarted = false;
let examStartTime = null;
let examFinished = false;

// timer state
let timerInterval = null;
let remainingSeconds = EXAM_DURATION_SECONDS;

// DOM references
let startBtn, finishBtn, statusDiv, quizContainer, resultContainer, nameInput, timerDiv;

document.addEventListener("DOMContentLoaded", function () {
  startBtn = document.getElementById("startBtn");
  finishBtn = document.getElementById("finishBtn");
  statusDiv = document.getElementById("status");
  quizContainer = document.getElementById("quizContainer");
  resultContainer = document.getElementById("resultContainer");
  nameInput = document.getElementById("studentName");
  timerDiv = document.getElementById("timer");

  startBtn.disabled = true;
  finishBtn.disabled = true;

  updateTimerDisplay(remainingSeconds);

  loadQuestions();

  startBtn.addEventListener("click", handleStart);
  finishBtn.addEventListener("click", handleFinishClick);
});

// ---------------------- Data loading ----------------------

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

// ---------------------- Exam flow ----------------------

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

  // reset & start timer
  remainingSeconds = EXAM_DURATION_SECONDS;
  updateTimerDisplay(remainingSeconds);
  startTimer();

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
}

// When user clicks Finish button
function handleFinishClick() {
  if (!examStarted || examFinished) {
    statusDiv.textContent = "The exam is not active.";
    return;
  }
  finalizeExam(false); // manual finish
}

// This function does the actual scoring + review + logging
function finalizeExam(autoSubmitted) {
  if (!examStarted || examFinished) return;

  examFinished = true;
  examStarted = false;

  // stop timer
  stopTimer();

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
  if (autoSubmitted) {
    html += "<strong>Note:</strong> Time ended; exam was submitted automatically.<br/>";
  }
  html += "</div><br/>";

  html += "<h2>Answer Review</h2>";
  html += feedbackHtml;

  resultContainer.innerHTML = html;

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

  statusDiv.textContent = autoSubmitted
    ? "Time is over. Exam submitted automatically."
    : "Exam finished. Review your answers below.";
}

// ---------------------- Timer logic ----------------------

function startTimer() {
  stopTimer(); // just in case

  timerInterval = setInterval(function () {
    remainingSeconds -= 1;
    if (remainingSeconds < 0) {
      remainingSeconds = 0;
    }

    updateTimerDisplay(remainingSeconds);

    if (remainingSeconds <= 0) {
      // time over
      stopTimer();
      if (examStarted && !examFinished) {
        finalizeExam(true); // auto-submit
      }
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay(seconds) {
  if (!timerDiv) return;
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  var mm = m < 10 ? "0" + m : String(m);
  var ss = s < 10 ? "0" + s : String(s);
  timerDiv.textContent = "Time left: " + mm + ":" + ss;
}

// ---------------------- Google Sheets integration ----------------------

function sendResultToSheet(payload) {
  if (!SHEET_ENDPOINT) {
    console.warn("SHEET_ENDPOINT is not configured.");
    return;
  }

  fetch(SHEET_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(function (res) {
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      return res.json();
    })
    .then(function (data) {
      if (data.status !== "ok") {
        console.warn("Sheet API returned error:", data);
      }
    })
    .catch(function (err) {
      console.warn("Failed to send result to sheet:", err);
    });
}

// ---------------------- Helpers ----------------------

function indexToLetter(index) {
  return String.fromCharCode(65 + index); // 0 → A, 1 → B, ...
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
