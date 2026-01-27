// ================================
// DOM ELEMENTS
// ================================
const questionText = document.getElementById('question-text');
const trueBtn = document.getElementById('true-btn');
const falseBtn = document.getElementById('false-btn');
const feedbackText = document.getElementById('feedback-text');
const buttonsContainer = document.getElementById('buttons-container');
const scoreText = document.getElementById('score-text');
const progressBar = document.getElementById('progress-bar');
const reportButtons = document.getElementById('report-buttons');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');
const quizContainer = document.getElementById('quiz-container');

// ================================
// STATE
// ================================
let questions = [];
let currentQuestionIndex = 0;
let isAnswered = false;
let score = 0;
let answersLog = [];
const NUMBER_OF_QUIZ_QUESTIONS = 10;

// ================================
// AUDIO
// ================================
let audioCtx = null;
function ensureAudioContext() { if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }

function playPling() {
    ensureAudioContext();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now+0.12);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now); osc.stop(now+0.12);
}

function playBuzz() {
    ensureAudioContext();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now+0.18);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now); osc.stop(now+0.18);
}

// ================================
// HELPERS
// ================================
function shuffleArray(array) {
    for(let i=array.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        [array[i],array[j]]=[array[j],array[i]];
    }
}

function updateHeader(){
    scoreText.textContent=`Ερώτηση ${currentQuestionIndex+1} / ${questions.length}`;
    progressBar.style.width=`${(currentQuestionIndex/questions.length)*100}%`;
}
function getOverallComment(percent){
    if(percent === 100) return "🏆 Άριστα! Τέλεια επίδοση!";
    if(percent >= 70) return "🎉 Πολύ καλή δουλειά!";
    if(percent >= 40) return "🙂 Καλή προσπάθεια, μπορείς και καλύτερα.";
    return "📚 Χρειάζεται περισσότερη εξάσκηση. Μην τα παρατάς!";
}


// ================================
// LOAD QUIZ
// ================================
async function fetchAndSetupQuiz(){
    currentQuestionIndex=0; score=0; isAnswered=false; questions=[]; answersLog=[];
    feedbackText.textContent=''; buttonsContainer.style.display='flex'; reportButtons.style.display='none';
    progressBar.style.width='0%'; questionText.textContent='Φόρτωση ερωτήσεων...';

    try {
        const response=await fetch('quiz_data.csv',{cache:'no-store'});
        const csvText=await response.text();
        const allQuestions=csvText.split('\n').slice(1).map(row=>{
            const [q,a]=row.split(';');
            return { question:q?.trim(), answer:a?.trim().toLowerCase()==='true' };
        }).filter(q=>q.question);
        shuffleArray(allQuestions);
        questions=allQuestions.slice(0,NUMBER_OF_QUIZ_QUESTIONS);
        loadQuestion();
    } catch(e){
        console.error(e);
        questionText.textContent='Σφάλμα φόρτωσης ερωτήσεων.';
        buttonsContainer.style.display='none';
    }
}

// ================================
// QUIZ LOGIC
// ================================
function loadQuestion(){
    if(currentQuestionIndex>=questions.length){ showReport(); return; }
    isAnswered=false;
    feedbackText.textContent='';
    trueBtn.classList.remove('selected'); falseBtn.classList.remove('selected');
    questionText.textContent=questions[currentQuestionIndex].question;
    updateHeader();
}

function checkAnswer(userAnswer){
    if(isAnswered) return; isAnswered=true;
    const q=questions[currentQuestionIndex];
    const isCorrect = userAnswer===q.answer;

    (userAnswer?trueBtn:falseBtn).classList.add('selected');

    answersLog.push({ question:q.question, correct:q.answer, userAnswer, isCorrect });

    if(isCorrect){
        score++; feedbackText.textContent='✅ Μπράβο!'; feedbackText.className='correct'; playPling();
        quizContainer.classList.add('flash-correct');
    } else {
        feedbackText.textContent='❌ Λάθος!'; feedbackText.className='incorrect'; playBuzz();
        quizContainer.classList.add('flash-incorrect');
    }

    setTimeout(()=>{ quizContainer.classList.remove('flash-correct','flash-incorrect'); },600);

    // AUTO NEXT DELAY
    setTimeout(()=>{
        currentQuestionIndex++; loadQuestion();
    }, 900);
}

// ================================
// REPORT
// ================================
function showReport(){
    feedbackText.textContent = '';
feedbackText.className = '';
    buttonsContainer.style.display = 'none';
    reportButtons.style.display = 'flex';

    const percent = Math.round((score / questions.length) * 100);
    if (percent === 100 && typeof confetti === 'function') {
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#007bff', '#4CAF50', '#ffffff']
    });
}
    const overallComment = getOverallComment(percent);

    let html = `
        <h2>Σκορ: ${percent}%</h2>
        <p class="overall-comment">${overallComment}</p>
        <ul class="report-list">
    `;

    answersLog.forEach((log, i) => {

    const userAnswerText = log.userAnswer ? 'Σωστό' : 'Λάθος';
    const correctAnswerText = log.correct ? 'Σωστό' : 'Λάθος';

    html += `
        <li class="${log.isCorrect ? 'report-correct' : 'report-incorrect'}">
            ${i + 1}. ${log.question}<br>
            ${log.isCorrect ? '✅' : '❌'} 
            Απάντησες: <strong>${userAnswerText}</strong> — 
            Η απάντηση είναι: <strong>${correctAnswerText}</strong>
        </li>
    `;
});


    html += '</ul>';

    questionText.innerHTML = html;
    scoreText.textContent = '';
    progressBar.style.width = '100%';
}


// ================================
// EVENTS
// ================================
trueBtn.addEventListener('click',()=>checkAnswer(true));
falseBtn.addEventListener('click',()=>checkAnswer(false));
restartBtn.addEventListener('click',fetchAndSetupQuiz);
homeBtn.addEventListener('click',()=>window.location.href='../index.html');

window.addEventListener('load',fetchAndSetupQuiz);
