export type UserRole = 'husband' | 'wife';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  points: number;
  createdAt: Date;
}

export type HabitFrequency = 'daily' | 'weekly';
export type CompletionCondition = 'both' | 'either';

export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: HabitFrequency;
  points: number;
  completionCondition: CompletionCondition;
  weeklyDays?: number[]; // 0-6 (日曜日=0)
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  userId: string;
  completedAt: Date;
  date: string; // YYYY-MM-DD
}

export interface Reward {
  id: string;
  title: string;
  description?: string;
  pointCost: number;
  pointType: 'individual' | 'combined';
  isReserved: boolean;
  reservedBy?: string;
  reservedAt?: Date;
  redeemedBy?: string;
  redeemedAt?: Date;
  createdAt: Date;
  createdBy: string;
}

export interface StreakData {
  habitId: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string; // YYYY-MM-DD
}
