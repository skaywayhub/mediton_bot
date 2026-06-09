(function () {
  "use strict";

  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    applyTheme(tg);
  }

  const MOOD_EMOJI = ["😰", "😟", "😐", "🙂", "😊"];

  const BREATH_PATTERNS = {
    478: { name: "4-7-8", phases: [{ label: "Вдох", duration: 4, type: "inhale" }, { label: "Задержка", duration: 7, type: "hold" }, { label: "Выдох", duration: 8, type: "exhale" }], cycles: 4 },
    box: { name: "Коробочное", phases: [{ label: "Вдох", duration: 4, type: "inhale" }, { label: "Задержка", duration: 4, type: "hold" }, { label: "Выдох", duration: 4, type: "exhale" }, { label: "Пауза", duration: 4, type: "hold" }], cycles: 4 },
    calm: { name: "Спокойное", phases: [{ label: "Вдох", duration: 5, type: "inhale" }, { label: "Выдох", duration: 5, type: "exhale" }], cycles: 6 },
    coherent: { name: "Когерентное", phases: [{ label: "Вдох", duration: 5, type: "inhale" }, { label: "Выдох", duration: 5, type: "exhale" }], cycles: 8 },
  };

  const VIEWS = {
    home: { title: "CalmMind", subtitle: "Твой помощник при тревоге", showBack: false },
    breathe: { title: "Дыхание", subtitle: "Выбери технику", showBack: true },
    "breathe-active": { title: "Дыхание", subtitle: "", showBack: true },
    grounding: { title: "Заземление", subtitle: "5-4-3-2-1", showBack: true },
    journal: { title: "Дневник", subtitle: "Запиши мысли и настроение", showBack: true },
    techniques: { title: "Техники КПТ", subtitle: "Когнитивные инструменты", showBack: true },
    stats: { title: "Статистика", subtitle: "Твой прогресс", showBack: true },
    premium: { title: "Premium", subtitle: "Расширенные возможности", showBack: true },
  };

  let currentView = "home";
  let viewHistory = [];
  let breathState = { running: false, pattern: null, timer: null, soundOn: false, vibrateOn: true };
  let groundingStep = 0;
  let isPremium = false;
  let audioCtx = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function applyTheme(tgApp) {
    const tp = tgApp.themeParams;
    if (!tp) return;
    const root = document.documentElement;
    if (tp.bg_color) root.style.setProperty("--bg", tp.bg_color);
    if (tp.secondary_bg_color) root.style.setProperty("--bg-card", tp.secondary_bg_color);
    if (tp.text_color) root.style.setProperty("--text", tp.text_color);
    if (tp.hint_color) root.style.setProperty("--text-muted", tp.hint_color);
    if (tp.button_color) root.style.setProperty("--accent", tp.button_color);
  }

  function getInitData() {
    return tg?.initData || "";
  }

  async function apiRequest(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": getInitData(),
      ...options.headers,
    };
    const res = await fetch(`/api${path}`, { ...options, headers });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  }

  function showToast(msg) {
    let el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2500);
  }

  function navigate(view, pushHistory = true) {
    if (pushHistory && currentView !== view) {
      viewHistory.push(currentView);
    }

    currentView = view;
    $$(".view").forEach((v) => v.classList.remove("active"));
    const el = $(`#view-${view}`);
    if (el) el.classList.add("active");

    const meta = VIEWS[view] || VIEWS.home;
    $("#page-title").textContent = meta.title;
    $("#page-subtitle").textContent = meta.subtitle;
    $("#back-btn").classList.toggle("hidden", !meta.showBack);

    setupMainButton(view);
    handleHashRoute(view);
  }

  function goBack() {
    if (breathState.running) {
      stopBreathing();
    }
    const prev = viewHistory.pop() || "home";
    navigate(prev, false);
  }

  function setupMainButton(view) {
    if (!tg?.MainButton) return;
    tg.MainButton.hide();
    tg.MainButton.offClick();

    if (view === "breathe-active") {
      tg.MainButton.setText(breathState.running ? "Стоп" : "Начать");
      tg.MainButton.show();
      tg.MainButton.onClick(() => {
        if (breathState.running) stopBreathing();
        else startBreathing();
      });
    } else if (view === "grounding") {
      tg.MainButton.setText(groundingStep < 4 ? "Далее" : "Готово");
      tg.MainButton.show();
      tg.MainButton.onClick(handleGroundingNext);
    } else if (view === "journal") {
      tg.MainButton.setText("Сохранить");
      tg.MainButton.show();
      tg.MainButton.onClick(saveJournalEntry);
    }
  }

  function handleHashRoute(view) {
    if (view === "stats") loadStats();
    if (view === "journal") loadJournalEntries();
    if (view === "grounding") initGrounding();
  }

  /* Cloud Storage */
  async function cloudGet(key) {
    if (tg?.CloudStorage) {
      return new Promise((resolve) => {
        tg.CloudStorage.getItem(key, (err, value) => {
          resolve(err ? null : value);
        });
      });
    }
    return localStorage.getItem(key);
  }

  async function cloudSet(key, value) {
    if (tg?.CloudStorage) {
      return new Promise((resolve) => {
        tg.CloudStorage.setItem(key, value, () => resolve());
      });
    }
    localStorage.setItem(key, value);
  }

  async function loadJournalEntries() {
    const raw = await cloudGet("calmmind_journal");
    const entries = raw ? JSON.parse(raw) : [];
    const container = $("#journal-entries");

    if (entries.length === 0) {
      container.innerHTML = '<p class="chart-empty">Пока нет записей</p>';
      return;
    }

    container.innerHTML = entries
      .slice(0, 10)
      .map(
        (e) => `
      <div class="journal-entry">
        <div class="entry-header">
          <span class="entry-mood">${MOOD_EMOJI[e.score - 1]} ${e.score}/5</span>
          <span>${formatDate(e.timestamp)}</span>
        </div>
        ${e.thought ? `<p class="entry-thought">${escapeHtml(e.thought)}</p>` : ""}
        ${e.helped ? `<p class="entry-helped">✓ ${escapeHtml(e.helped)}</p>` : ""}
      </div>`
      )
      .join("");
  }

  async function saveJournalEntry() {
    const score = parseInt($("#journal-mood").value, 10);
    const thought = $("#journal-thought").value.trim();
    const helped = $("#journal-helped").value.trim();

    const entry = {
      score,
      thought,
      helped,
      timestamp: new Date().toISOString(),
    };

    const raw = await cloudGet("calmmind_journal");
    const entries = raw ? JSON.parse(raw) : [];
    entries.unshift(entry);
    await cloudSet("calmmind_journal", JSON.stringify(entries.slice(0, 50)));

    try {
      await apiRequest("/mood", {
        method: "POST",
        body: JSON.stringify({ score, note: thought, technique: helped }),
      });
    } catch {
      /* offline fallback — saved locally */
    }

    $("#journal-thought").value = "";
    $("#journal-helped").value = "";
    showToast("Запись сохранена 💙");
    loadJournalEntries();

    if (tg) {
      tg.HapticFeedback?.notificationOccurred("success");
    }
  }

  async function saveQuickMood(score) {
    $$("#quick-mood button").forEach((b) => b.classList.remove("selected"));
    $(`#quick-mood button[data-score="${score}"]`)?.classList.add("selected");

    try {
      const data = await apiRequest("/mood", {
        method: "POST",
        body: JSON.stringify({ score }),
      });
      showToast(data.recommendation || "Записано!");
    } catch {
      const raw = await cloudGet("calmmind_journal");
      const entries = raw ? JSON.parse(raw) : [];
      entries.unshift({ score, timestamp: new Date().toISOString() });
      await cloudSet("calmmind_journal", JSON.stringify(entries.slice(0, 50)));
      showToast("Сохранено локально");
    }

    if (tg) tg.HapticFeedback?.impactOccurred("light");
  }

  /* Breathing */
  function openBreathing(key) {
    if (key === "coherent" && !isPremium) {
      navigate("premium");
      return;
    }
    breathState.pattern = BREATH_PATTERNS[key];
    breathState.running = false;
    $("#breath-phase").textContent = "Готов?";
    $("#breath-counter").textContent = "";
    $("#breath-instruction").textContent = `${breathState.pattern.name} — нажми «Начать»`;
    $("#breathing-circle").className = "breathing-circle";
    navigate("breathe-active");
  }

  function startBreathing() {
    if (!breathState.pattern) return;
    breathState.running = true;
    breathState.startTime = Date.now();
    setupMainButton("breathe-active");
    runBreathCycle(0, 0);
  }

  function stopBreathing() {
    breathState.running = false;
    if (breathState.timer) clearTimeout(breathState.timer);

    const elapsed = Math.round((Date.now() - (breathState.startTime || Date.now())) / 1000);
    if (elapsed > 5 && breathState.pattern) {
      apiRequest("/breathing", {
        method: "POST",
        body: JSON.stringify({
          technique: breathState.pattern.name,
          durationSeconds: elapsed,
          completed: true,
        }),
      }).catch(() => {});
    }

    $("#breath-phase").textContent = "Готово!";
    $("#breath-counter").textContent = "✓";
    $("#breathing-circle").className = "breathing-circle";
    setupMainButton("breathe-active");

    if (tg) {
      tg.HapticFeedback?.notificationOccurred("success");
      tg.MainButton.setText("Готово");
    }
  }

  function runBreathCycle(cycle, phaseIdx) {
    if (!breathState.running) return;

    const pattern = breathState.pattern;
    if (cycle >= pattern.cycles) {
      stopBreathing();
      return;
    }

    const phase = pattern.phases[phaseIdx];
    const circle = $("#breathing-circle");
    circle.className = `breathing-circle ${phase.type}`;

    $("#breath-phase").textContent = phase.label;
    $("#breath-counter").textContent = phase.duration;
    $("#breath-instruction").textContent = `Цикл ${cycle + 1} из ${pattern.cycles}`;

    if (breathState.vibrateOn && tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(phase.type === "inhale" ? "medium" : "light");
    }

    let countdown = phase.duration;
    const tick = () => {
      if (!breathState.running) return;
      $("#breath-counter").textContent = countdown;
      if (countdown <= 0) {
        const nextPhase = phaseIdx + 1;
        if (nextPhase >= pattern.phases.length) {
          runBreathCycle(cycle + 1, 0);
        } else {
          runBreathCycle(cycle, nextPhase);
        }
        return;
      }
      countdown--;
      breathState.timer = setTimeout(tick, 1000);
    };
    tick();
  }

  /* Grounding */
  function initGrounding() {
    groundingStep = 0;
    updateGroundingUI();
    setupMainButton("grounding");
  }

  function updateGroundingUI() {
    $$(".grounding-step").forEach((s, i) => {
      s.classList.toggle("active", i === groundingStep);
    });

    const dots = $("#grounding-dots");
    dots.innerHTML = Array.from({ length: 5 }, (_, i) =>
      `<span class="dot ${i === groundingStep ? "active" : ""}"></span>`
    ).join("");

    setupMainButton("grounding");
  }

  function handleGroundingNext() {
    if (groundingStep < 4) {
      groundingStep++;
      updateGroundingUI();
      if (tg) tg.HapticFeedback?.impactOccurred("light");
    } else {
      showToast("Отлично! Ты в настоящем моменте 🌍");
      apiRequest("/breathing", {
        method: "POST",
        body: JSON.stringify({ technique: "Заземление 5-4-3-2-1", durationSeconds: 120, completed: true }),
      }).catch(() => {});
      navigate("home");
    }
  }

  /* Stats */
  async function loadStats() {
    try {
      const data = await apiRequest("/stats");
      isPremium = data.isPremium;
      $("#stat-avg").textContent = data.avgMood || "—";
      $("#stat-sessions").textContent = data.totalSessions;
      $("#recommendation-text").textContent = data.recommendation;

      const chart = $("#mood-chart");
      if (data.moodTrend?.length > 0) {
        const max = 5;
        chart.innerHTML = `<div class="chart-bars">${data.moodTrend
          .map(
            (s) =>
              `<div class="chart-bar" style="height:${(s / max) * 100}%" data-emoji="${MOOD_EMOJI[s - 1]}"></div>`
          )
          .join("")}</div>`;
      }
    } catch {
      $("#recommendation-text").textContent = "Открой через бота для синхронизации";
    }
  }

  /* Utils */
  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function parseHash() {
    const hash = location.hash.replace("#", "");
    const map = {
      "breathe-478": () => openBreathing("478"),
      "breathe-box": () => openBreathing("box"),
      breathe: () => navigate("breathe"),
      grounding: () => navigate("grounding"),
      journal: () => navigate("journal"),
      techniques: () => navigate("techniques"),
      stats: () => navigate("stats"),
      premium: () => navigate("premium"),
    };
    if (map[hash]) map[hash]();
  }

  /* Event listeners */
  function init() {
    $("#back-btn")?.addEventListener("click", goBack);

    $$(".nav-card").forEach((card) => {
      card.addEventListener("click", () => navigate(card.dataset.nav));
    });

    $("#sos-banner")?.addEventListener("click", () => openBreathing("478"));

    $$(".technique-card").forEach((card) => {
      card.addEventListener("click", () => openBreathing(card.dataset.breathe));
    });

    $$("#quick-mood button").forEach((btn) => {
      btn.addEventListener("click", () => saveQuickMood(parseInt(btn.dataset.score, 10)));
    });

    $("#journal-mood")?.addEventListener("input", (e) => {
      const v = e.target.value;
      $("#journal-mood-label").textContent = `${MOOD_EMOJI[v - 1]} ${v}`;
    });

    $("#breath-vibrate")?.addEventListener("click", (e) => {
      breathState.vibrateOn = !breathState.vibrateOn;
      e.target.classList.toggle("active", breathState.vibrateOn);
    });

    $("#breath-sound")?.addEventListener("click", (e) => {
      breathState.soundOn = !breathState.soundOn;
      e.target.classList.toggle("active", breathState.soundOn);
    });

    if (tg?.BackButton) {
      tg.BackButton.onClick(goBack);
    }

    parseHash();
    window.addEventListener("hashchange", parseHash);

    apiRequest("/profile")
      .then((p) => { isPremium = p.isPremium; })
      .catch(() => {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
