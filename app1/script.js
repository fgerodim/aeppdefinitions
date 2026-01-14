const QUESTIONS_DIV = document.getElementById("questions");
const RESULT_DIV = document.getElementById("result");
const CHECK_BTN = document.getElementById("check-btn");
const RESULT_AREA = document.getElementById("result-area");
const RETRY_BTN = document.getElementById("retry-btn");

const NUMBER_OF_QUESTIONS = 4;
let quizData = [];

function shuffle(array) { return array.sort(() => Math.random() - 0.5); }

async function loadCSV() {
    const res = await fetch("matching_data.csv");
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
        div.innerHTML = `<label>${q.term}</label>
                         <select><option value="">-- επίλεξε --</option></select>`;
        
        const select = div.querySelector("select");
        definitions.forEach(def => {
            const opt = document.createElement("option");
            opt.value = def; opt.textContent = def;
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
            q.classList.add("correct"); score++;
        } else {
            q.classList.add("incorrect");
        }
        select.disabled = true;
    });

    RESULT_DIV.textContent = `Σκορ: ${score} / ${NUMBER_OF_QUESTIONS}`;
    CHECK_BTN.style.display = "none";
    RESULT_AREA.style.display = "block";
};

RETRY_BTN.onclick = startQuiz;
loadCSV();