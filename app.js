// app.js

let currentQuestions = [];
let examStarted = false;

const studentNameInput = document.getElementById('studentName');
const difficultySelect = document.getElementById('difficulty');
const startExamBtn = document.getElementById('startExamBtn');
const finishExamBtn = document.getElementById('finishExamBtn');
const questionsContainer = document.getElementById('questionsContainer');
const resultContainer = document.getElementById('resultContainer');

// Google Apps Script Web App URL (already configured for your sheet)
const GOOGLE_SHEETS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbxXR8SSS_GNv1FwQzLVqQnriJWLZNKrJVozbQSUQ2aHyzQf_rXjGtw16cxYzqSA6mtI/exec';

startExamBtn.addEventListener('click', startExam);
finishExamBtn.addEventListener('click', finishExam);

// -------------------- START EXAM --------------------

async function startExam() {
  const difficulty = difficultySelect.value; // easy / moderate / advanced
  const url = `data/questions_${difficulty}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Cannot load questions from ${url}`);
    }
    const allQuestions = await response.json();

    // Always use up to 50 questions, randomly selected
    const count = Math.min(50, allQuestions.length);
    const shuffled = shuffleArray(allQuestions);
    currentQuestions = shuffled.slice(0, count);

    renderQuestions(currentQuestions);
    resultContainer.innerHTML = '';
    examStarted = true;
    finishExamBtn.disabled = false;
  } catch (err) {
    console.error(err);
    alert('Error loading questions. Check console for details.');
  }
}

// -------------------- RENDER QUESTIONS --------------------

function renderQuestions(questions) {
  questionsContainer.innerHTML = '';

  questions.forEach((q, index) => {
    const div = document.createElement('div');
    div.className = 'question';
    div.dataset.questionId = q.id ?? index;

    const header = document.createElement('div');
    header.className = 'question-header';
    header.textContent = `${index + 1}. ${q.question}`;

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'options';

    q.options.forEach((opt, optIndex) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `q_${index}`;
      radio.value = optIndex;

      label.appendChild(radio);
      label.appendChild(document.createTextNode(' ' + opt));
      optionsDiv.appendChild(label);
    });

    div.appendChild(header);
    div.appendChild(optionsDiv);
    questionsContainer.appendChild(div);
  });
}

// -------------------- FINISH EXAM --------------------

function finishExam() {
  if (!examStarted) return;

  const answers = [];
  let correctCount = 0;

  currentQuestions.forEach((q, index) => {
    const radios = document.getElementsByName(`q_${index}`);
    let chosenIndex = null;

    for (const r of radios) {
      if (r.checked) {
        chosenIndex = parseInt(r.value, 10);
        break;
      }
    }

    const isCorrect = chosenIndex === q.correctIndex;
    if (isCorrect) correctCount++;

    answers.push({
      questionId: q.id ?? index,
      chosenIndex,
      correctIndex: q.correctIndex,
      correct: isCorrect
    });
  });

  const totalQuestions = currentQuestions.length;
  const scorePercent = totalQuestions
    ? Math.round((correctCount / totalQuestions) * 100)
    : 0;

  showResult(answers, scorePercent);

  const studentName = studentNameInput.value.trim() || 'Anonymous';
  const difficulty = difficultySelect.value;

  // Send results to Google Sheets (fire-and-forget)
  sendToGoogleSheets(
    answers,
    scorePercent,
    correctCount,
    totalQuestions,
    studentName,
    difficulty
  );
}

// -------------------- SHOW RESULT --------------------

function showResult(answers, scorePercent) {
  resultContainer.innerHTML = '';

  const summary = document.createElement('div');
  summary.className = 'result';
  summary.innerHTML = `
    <h2>Your Score</h2>
    <p>You answered <strong>${answers.filter(a => a.correct).length}</strong> 
    out of <strong>${currentQuestions.length}</strong> correctly 
    (${scorePercent}%).</p>
  `;

  resultContainer.appendChild(summary);

  // Detailed explanations
  currentQuestions.forEach((q, index) => {
    const ans = answers[index];

    const expl = document.createElement('div');
    expl.className = 'result';

    const correctnessClass = ans.correct ? 'correct' : 'incorrect';
    const correctnessText = ans.correct ? 'Correct' : 'Incorrect';

    const chosenText =
      ans.chosenIndex != null ? q.options[ans.chosenIndex] : '(No answer)';

    const correctText = q.options[q.correctIndex];

    expl.innerHTML = `
      <div class="${correctnessClass}">
        Q${index + 1}: ${correctnessText}
      </div>
      <div><strong>Question:</strong> ${q.question}</div>
      <div><strong>Your answer:</strong> ${chosenText}</div>
      <div><strong>Correct answer:</strong> ${correctText}</div>
      <div class="explanation">
        <strong>Explanation:</strong> ${
          q.explanation ?? 'No explanation provided.'
        }
      </div>
    `;

    resultContainer.appendChild(expl);
  });
}

// -------------------- UTILS --------------------

// Fisher–Yates shuffle
function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Send data to Google Sheets via Apps Script Web App
function sendToGoogleSheets(
  answers,
  scorePercent,
  correctCount,
  totalQuestions,
  studentName,
  difficulty
) {
  if (!GOOGLE_SHEETS_WEB_APP_URL) {
    console.warn('Google Sheets Web App URL not set.');
    return;
  }

  const payload = {
    studentName,
    difficulty,
    scorePercent,
    totalQuestions,
    correctCount,
    answers
  };

  // Fire-and-forget; no-cors avoids CORS errors
  fetch(GOOGLE_SHEETS_WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }).catch(err => {
    console.error('Error sending to Google Sheets', err);
  });
}
