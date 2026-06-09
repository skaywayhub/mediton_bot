import { Router, Request, Response } from "express";
import { validateWebAppInitData } from "./auth";
import { config } from "./config";
import {
  addBreathingSession,
  addMoodEntry,
  getMoodRecommendation,
  getOrCreateUser,
  getWeekStats,
  isPremiumActive,
} from "./storage";

const router = Router();

function getUserFromRequest(req: Request): number | null {
  const initData =
    (req.headers["x-telegram-init-data"] as string) ||
    (req.body?.initData as string) ||
    (req.query.initData as string);

  if (!initData) return null;

  const validated = validateWebAppInitData(initData, config.botToken);
  return validated?.user.id ?? null;
}

function requireAuth(req: Request, res: Response): number | null {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Invalid or missing init data" });
    return null;
  }
  return userId;
}

router.post("/mood", (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { score, note, technique } = req.body;
  if (!score || score < 1 || score > 5) {
    res.status(400).json({ error: "Score must be between 1 and 5" });
    return;
  }

  getOrCreateUser(userId);
  const entry = {
    id: `${Date.now()}-${userId}`,
    userId,
    score: Number(score),
    note: note || undefined,
    technique: technique || undefined,
    timestamp: new Date().toISOString(),
  };

  addMoodEntry(entry);
  const recommendation = getMoodRecommendation(userId);

  res.json({ success: true, entry, recommendation });
});

router.post("/breathing", (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { technique, durationSeconds, completed } = req.body;
  if (!technique) {
    res.status(400).json({ error: "Technique is required" });
    return;
  }

  getOrCreateUser(userId);
  const session = {
    id: `${Date.now()}-${userId}`,
    userId,
    technique,
    durationSeconds: Number(durationSeconds) || 0,
    completed: Boolean(completed),
    timestamp: new Date().toISOString(),
  };

  addBreathingSession(session);
  res.json({ success: true, session });
});

router.get("/stats", (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  getOrCreateUser(userId);
  const stats = getWeekStats(userId);
  const premium = isPremiumActive(userId);

  res.json({
    ...stats,
    isPremium: premium,
    recommendation: getMoodRecommendation(userId),
  });
});

router.get("/profile", (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const user = getOrCreateUser(userId);
  res.json({
    isPremium: isPremiumActive(userId),
    premiumExpiresAt: user.profile.premiumExpiresAt,
    moodCount: user.moods.length,
    sessionCount: user.breathingSessions.length,
  });
});

export default router;
