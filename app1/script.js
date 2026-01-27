const QUESTIONS_DIV = document.getElementById("questions");
const RESULT_DIV = document.getElementById("result");
const CHECK_BTN = document.getElementById("check-btn");
const RESULT_AREA = document.getElementById("result-area");
const RETRY_BTN = document.getElementById("retry-btn");

const NUMBER_OF_QUESTIONS = 4;
let quizData = [];

// ================================
// AUDIO (ίδιο με Σωστό/Λάθος)
// ================================
let audioCtx = null;
function ensureAudioContext() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playPling() {
    ensureAudioContext();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
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

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

async function loadCSV() {
    const res = await fetch("matching_data.csv", { cache: "no-store" });
    const text = await res.text();

    const rows = text.trim().split("\n").slice(1);
    quizData = rows.map(r => {
        const [term, definition] = r.split(";");
        return { term: term?.trim(), definition: definition?.trim() };
    }).filter(q => q.term && q.definition);

    startQuiz();
}

function startQuiz() {
    QUESTIONS_DIV.innerHTML = "";
    RESULT_AREA.style.display = "none";
    CHECK_BTN.style.display = "inline-block";

    const selected = shuffle([...quizData]).slice(0, NUMBER_OF_QUESTIONS);
    const definitions = shuffle(selected.map(q => q.definition));

    selected.forEach(q => {
        const div = document.createElement("div");
        div.className = "question";
        div.dataset.correct = q.definition;

        div.innerHTML = `
            <label>${q.term}</label>
            <select>
                <option value="">-- επίλεξε --</option>
            </select>
        `;

        const select = div.querySelector("select");

        definitions.forEach(def => {
            const opt = document.createElement("option");
            opt.value = def;
            opt.textContent = def;
            select.appendChild(opt);
        });

        QUESTIONS_DIV.appendChild(div);
    });
}

CHECK_BTN.onclick = () => {
    let score = 0;

    document.querySelectorAll(".question").forEach(q => {
        const select = q.querySelector("select");

        if (select.value === q.dataset.correct) {
            q.classList.add("correct");
            score++;
            playPling();
        } else {
            q.classList.add("incorrect");
            playBuzz();
        }

        select.disabled = true;
    });

    RESULT_DIV.textContent = `Σκορ: ${score} / ${NUMBER_OF_QUESTIONS}`;
    if (score === NUMBER_OF_QUESTIONS && typeof confetti === 'function') {
    confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
    });
}
    CHECK_BTN.style.display = "none";
    RESULT_AREA.style.display = "block";
};

RETRY_BTN.onclick = startQuiz;

loadCSV();
