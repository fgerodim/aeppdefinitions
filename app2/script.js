let allPairs = [];
let currentPairs = [];
let firstCard = null;
let lock = false;
let solved = 0;
let hasError = false;

let audioCtx;

function ensureAudio(){
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playPling(){
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.frequency.value = 900; g.gain.value = 0.1;
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + 0.15);
}

function playBuzz(){
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "square"; o.frequency.value = 120; g.gain.value = 0.12;
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + 0.2);
}

function shuffle(arr){ return arr.sort(() => Math.random() - 0.5); }

async function loadCSV(){
  const res = await fetch("data.csv");
  const text = await res.text();
  const rows = text.trim().split("\n");
  allPairs = rows.map(row => {
    const [l, r] = row.split(";");
    return { l: l.trim(), r: r.trim() };
  });
  newExercise();
}

function newExercise(){
  // ΜΗΔΕΝΙΣΜΟΣ ΓΙΑ ΝΕΑ ΑΣΚΗΣΗ
  solved = 0;
  hasError = false; 
  firstCard = null;
  lock = false;
  
  document.getElementById("finish-area").style.display = "none";
  document.getElementById("reward-message").textContent = "";
  document.getElementById("progress").textContent = "Επίλεξε τα σωστά ζεύγη";
  
  currentPairs = shuffle([...allPairs]).slice(0, 4);
  render();
}

function render(){
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  const leftColumn = document.createElement("div");
  leftColumn.className = "column";
  const rightColumn = document.createElement("div");
  rightColumn.className = "column";

  currentPairs.forEach(p => {
    const d = document.createElement("div");
    d.className = "card"; d.textContent = p.l;
    d.dataset.id = p.l; d.dataset.side = "l";
    d.onclick = () => selectCard(d);
    leftColumn.appendChild(d);
  });

  shuffle([...currentPairs]).forEach(p => {
    const d = document.createElement("div");
    d.className = "card"; d.textContent = p.r;
    d.dataset.id = p.l; d.dataset.side = "r";
    d.onclick = () => selectCard(d);
    rightColumn.appendChild(d);
  });

  grid.appendChild(leftColumn);
  grid.appendChild(rightColumn);
}

function selectCard(el){
  if(lock || el.classList.contains("disabled")) return;

  if(!firstCard){
    firstCard = el;
    el.classList.add("selected");
    return;
  }

  if(firstCard.dataset.side === el.dataset.side) return;

  lock = true;

  if(firstCard.dataset.id === el.dataset.id){
    firstCard.classList.add("correct", "disabled");
    el.classList.add("correct", "disabled");
    playPling();
    solved++;
    resetTurn();
  } else {
    hasError = true; // Καταγραφή λάθους για την επιβράβευση
    firstCard.classList.add("wrong");
    el.classList.add("wrong");
    playBuzz();
    setTimeout(() => {
      firstCard.classList.remove("wrong", "selected");
      el.classList.remove("wrong");
      resetTurn();
    }, 700);
  }
}

function resetTurn(){
  firstCard = null;
  lock = false;

  if(solved === 4){
    // ΕΛΕΓΧΟΣ ΕΠΙΒΡΑΒΕΥΣΗΣ
    if(!hasError){
        document.getElementById("reward-message").textContent = "🌟 Συγχαρητήρια! Τα βρήκες όλα με την πρώτη! 🌟";
    } else {
        document.getElementById("reward-message").textContent = "Μπράβο! Ολοκλήρωσες την άσκηση.";
    }
    document.getElementById("progress").textContent = "Τέλος Ασκησης";
    document.getElementById("finish-area").style.display = "block";
  }
}

document.getElementById("nextBtn").onclick = newExercise;
loadCSV();