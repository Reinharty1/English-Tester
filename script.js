// script.js

let ALL_QUESTIONS = [];
let EXAM_QUESTIONS = [];
const EXAM_SIZE = 50; // number of questions per exam

document.addEventListener("DOMContentLoaded", () => {
  loadQuestions();
});

function loadQuestions() {
  fetch("questions.json")
    .then((res) => {
      if (!res.ok) {
        throw new Error("Failed to load questions.json");
      }
      return res.json();
    })
    .then((data) => {
      ALL_QUESTIONS = data;
      prepareExam();
      renderExam();
      document.getElementById("finish-btn").disabled = false;
      document
        .getElementById("finish-btn")
        .addEventListener("click", handleFinish);
    })
    .catch((err) => {
      console.error(err);
      document.getElementById("quiz-container").innerText =
        "Error loading questions.";
    });
}

function prepareExam() {
  // Shuffle questions
  const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5);
  // Take first N
  EXAM_QUESTIONS = shuffled.slice(0, EXAM_SIZE);
}

function renderExam() {
  const container = document.getElementById("quiz-container");
  container.innerHTML = ""; // clear old content

  EXAM_QUESTIONS.forEach((q, index) => {
    const qDiv = document.createElement("div");
    qDiv.className = "question-block";
    qDiv.style.marginBottom = "20px";

    const qTitle = document.createElement("div");
    qTitle.innerHTML = `<strong>${index + 1}. </strong>${q.question}`;
    qDiv.appendChild(qTitle);

    // Render options (A–E). Some questions have fewer than 5; we skip empty ones.
    q.options.forEach((optText, optIndex) => {
      if (!optText || optText.trim() === "") return;

      const optId = `q${index}_opt${optIndex}`;

      const label = document.createElement("label");
      label.htmlFor = optId;
      label.style.display = "block";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `q${index}`;
      radio.id = optId;
      radio.value = optIndex;

      label.appendChild(radio);
      label.appendChild(document.createTextNode(" " + optText));

      qDiv.appendChild(label);
    });

    container.appendChild(qDiv);
  });
}

function handleFinish() {
  let correct = 0;

  EXAM_QUESTIONS.forEach((q, index) => {
    const selected = document.querySelector(
      `input[name="q${index}"]:checked`
    );
    if (!selected) {
      return; // unanswered
    }
    const chosenIndex = parseInt(selected.value, 10);
    if (chosenIndex === q.correctIndex) {
      correct++;
    }
  });

  const scorePercent = Math.round((correct / EXAM_QUESTIONS.length) * 100);

  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = `
    <h2>Result</h2>
    <p>You answered <strong>${correct}</strong> out of <strong>${EXAM_QUESTIONS.length}</strong> correctly.</p>
    <p>Score: <strong>${scorePercent}%</strong></p>
  `;
}
