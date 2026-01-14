// Σταθερές για τη φόρτωση των στοιχείων HTML
const questionText = document.getElementById('question-text');
const trueBtn = document.getElementById('true-btn');
const falseBtn = document.getElementById('false-btn');
const feedbackText = document.getElementById('feedback-text');
const nextBtn = document.getElementById('next-btn');
const buttonsContainer = document.getElementById('buttons-container');
const scoreText = document.getElementById('score-text');
const progressBar = document.getElementById('progress-bar');

// ΣΤΑΘΕΡΕΣ ΓΙΑ ΤΗΝ ΑΡΧΙΚΗ ΣΕΛΙΔΑ
const splashScreen = document.getElementById('splash-screen');
const quizContent = document.getElementById('quiz-content');
const startBtn = document.getElementById('start-btn');
const exitBtn = document.getElementById('exit-btn');


let questions = []; // Εδώ θα αποθηκευτούν οι τυχαίες ερωτήσεις
let currentQuestionIndex = 0;
let isAnswered = false;
let score = 0;
let answersLog = []; // Καταγράφει τις απαντήσεις, το σωστό/λάθος και την ερώτηση.

const NUMBER_OF_QUIZ_QUESTIONS = 10; // Ο αριθμός των ερωτήσεων που θέλουμε
// --- WebAudio setup για μικρά sounds (pling / buzz) ---
let audioCtx = null; // θα δημιουργηθεί στην πρώτη αλληλεπίδραση

function ensureAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// "Pling" για σωστή απάντηση — δύο σύντομοι τόνοι
function playPling() {
    ensureAudioContext();
    const now = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(900, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.005);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1).connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // δεύτερος τόνος, μικρότερο delay
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, now + 0.06);
    gain2.gain.setValueAtTime(0, now + 0.06);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.065);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc2.connect(gain2).connect(audioCtx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.18);
}

// "Buzz" για λάθος — σύντομος, χαμηλός τόνος με γρήγορη κόκκινη ριπή
function playBuzz() {
    ensureAudioContext();
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    // μικρή παραμόρφωση (τύπου "τραχύτητας") με αντίσταση (wave shaping) optional
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
}


// --- ΛΟΓΙΚΗ ΦΟΡΤΩΣΗΣ ΚΑΙ ΤΥΧΑΙΑΣ ΕΠΙΛΟΓΗΣ ---

// 1. Συνάρτηση για την ανάμειξη (shuffle) ενός πίνακα
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Συνάρτηση για τον υπολογισμό της κατάταξης με βάση το σκορ
function getRank(score, total) {
    const percentage = (score / total) * 100;
    
    if (total === 0) return { title: 'Χωρίς Κατάταξη', emoji: '❓' };
    
    if (percentage === 100) {
        return { title: 'Φυτό! 🧠', emoji: '🏆' };
    } else if (percentage >= 80) {
        return { title: 'Εξαιρετικός Μαθητής!', emoji: '⭐' };
    } else if (percentage >= 60) {
        return { title: 'Καλός Μαθητής', emoji: '👍' };
    } else if (percentage >= 40) {
        return { title: 'Χρειάζεται Μελέτη', emoji: '📚' };
    } else {
        return { title: 'Αδιάβαστος!', emoji: '🤕' };
    }
}

// 2. Συνάρτηση για τη φόρτωση των ερωτήσεων από το CSV
async function fetchAndSetupQuiz() {
    // Επαναφορά όλων των μεταβλητών
    currentQuestionIndex = 0;
    score = 0;
    isAnswered = false;
    questions = [];
    answersLog = []; 
    
    // Επαναφορά εμφάνισης κουμπιών / κειμένων
    buttonsContainer.style.display = 'flex'; 
    nextBtn.style.display = 'none';
    nextBtn.textContent = 'Επόμενη Ερώτηση '; 
    feedbackText.textContent = '';
    questionText.textContent = "Φόρτωση ερωτήσεων... παρακαλώ περιμένετε.";
    feedbackText.classList.remove('correct', 'incorrect', 'streak-bonus'); 

    try {
        const response = await fetch('quiz_data.csv');
        if (!response.ok) {
            throw new Error('Δεν βρέθηκε το αρχείο quiz_data.csv. Βεβαιωθείτε ότι υπάρχει και το όνομα είναι σωστό.');
        }
        const csvText = await response.text();
        
        // Μετατροπή CSV σε πίνακα αντικειμένων
        const allQuestions = csvText.split('\n').slice(1).map(row => {
            const [question, answer] = row.split(';');
            
            return {
                question: question ? question.trim() : '',
                answer: (answer ? answer.trim().toLowerCase() === 'true' : false)
            };
        }).filter(q => q.question); 
        
        const shuffledQuestions = shuffleArray(allQuestions);
        questions = shuffledQuestions.slice(0, NUMBER_OF_QUIZ_QUESTIONS);
        
        // Ξεκίνημα του κουίζ
        if (questions.length > 0) {
            loadQuestion();
        } else {
             questionText.textContent = "ΣΦΑΛΜΑ: Δεν βρέθηκαν ερωτήσεις στο quiz_data.csv. Παρακαλώ ελέγξτε το αρχείο.";
             buttonsContainer.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Σφάλμα κατά τη φόρτωση ή επεξεργασία των ερωτήσεων:', error);
        questionText.textContent = `ΣΦΑΛΜΑ: ${error.message}. Παρακαλώ ελέγξτε το αρχείο quiz_data.csv.`;
        buttonsContainer.style.display = 'none';
    }
}


// --- ΛΟΓΙΚΗ QUIZ ---

// 🎯 ΝΕΟ: Συνάρτηση για την ενημέρωση του τρέχοντος αριθμού ερώτησης (όχι το σκορ)
function updateQuestionNumberDisplay() {
    const totalQuestions = questions.length;
    
    if (totalQuestions === 0) {
        scoreText.textContent = ``; 
        return;
    }
    
    // Εμφάνιση μόνο του αριθμού ερώτησης
    if (currentQuestionIndex < totalQuestions) {
        scoreText.textContent = `Ερώτηση ${currentQuestionIndex + 1} / ${totalQuestions}`; 
    } else {
        // Κρύψιμο/Καθαρισμός όταν τελειώσει το Quiz (Report screen)
        scoreText.textContent = ''; 
    }
}

// Συνάρτηση για την εμφάνιση της επόμενης ερώτησης
function loadQuestion() {
    isAnswered = false;
    feedbackText.textContent = '';
    nextBtn.style.display = 'none'; 
    buttonsContainer.style.pointerEvents = 'auto'; 
    feedbackText.classList.remove('correct', 'incorrect'); 
    
    trueBtn.classList.remove('selected');
    falseBtn.classList.remove('selected');
    
    // Κρύβουμε το footer
    document.getElementById('app-footer').style.display = 'none';
    // Επαναφορά κειμένου κουμπιού σε "Επόμενη Ερώτηση"
    nextBtn.textContent = 'Επόμενη Ερώτηση '; 
    if (questions.length > 0) {
        // Υπολογισμός ποσοστού ολοκλήρωσης
        const progressPercentage = (currentQuestionIndex / questions.length) * 100;
        progressBar.style.width = `${progressPercentage}%`;
    }
    if (currentQuestionIndex < questions.length) {
        questionText.textContent = questions[currentQuestionIndex].question;
        buttonsContainer.style.display = 'flex'; 

    } else {
        // 🏁 Τέλος του κουίζ - Εμφάνιση Αναλυτικού Report
        
        buttonsContainer.style.display = 'none';
        
        const totalQuestions = questions.length;
        const rank = getRank(score, totalQuestions);
        
        // 1. Τίτλος & Σκορ
        questionText.textContent = `Η κατάταξή σου είναι: ${rank.emoji} ${rank.title}`;
        
        feedbackText.classList.remove('correct', 'incorrect');
        
        let reportHTML = `
            <h2>Συνοπτικό Σκορ: ${score/totalQuestions*100}%</h2>
            <hr>
            <h4>Αναλυτική Επισκόπηση Απαντήσεων:</h4>
            <ul class="report-list">
        `;

        // 2. Δημιουργία της λίστας Report από το answersLog
        answersLog.forEach((logItem, index) => {
            const statusClass = logItem.isCorrect ? 'report-correct' : 'report-incorrect';
            const userAnswerText = logItem.userAnswer ? 'Σωστό' : 'Λάθος';
            const correctText = logItem.correct ? 'Σωστό' : 'Λάθος';

            reportHTML += `
                <li class="${statusClass}">
                    Ερώτηση ${index + 1}: ${logItem.question}<br>
                    ${logItem.isCorrect 
                        ? `✅ Απάντησες **Σωστά**!` 
                        : `❌ Απάντησες: **${userAnswerText}** | Η Απάντηση είναι: **${correctText}**`}
                </li>
            `;
        });

        reportHTML += '</ul>';

        feedbackText.innerHTML = reportHTML; 

        answersLog = []; 
        progressBar.style.width = '100%';
        
        document.getElementById('app-footer').style.display = 'block';

        // Εμφάνιση κουμπιού επανέναρξης και αλλαγή κειμένου
        nextBtn.style.display = 'block'; 
        nextBtn.textContent = 'Επανέναρξη 🔄'; 
    }
    
    // 🎯 Καλείται η ΝΕΑ συνάρτηση
    updateQuestionNumberDisplay(); 
}

// Συνάρτηση για τον έλεγχο της απάντησης
function checkAnswer(userAnswer) {
    if (isAnswered) return; 

    isAnswered = true;
    
    const currentQuestion = questions[currentQuestionIndex]; 
    const correctAnswer = currentQuestion.answer;
    const isCorrect = userAnswer === correctAnswer;
    
    buttonsContainer.style.pointerEvents = 'none'; 
    
    const selectedButton = userAnswer ? trueBtn : falseBtn;
    selectedButton.classList.add('selected'); 

    // Καταγραφή της απάντησης στο log
    answersLog.push({
        question: currentQuestion.question,
        correct: correctAnswer,
        userAnswer: userAnswer,
        isCorrect: isCorrect
    });
    
    if (isCorrect) {
        feedbackText.textContent = '✅ Μπράβο!';
        feedbackText.classList.add('correct');
        score++; 
        playPling();
        // προσθέτουμε την κλάση flash στο container
        const container = document.getElementById('quiz-container');
        container.classList.add('flash-correct');
        // αφαίρεση μετά 200ms (ασφαλές fallback)
        setTimeout(() => container.classList.remove('flash-correct'), 600);
        
    } else {
        feedbackText.textContent = '❌ Δοκίμασε την επόμενη!';
        feedbackText.classList.add('incorrect');
        playBuzz();
        const container = document.getElementById('quiz-container');
        container.classList.add('flash-incorrect');
        setTimeout(() => container.classList.remove('flash-incorrect'), 600);
        
    }

    // 🎯 Καλείται η ΝΕΑ συνάρτηση (αν και δεν αλλάζει το κείμενο εδώ, είναι για ενημέρωση)
    updateQuestionNumberDisplay(); 
    nextBtn.style.display = 'block'; 
}

// --- Χειριστές Γεγονότων (Event Listeners) ---

// 1. Χειριστής για το κουμπί 'Έναρξη'
startBtn.addEventListener('click', () => {
    splashScreen.style.display = 'none'; 
    quizContent.style.display = 'block'; 
    
    // Ξεκινάμε τη φόρτωση των δεδομένων και το quiz
    fetchAndSetupQuiz(); 
});

// 2. Χειριστής για το κουμπί 'Έξοδος' (Αντικατάσταση περιεχομένου)
exitBtn.addEventListener('click', () => {
    window.location.href = "../index.html";
});

trueBtn.addEventListener('click', () => checkAnswer(true));
falseBtn.addEventListener('click', () => checkAnswer(false));
nextBtn.addEventListener('click', () => {
    // Έλεγχος αν το κουμπί λειτουργεί ως "Επόμενη" ή "Επανέναρξη"
    if (nextBtn.textContent.includes('Επανέναρξη')) {
        
        // ✅ ΔΙΟΡΘΩΣΗ: Επιστροφή στην αρχική οθόνη (Splash Screen)
        splashScreen.style.display = 'block'; // Εμφάνιση αρχικής
        quizContent.style.display = 'none';  // Απόκρυψη περιεχομένου Quiz (Report)
        
        // Επαναφορά του κειμένου του nextBtn για τον επόμενο γύρο
        nextBtn.textContent = 'Επόμενη Ερώτηση '; 
        
        // Επαναφορά του footer στην αρχική οθόνη (Επειδή το κρύβουμε σε κάθε ερώτηση)
        document.getElementById('app-footer').style.display = 'block';
        
    } else {
        // Αλλιώς, προχωράμε στην επόμενη ερώτηση
        currentQuestionIndex++; 
        loadQuestion(); 
    }
});

