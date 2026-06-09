import fs from "fs";
import path from "path";
import type { BreathingSession, MoodEntry, UserData, UserProfile } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

type UsersStore = Record<string, UserData>;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStore(): UsersStore {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8")) as UsersStore;
  } catch {
    return {};
  }
}

function saveStore(store: UsersStore): void {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function createDefaultProfile(userId: number, username?: string, firstName?: string): UserProfile {
  const now = new Date().toISOString();
  return {
    userId,
    username,
    firstName,
    isPremium: false,
    createdAt: now,
    lastActiveAt: now,
  };
}

export function getOrCreateUser(userId: number, username?: string, firstName?: string): UserData {
  const store = loadStore();
  const key = String(userId);

  if (!store[key]) {
    store[key] = {
      profile: createDefaultProfile(userId, username, firstName),
      moods: [],
      breathingSessions: [],
    };
    saveStore(store);
  } else {
    store[key].profile.lastActiveAt = new Date().toISOString();
    if (username) store[key].profile.username = username;
    if (firstName) store[key].profile.firstName = firstName;
    saveStore(store);
  }

  return store[key];
}

export function addMoodEntry(entry: MoodEntry): void {
  const store = loadStore();
  const key = String(entry.userId);
  if (!store[key]) return;

  store[key].moods.push(entry);
  if (store[key].moods.length > 365) {
    store[key].moods = store[key].moods.slice(-365);
  }
  saveStore(store);
}

export function addBreathingSession(session: BreathingSession): void {
  const store = loadStore();
  const key = String(session.userId);
  if (!store[key]) return;

  store[key].breathingSessions.push(session);
  if (store[key].breathingSessions.length > 200) {
    store[key].breathingSessions = store[key].breathingSessions.slice(-200);
  }
  saveStore(store);
}

export function activatePremium(userId: number, months = 1): void {
  const store = loadStore();
  const key = String(userId);
  if (!store[key]) return;

  const now = new Date();
  const currentExpiry = store[key].profile.premiumExpiresAt
    ? new Date(store[key].profile.premiumExpiresAt!)
    : now;

  const base = currentExpiry > now ? currentExpiry : now;
  base.setMonth(base.getMonth() + months);

  store[key].profile.isPremium = true;
  store[key].profile.premiumExpiresAt = base.toISOString();
  saveStore(store);
}

export function isPremiumActive(userId: number): boolean {
  const store = loadStore();
  const user = store[String(userId)];
  if (!user?.profile.isPremium) return false;

  if (user.profile.premiumExpiresAt) {
    return new Date(user.profile.premiumExpiresAt) > new Date();
  }
  return user.profile.isPremium;
}

export function getWeekMoods(userId: number): MoodEntry[] {
  const store = loadStore();
  const user = store[String(userId)];
  if (!user) return [];

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return user.moods.filter((m) => new Date(m.timestamp).getTime() >= weekAgo);
}

export function getWeekStats(userId: number): {
  avgMood: number;
  totalSessions: number;
  moodTrend: number[];
  topTechnique: string | null;
} {
  const store = loadStore();
  const user = store[String(userId)];
  if (!user) {
    return { avgMood: 0, totalSessions: 0, moodTrend: [], topTechnique: null };
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekMoods = user.moods.filter((m) => new Date(m.timestamp).getTime() >= weekAgo);
  const weekSessions = user.breathingSessions.filter(
    (s) => new Date(s.timestamp).getTime() >= weekAgo && s.completed
  );

  const avgMood =
    weekMoods.length > 0
      ? weekMoods.reduce((sum, m) => sum + m.score, 0) / weekMoods.length
      : 0;

  const techniqueCounts: Record<string, number> = {};
  for (const s of weekSessions) {
    techniqueCounts[s.technique] = (techniqueCounts[s.technique] || 0) + 1;
  }
  const topTechnique =
    Object.entries(techniqueCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const moodTrend = weekMoods.slice(-7).map((m) => m.score);

  return {
    avgMood: Math.round(avgMood * 10) / 10,
    totalSessions: weekSessions.length,
    moodTrend,
    topTechnique,
  };
}

export function getMoodRecommendation(userId: number): string {
  const stats = getWeekStats(userId);
  const user = loadStore()[String(userId)];

  if (!user || user.moods.length === 0) {
    return "Начни с дыхательного упражнения 4-7-8 — оно помогает быстро снизить тревогу.";
  }

  if (stats.avgMood < 2.5) {
    return "Твой уровень тревоги повышен. Попробуй технику заземления 5-4-3-2-1 или дыхание 4-7-8.";
  }

  if (stats.avgMood < 3.5) {
    return "Стабильное состояние. Рекомендую коробочное дыхание 4-4-4-4 для профилактики.";
  }

  if (stats.topTechnique) {
    return `Тебе хорошо помогает «${stats.topTechnique}». Продолжай практику для закрепления эффекта.`;
  }

  return "Отличный прогресс! Попробуй ведение дневника мыслей — это укрепляет навыки КПТ.";
}
