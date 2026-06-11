alert("APP VERSION TEST 123");

console.log("🔥 APP LOADED");

(function () {
"use strict";

const tg = window.Telegram?.WebApp;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const el = (id) => document.getElementById(id);

if (tg) {
tg.ready();
tg.expand();
}

const BREATH_PATTERNS = {
478: {
name: "4-7-8",
phases: [
{ label: "Вдох", duration: 4, type: "inhale" },
{ label: "Задержка", duration: 7, type: "hold" },
{ label: "Выдох", duration: 8, type: "exhale" }
],
cycles: 4
},
box: {
name: "Box",
phases: [
{ label: "Вдох", duration: 4, type: "inhale" },
{ label: "Задержка", duration: 4, type: "hold" },
{ label: "Выдох", duration: 4, type: "exhale" },
{ label: "Пауза", duration: 4, type: "hold" }
],
cycles: 4
},
calm: {
name: "Calm",
phases: [
{ label: "Вдох", duration: 5, type: "inhale" },
{ label: "Выдох", duration: 5, type: "exhale" }
],
cycles: 6
}
};

let breath = {
running: false,
pattern: null,
timer: null,
cycle: 0,
phase: 0
};

let breathSession = {
startedAt: 0,
cycles: 0
};

let breathAI = {
level: 1,
calmIndex: 0,
lastEmotion: "neutral"
};

const EMOTION_STYLE = {
panic: {
color: "#ff4d4d",
hint: "Ты в безопасности. Замедли дыхание."
},
anxious: {
color: "#ff9f43",
hint: "Плечи расслаблены. Ты справляешься."
},
neutral: {
color: "#4a90e2",
hint: "Наблюдай за дыханием."
},
calm: {
color: "#2ecc71",
hint: "Отлично. Удерживай ритм."
}
};

function setText(id, value) {
const node = el(id);
if (node) node.textContent = value;
}

function setClass(id, className) {
const node = el(id);
if (node) node.className = className;
}

function animateBreath(type) {
const circle = el("breathing-circle");
if (!circle) return;

if (type === "inhale") {
  circle.style.transform = "scale(1.25)";
}

if (type === "exhale") {
  circle.style.transform = "scale(0.85)";
}

if (type === "hold") {
  circle.style.transform = "scale(1)";
}

}

function showView(view) {
$$(".view").forEach((v) => v.classList.remove("active"));

const target = el(`view-${view}`);

if (target) {
  target.classList.add("active");
}

}

function openBreathing(key) {
const pattern = BREATH_PATTERNS[key];

if (!pattern) {
  console.warn("Pattern not found:", key);
  return;
}

breath.pattern = pattern;
breath.running = false;
breath.cycle = 0;
breath.phase = 0;

setText(
  "breath-instruction",
  `🧪 Уровень ${breathAI.level} — Исследовательское дыхание`
);

setText("breath-phase", "Готов?");
setText("breath-counter", "");

showView("breathe-active");

}

function startBreathing() {
console.log("START CLICKED");

if (!breath.pattern) {
  console.error("No breathing pattern selected");
  return;
}

breath.running = true;
breath.cycle = 0;
breath.phase = 0;

breathSession.startedAt = Date.now();

runCycle();

}

function stopBreathing() {
breath.running = false;

if (breath.timer) {
  clearTimeout(breath.timer);
  breath.timer = null;
}

breathAI.calmIndex++;

if (breathAI.calmIndex % 3 === 0) {
  breathAI.level = Math.min(5, breathAI.level + 1);
}

setText("breath-phase", "Готово");
setText("breath-counter", "");

setClass("breathing-circle", "breathing-circle");

}

function runCycle() {
if (!breath.running || !breath.pattern) {
return;
}

const pattern = breath.pattern;

if (breath.cycle >= pattern.cycles) {
  stopBreathing();
  return;
}

const phase = pattern.phases[breath.phase];

if (!phase) {
  stopBreathing();
  return;
}

setText("breath-phase", phase.label);
setText("breath-counter", phase.duration);

setClass(
  "breathing-circle",
  `breathing-circle ${phase.type}`
);

animateBreath(phase.type);

let t = phase.duration;

const hints = [
  "Расслабь челюсть",
  "Опусти плечи",
  "Ты в безопасности",
  "Дыши медленно",
  "Наблюдай за дыханием"
];

function tick() {
  if (!breath.running) {
    return;
  }

  setText("breath-counter", t);

  if (t === phase.duration - 1) {
    const hint =
      hints[Math.floor(Math.random() * hints.length)];

    setText("breath-instruction", hint);
  }

  if (t <= 0) {
    breath.phase++;

    if (breath.phase >= pattern.phases.length) {
      breath.phase = 0;
      breath.cycle++;
    }

    runCycle();
    return;
  }

  t--;

  breath.timer = setTimeout(tick, 1000);
}

tick();

}

function initEmotions() {
$$(".emotion-bar button").forEach((btn) => {
btn.addEventListener("click", () => {
const emo = btn.dataset.emotion;
const style = EMOTION_STYLE[emo];

    if (!style) return;

    breathAI.lastEmotion = emo;

    document.documentElement.style.setProperty(
      "--breath-color",
      style.color
    );

    setText("breath-instruction", style.hint);
  });
});

}

function init() {
const startBtn = el("startBtn");
const stopBtn = el("stopBtn");

if (startBtn) {
  startBtn.addEventListener("click", () => {
    if (breath.running) {
      stopBreathing();
    } else {
      startBreathing();
    }
  });
}

if (stopBtn) {
  stopBtn.addEventListener("click", stopBreathing);
}

$$(".technique-card").forEach((card) => {
  card.addEventListener("click", () => {
    openBreathing(card.dataset.breathe);
  });
});

initEmotions();

console.log("Breathing initialized");

}

if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", init);
} else {
init();
}
})();