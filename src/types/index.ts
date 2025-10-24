// ユーザー型
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'husband' | 'wife';
  points: number;
  partnerId?: string;
}

// 習慣型
export interface Habit {
  id: string;
  title: string;
  description?: string;
  points: number;
  category: 'health' | 'exercise' | 'household' | 'other';
  frequency: 'daily' | 'weekly' | 'monthly';
  completionType: 'both' | 'either'; // 両方達成 or どちらか達成
  createdBy: string;
  createdAt: Date;
  notificationTime?: string;
  weekday?: number; // 週間習慣の場合（0=日曜, 6=土曜）
  isActive: boolean;
}

// 習慣完了記録型
export interface HabitCompletion {
  id: string;
  habitId: string;
  userId: string;
  completedAt: Date;
  date: string; // YYYY-MM-DD形式
}

// デイリーステータス型（今日の状態）
export interface DailyHabitStatus {
  habitId: string;
  habit: Habit;
  husbandCompleted: boolean;
  wifeCompleted: boolean;
  isFullyCompleted: boolean;
  streak: number; // 連続達成日数
}

// ご褒美型
export interface Reward {
  id: string;
  title: string;
  description?: string;
  requiredPoints: number;
  type: 'individual' | 'combined'; // 個人ポイント or 合算ポイント
  icon?: string;
  isReserved: boolean;
  reservedBy?: string; // 予約したユーザーID
  createdAt: Date;
  claimedAt?: Date;
  claimedBy?: string;
}

// 統計データ型
export interface Statistics {
  userId: string;
  weeklyCompletionRate: number;
  monthlyCompletionRate: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
}

// 通知型
export interface Notification {
  id: string;
  userId: string;
  type: 'habit_completed' | 'streak_milestone' | 'encouragement';
  message: string;
  relatedHabitId?: string;
  createdAt: Date;
  isRead: boolean;
}
