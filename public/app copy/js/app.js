alert("APP LOADED — ВЕРСИЯ 2.0");

console.log("App started");

const breath = {
  running: false,
  pattern: null,
  phase: 0,
  cycle: 0,
  timer: null
};

const patterns = {
  "478": {
    name: "4-7-8",
    phases: [
      { label: "Вдох", duration: 4, type: "inhale" },
      { label: "Задержка", duration: 7, type: "hold" },
      { label: "Выдох", duration: 8, type: "exhale" }
    ]
  }
};

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function setClass(id, className) {
  const el = document.getElementById(id);
  if (el) el.className = className;
}

function stopBreathing() {
  if (breath.timer) {
    clearTimeout(breath.timer);
    breath.timer = null;
  }
  breath.running = false;
}

function runCycle() {
  if (breath.timer) clearTimeout(breath.timer);
  
  if (!breath.running || !breath.pattern) {
    return;
  }
  
  const phase = breath.pattern.phases[breath.phase];
  if (!phase) {
    stopBreathing();
    return;
  }
  
  setText("breath-phase", phase.label);
  setText("breath-counter", phase.duration);
  setClass("breathing-circle", `breathing-circle ${phase.type}`);
  
  let secondsLeft = phase.duration;
  
  function tick() {
    if (!breath.running) return;
    
    setText("breath-counter", secondsLeft);
    
    if (secondsLeft <= 0) {
      breath.phase++;
      if (breath.phase >= breath.pattern.phases.length) {
        breath.phase = 0;
        breath.cycle++;
      }
      runCycle();
      return;
    }
    
    secondsLeft--;
    breath.timer = setTimeout(tick, 1000);
  }
  
  tick();
}

function startBreathing() {
  console.log("START CLICKED");
  if (!breath.pattern) {
    alert("Сначала выберите режим дыхания (нажмите 4-7-8)");
    return;
  }
  
  stopBreathing();
  breath.running = true;
  breath.phase = 0;
  breath.cycle = 0;
  runCycle();
}

function selectPattern(key) {
  if (patterns[key]) {
    breath.pattern = patterns[key];
    alert(`Режим ${breath.pattern.name} выбран. Теперь нажмите "Начать"`);
    stopBreathing();
  }
}

document.addEventListener("DOMContentLoaded", function() {
  const startBtn = document.getElementById("start-btn");
  if (startBtn) {
    startBtn.onclick = startBreathing;
  }
  
  const pattern478 = document.getElementById("pattern-478");
  if (pattern478) {
    pattern478.onclick = () => selectPattern("478");
  }
});
