export interface MoodEntry {
  id: string;
  userId: number;
  score: number;
  note?: string;
  technique?: string;
  timestamp: string;
}

export interface BreathingSession {
  id: string;
  userId: number;
  technique: string;
  durationSeconds: number;
  completed: boolean;
  timestamp: string;
}

export interface UserProfile {
  userId: number;
  username?: string;
  firstName?: string;
  timezoneOffset?: number;
  isPremium: boolean;
  premiumExpiresAt?: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface UserData {
  profile: UserProfile;
  moods: MoodEntry[];
  breathingSessions: BreathingSession[];
}
