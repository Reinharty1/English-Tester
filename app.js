// app.js

const EXAM_SIZE = 50; // number of random questions per exam

let allQuestions = [];
let examQuestions = [];
let examStarted = false;
let examStartTime = null;

let startBtn, finishBtn, statusDiv, quizContainer, resultContainer, nameInput;

document.addEventListener("DOMContentLoaded", () => {
  // Cache DOM
  startBtn = document.getElementById("startBtn");
  finishBtn = document.getElementById("finishBtn");
  statusDiv = document.getElementById("status");
  quizContainer = document.getElementById("quizContainer");
  resultContainer = document.getElementById("resultContainer");
  nameInput = document.getElementById("studentName");

  startBtn.disabled = true;
  finishBtn.disabled = true;

  loadQuestions();

  startBtn.addEventListener("click", handleStart);
  finishBtn.addEventListener("click", handleFinish);
});

function loadQuestions() {
  statusDiv.textContent = "Loading questions…";

  fetch("questions.json")
    .then((res) => {
      if (!res.ok) {
        throw new Error("Failed to load questions.json");
      }
      return res.json();
    })
    .then((data) => {
      allQuestions = data;
      if (!Array.isArray(allQuestions) || allQuestions.length === 0) {
        throw new Error("questions.json is empty or invalid.");
      }
      statusDiv.textContent = "";
      startBtn.disabled = false;
    })
    .catch((err) => {
      console.error(err);
      statusDiv.textContent =
        "Error loading questions. Check that questions.json is in the same folder as index.html.";
    });
}

function handleStart() {
  if (!allQuestions.length) {
    statusDiv.textContent = "Questions not loaded yet.";
    return;
  }

  // Prepare exam
  examQuestions = pickRandomQuestions(allQuestions, EXAM_SIZE);
  examStarted = true;
  examStartTime = new Date();

  // Render
  renderExam();

  // Toggle buttons
  startBtn.disabled = true;
  finishBtn.disabled = false;
  statusDiv.textContent = `Exam started. You have ${examQuestions.length} questions.`;
  resultContainer.innerHTML = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function pickRandomQuestions(questions, count) {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function renderExam() {
  quizContainer.innerHTML = "";

  examQuestions.forEach((q, index) => {
    const block = document.createElement("div");
    block.className = "question-block";

    const qTitle = document.createElement("div");
    qTitle.innerHTML = `<strong>${index + 1}.</strong> ${q.question}`;
    block.appendChild(qTitle);

    (q.options || []).forEach((optText, optIndex) => {
      if (!optText || !optText.trim()) return;

      const letter = String.fromCharCode(65 + optIndex); // A, B, C, ...
      const name = `q_${index}`;
      const id = `q_${index}_${optIndex}`;

      const label = document.createElement("label");
      label.setAttribute("for", id);

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = name;
      radio.id = id;
      radio.value = String(optIndex);

      label.appendChild(radio);
      label.appendChild(document.createTextNode(` ${letter}) ${optText}`));

      block.appendChild(label);
    });

    quizContainer.appendChild(block);
  });
}

function handleFinish() {
  if (!examStarted) {
    statusDiv.textContent = "You need to start the exam first.";
    return;
  }

  let correct = 0;
  let answered = 0;

  examQuestions.forEach((q, index) => {
    const selected = document.querySelector(
      `input[name="q_${index}"]:checked`
    );
    if (!selected) {
      return;
    }
    answered++;
    const chosenIndex = parseInt(selected.value, 10);
    if (chosenIndex === q.correctIndex) {
      correct++;
    }
  });

  const total = examQuestions.length;
  const percent = Math.round((correct / total) * 100);
  const studentName = nameInput.value.trim();
  const endTime = new Date();
  const durationSec = examStartTime
    ? Math.round((endTime - examStartTime) / 1000)
    : null;

  // Simple result box
  let html = `<div class="score-box">`;
  html += `<strong>Score:</strong> ${correct} / ${total} (${percent}%)<br/>`;
  if (studentName) {
    html += `<strong>Student:</strong> ${escapeHtml(studentName)}<br/>`;
  }
  html += `<strong>Questions answered:</strong> ${answered} / ${total}<br/>`;
  if (durationSec !== null) {
    html += `<strong>Time used:</strong> ${durationSec} seconds<br/>`;
  }
  html += `</div>`;

  resultContainer.innerHTML = html;

  // After finish, you can re-enable starting a new random exam if you want:
  startBtn.disabled = false;
  finishBtn.disabled = true;
  examStarted = false;

  statusDiv.textContent = "Exam finished. You can start a new random exam if you want.";
}

// Very simple HTML escape
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
