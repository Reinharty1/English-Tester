// app.js

let currentQuestions = [];
let examStarted = false;

const difficultySelect = document.getElementById('difficulty');
const questionCountInput = document.getElementById('questionCount');
const startExamBtn = document.getElementById('startExamBtn');
const finishExamBtn = document.getElementById('finishExamBtn');
const questionsContainer = document.getElementById('questionsContainer');
const resultContainer = document.getElementById('resultContainer');

startExamBtn.addEventListener('click', startExam);
finishExamBtn.addEventListener('click', finishExam);

async function startExam() {
  const difficulty = difficultySelect.value; // easy / moderate / advanced
  const count = parseInt(questionCountInput.value, 10) || 50;

  const url = `data/questions_${difficulty}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Cannot load questions from ${url}`);
    }
    const allQuestions = await response.json();

    // Shuffle and take first N
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

function renderQuestions(questions) {
  questionsContainer.innerHTML = '';

  questions.forEach((q, index) => {
    const div = document.createElement('div');
    div.className = 'question';
    div.dataset.questionId = q.id ?? index; // fallback to index if no id

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

  const scorePercent = currentQuestions.length
    ? Math.round((correctCount / currentQuestions.length) * 100)
    : 0;

  showResult(answers, scorePercent);

  // TODO: send results to Google Sheets (later)
  // sendToGoogleSheets(answers, scorePercent);
}

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

    const chosenText = ans.chosenIndex != null
      ? q.options[ans.chosenIndex]
      : '(No answer)';

    const correctText = q.options[q.correctIndex];

    expl.innerHTML = `
      <div class="${correctnessClass}">
        Q${index + 1}: ${correctnessText}
      </div>
      <div><strong>Question:</strong> ${q.question}</div>
      <div><strong>Your answer:</strong> ${chosenText}</div>
      <div><strong>Correct answer:</strong> ${correctText}</div>
      <div class="explanation">
        <strong>Explanation:</strong> ${q.explanation ?? 'No explanation provided.'}
      </div>
    `;

    resultContainer.appendChild(expl);
  });
}

// Utility: Fisher–Yates shuffle
function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Placeholder for Google Sheets integration (later)
function sendToGoogleSheets(answers, scorePercent) {
  console.log('Sending to Google Sheets (to implement later)...', {
    answers,
    scorePercent
  });
}
