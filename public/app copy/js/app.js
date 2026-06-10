(function () {
  "use strict";

  const tg = window.Telegram?.WebApp;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function safe(fn) {
    try {
      return fn?.();
    } catch (e) {
      console.error("Safe error:", e);
    }
  }

  function el(id) {
    return document.getElementById(id);
  }
  




  /* ===================== INIT ===================== */

  safe(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
  });

  /* ===================== STATE ===================== */

  const MOOD_EMOJI = ["😰", "😟", "😐", "🙂", "😊"];

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
  
  function vibrate(type) {
    if (!navigator.vibrate) return;
  
    if (type === "inhale") navigator.vibrate(30);
    if (type === "exhale") navigator.vibrate(20);
    if (type === "end") navigator.vibrate([80, 50, 80]);
  }
  
  function saveBreathingSession() {
    const sessions = JSON.parse(
      localStorage.getItem("breath_sessions") || "[]"
    );
  
    sessions.push({
      date: new Date().toISOString(),
      cycles: breath.cycle,
      duration:
        Math.round((Date.now() - breathSession.startedAt) / 1000)
    });
  
    localStorage.setItem(
      "breath_sessions",
      JSON.stringify(sessions.slice(-50))
    );
  }
  /* ===================== SAFE UI ===================== */

  function setText(id, value) {
    const node = el(id);
    if (node) node.textContent = value;
  }

  function setClass(id, className) {
    const node = el(id);
    if (node) node.className = className;
  }

  /* ===================== NAVIGATION ===================== */

  function showView(view) {
    $$(".view").forEach(v => v.classList.remove("active"));
    const target = el(`view-${view}`);
    if (target) target.classList.add("active");
  }

  /* ===================== BREATHING ===================== */

  function startBreathing() {
    if (!breath.pattern) return;
    breathSession.startedAt = Date.now();
    breathSession.cycles = 0;
    breath.running = true;
    breath.cycle = 0;
    breath.phase = 0;

    runCycle();
  }

  function stopBreathing() {
    breath.running = false;
    saveBreathingSession();
    vibrate("end");
    if (breath.timer) {
      clearTimeout(breath.timer);
      breath.timer = null;
    }

    setText("breath-phase", "Готово");
    setText("breath-counter", "");
    setClass("breathing-circle", "breathing-circle");
  }

  function runCycle() {
    if (!breath.running || !breath.pattern) return;

    const pattern = breath.pattern;

    if (breath.cycle >= pattern.cycles) {
      stopBreathing();
      return;
    }

    const phase = pattern.phases[breath.phase];

    setText("breath-phase", phase.label);
    setText("breath-counter", phase.duration);

    setClass("breathing-circle", `breathing-circle ${phase.type}`);

    let t = phase.duration;

    function tick() {
      if (!breath.running) return;

      setText("breath-counter", t);

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

  function openBreathing(key) {
    const pattern = BREATH_PATTERNS[key];
    if (!pattern) return;

    breath.pattern = pattern;
    breath.running = false;
    breath.phase = 0;
    breath.cycle = 0;

    setText("breath-phase", "Готов?");
    setText("breath-counter", "");
    setText("breath-instruction", pattern.name);

    showView("breathe-active");
  }

  /* ===================== EVENTS ===================== */

  function init() {
    const startBtn = el("startBtn");
    const stopBtn = el("stopBtn");

    if (startBtn) {
      startBtn.addEventListener("click", () => {
        if (breath.running) stopBreathing();
        else startBreathing();
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener("click", stopBreathing);
    }

    $$(".technique-card").forEach(card => {
      card.addEventListener("click", () => {
        openBreathing(card.dataset.breathe);
      });
    });

    console.log("CalmMind app initialized");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();