let allData = [];
let currentExercise = null;
let timerInterval;
let finished = false;

const TIME_LIMIT = 15;

const quizContainer = document.getElementById('quiz-container');
const codeDisplay = document.getElementById('code-display');
const instructionText = document.querySelector('.instruction');
const userInput = document.getElementById('user-input');
const checkBtn = document.getElementById('check-btn');
const progressBar = document.getElementById('progress-bar');
const answerReveal = document.getElementById('answer-reveal');
const resultText = document.getElementById('result-text');
const reportButtons = document.getElementById('report-buttons');

async function loadCSV() {
    const res = await fetch('data.csv');
    const text = await res.text();

    const rows = text.trim().split('\n').slice(1);

    allData = rows.map(r => {
        const match = r.match(/(".*?");(.*)/);
        const fullText = match[1].replace(/"/g, '').replace(/\\n/g, '\n');
        const [code, quest] = fullText.split('|');

        return {
            code: code.trim(),
            question: quest ? quest.trim() : "Ποια είναι η τιμή;",
            answer: match[2].trim()
        };
    });

    startNewExercise();
}

function startNewExercise() {
    clearInterval(timerInterval);
    finished = false;

    quizContainer.style.backgroundColor = "white";
    userInput.disabled = false;
    userInput.value = '';
    userInput.focus();
    checkBtn.style.display = 'block';
    answerReveal.style.display = 'none';
    reportButtons.style.display = 'none';

    currentExercise = allData[Math.floor(Math.random() * allData.length)];
    codeDisplay.textContent = currentExercise.code;
    instructionText.textContent = currentExercise.question;

    startTimer();
}

function startTimer() {
    let timeLeft = TIME_LIMIT;
    progressBar.style.width = '100%';

    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        progressBar.style.width = (timeLeft / TIME_LIMIT) * 100 + '%';

        if (timeLeft <= 0) {
    clearInterval(timerInterval);
    validate(false, true);
}
    }, 100);
}

function normalize(txt) {
    return txt.toUpperCase().replace(/\s+/g, '');
}

function validate(fromButton = false, isTimeout = false) {
    if (finished) return;
    finished = true;

    clearInterval(timerInterval);

    userInput.disabled = true;
    checkBtn.style.display = 'none';
    answerReveal.style.display = 'block';

    const userAns = normalize(userInput.value);
    const correctAns = normalize(currentExercise.answer);

    const isCorrect = userAns === correctAns && userAns !== "";

    if (isCorrect) {
        quizContainer.style.backgroundColor = "#d4edda";
        resultText.innerHTML = `✅ Σωστά! Η τιμή είναι <strong>${currentExercise.answer}</strong>`;
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    } else {
        quizContainer.style.backgroundColor = "#f8d7da";

        let msg = "Λάθος!";
        if (isTimeout && userAns === "") msg = "Τέλος χρόνου!";
        if (isTimeout && userAns !== "") msg = "Δεν πρόλαβες να πατήσεις έλεγχο!";

        resultText.innerHTML = `❌ ${msg} Σωστό: <strong>${currentExercise.answer}</strong>`;
    }

    reportButtons.style.display = 'flex';
}


checkBtn.onclick = () => validate(false);
userInput.onkeyup = e => { if (e.key === 'Enter') validate(false); };
document.getElementById('retry-btn').onclick = startNewExercise;

loadCSV();
