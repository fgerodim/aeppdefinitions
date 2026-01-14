// ================================
// DOM
// ================================
const questionText = document.getElementById('question-text');
const trueBtn = document.getElementById('true-btn');
const falseBtn = document.getElementById('false-btn');
const feedbackText = document.getElementById('feedback-text');
const buttonsContainer = document.getElementById('buttons-container');
const scoreText = document.getElementById('score-text');
const progressBar = document.getElementById('progress-bar');

const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');
const reportButtons = document.getElementById('report-buttons');

const quizContainer = document.getElementById('quiz-container');

// ================================
// STATE
// ================================
let questions = [];
let currentQuestionIndex = 0;
let isAnswered = false;
let score = 0;
let answersLog = [];

const NUMBER_OF_QUIZ_QUESTIONS = 5;
const AUTO_NEXT_DELAY = 1200;

// ================================
// AUDIO (Chrome + Mobile FIXED)
// ================================
let audioCtx = null;

function ensureAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playPling() {
    ensureAudioContext();
    const now = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(900, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1).connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, now + 0.06);
    gain2.gain.setValueAtTime(0.08, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc2.connect(gain2).connect(audioCtx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.18);
}

function playBuzz() {
    ensureAudioContext();
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
}

// ================================
// HELPERS
// ================================
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function updateHeader() {
    scoreText.textContent = `Ερώτηση ${currentQuestionIndex + 1} / ${questions.length}`;
    progressBar.style.width = `${(currentQuestionIndex / questions.length) * 100}%`;
}

// ================================
// LOAD QUIZ
// ================================
async function fetchAndSetupQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    isAnswered = false;
    questions = [];
    answersLog = [];

    reportButtons.style.display = 'none';
    buttonsContainer.style.display = 'flex';
    feedbackText.textContent = '';
    progressBar.style.width = '0%';

    questionText.textContent = 'Φόρτωση ερωτήσεων...';

    const response = await fetch('quiz_data.csv', { cache: 'no-store' });
    const csvText = await response.text();

    const allQuestions = csvText.split('\n').slice(1).map(row => {
        const [question, answer] = row.split(';');
        return {
            question: question?.trim(),
            answer: answer?.trim().toLowerCase() === 'true'
        };
    }).filter(q => q.question);

    shuffleArray(allQuestions);
    questions = allQuestions.slice(0, NUMBER_OF_QUIZ_QUESTIONS);

    loadQuestion();
}

// ================================
// QUIZ LOGIC
// ================================
function loadQuestion() {
    isAnswered = false;
    feedbackText.textContent = '';
    trueBtn.classList.remove('selected');
    falseBtn.classList.remove('selected');

    if (currentQuestionIndex >= questions.length) {
        showReport();
        return;
    }

    questionText.textContent = questions[currentQuestionIndex].question;
    updateHeader();
}

function checkAnswer(userAnswer) {
    if (isAnswered) return;
    isAnswered = true;

    ensureAudioContext(); // mobile unlock

    const q = questions[currentQuestionIndex];
    const isCorrect = userAnswer === q.answer;

    (userAnswer ? trueBtn : falseBtn).classList.add('selected');

    answersLog.push({
        question: q.question,
        correct: q.answer,
        userAnswer,
        isCorrect
    });

    if (isCorrect) {
        score++;
        feedbackText.textContent = '✅ Μπράβο!';
        feedbackText.className = 'correct';
        playPling();
        quizContainer.classList.add('flash-correct');
    } else {
        feedbackText.textContent = '❌ Λάθος!';
        feedbackText.className = 'incorrect';
        playBuzz();
        quizContainer.classList.add('flash-incorrect');
    }

    setTimeout(() => {
        quizContainer.classList.remove('flash-correct', 'flash-incorrect');
    }, 600);

    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion();
    }, AUTO_NEXT_DELAY);
}

// ================================
// REPORT
// ================================
function showReport() {
    buttonsContainer.style.display = 'none';
    reportButtons.style.display = 'flex';

    const percent = Math.round((score / questions.length) * 100);

    let html = `<h2>Σκορ: ${percent}%</h2><ul class="report-list">`;

    answersLog.forEach((log, i) => {
        html += `
        <li class="${log.isCorrect ? 'report-correct' : 'report-incorrect'}">
            ${i + 1}. ${log.question}<br>
            ${log.isCorrect ? '✅ Σωστό' : `❌ Απάντησες: ${log.userAnswer ? 'Σωστό' : 'Λάθος'} | Σωστό: ${log.correct ? 'Σωστό' : 'Λάθος'}`}
        </li>`;
    });

    html += '</ul>';

    questionText.innerHTML = html;
    scoreText.textContent = '';
    progressBar.style.width = '100%';
}

// ================================
// EVENTS
// ================================
trueBtn.addEventListener('click', () => checkAnswer(true));
falseBtn.addEventListener('click', () => checkAnswer(false));

restartBtn.addEventListener('click', fetchAndSetupQuiz);
homeBtn.addEventListener('click', () => window.location.href = '../index.html');

window.addEventListener('load', fetchAndSetupQuiz);
