import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Habit, HabitCompletion, DailyHabitStatus } from '../types';

// 習慣を作成
export const createHabit = async (habit: Omit<Habit, 'id' | 'createdAt'>) => {
  const habitData = {
    ...habit,
    createdAt: Timestamp.now(),
  };
  const docRef = await addDoc(collection(db, 'habits'), habitData);
  return docRef.id;
};

// すべての習慣を取得
export const getHabits = async (): Promise<Habit[]> => {
  const q = query(collection(db, 'habits'), where('isActive', '==', true));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as Habit[];
};

// 習慣を更新
export const updateHabit = async (habitId: string, updates: Partial<Habit>) => {
  const habitRef = doc(db, 'habits', habitId);
  await updateDoc(habitRef, updates);
};

// 習慣を削除（論理削除）
export const deleteHabit = async (habitId: string) => {
  const habitRef = doc(db, 'habits', habitId);
  await updateDoc(habitRef, { isActive: false });
};

// 習慣を完了としてマーク
export const completeHabit = async (habitId: string, userId: string) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // 既に完了済みかチェック
  const q = query(
    collection(db, 'habitCompletions'),
    where('habitId', '==', habitId),
    where('userId', '==', userId),
    where('date', '==', today)
  );
  const existing = await getDocs(q);
  
  if (existing.empty) {
    await addDoc(collection(db, 'habitCompletions'), {
      habitId,
      userId,
      completedAt: Timestamp.now(),
      date: today,
    });
    return true;
  }
  return false; // 既に完了済み
};

// 習慣の完了をキャンセル
export const uncompleteHabit = async (habitId: string, userId: string) => {
  const today = new Date().toISOString().split('T')[0];
  
  const q = query(
    collection(db, 'habitCompletions'),
    where('habitId', '==', habitId),
    where('userId', '==', userId),
    where('date', '==', today)
  );
  const querySnapshot = await getDocs(q);
  
  querySnapshot.forEach(async (document) => {
    await deleteDoc(doc(db, 'habitCompletions', document.id));
  });
};

// 今日の習慣ステータスを取得
export const getTodayHabitStatuses = async (
  husbandId: string,
  wifeId: string
): Promise<DailyHabitStatus[]> => {
  const habits = await getHabits();
  const today = new Date().toISOString().split('T')[0];
  
  // 今日の完了記録を取得
  const q = query(
    collection(db, 'habitCompletions'),
    where('date', '==', today)
  );
  const completions = await getDocs(q);
  
  const completionMap: { [key: string]: Set<string> } = {};
  completions.forEach(doc => {
    const data = doc.data();
    if (!completionMap[data.habitId]) {
      completionMap[data.habitId] = new Set();
    }
    completionMap[data.habitId].add(data.userId);
  });
  
  // 今日表示すべき習慣をフィルタ
  const todayHabits = habits.filter(habit => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly') {
      const todayWeekday = new Date().getDay();
      return habit.weekday === todayWeekday;
    }
    // 月間習慣は別途実装
    return false;
  });
  
  // ステータスを作成
  const statuses: DailyHabitStatus[] = await Promise.all(
    todayHabits.map(async habit => {
      const completedUsers = completionMap[habit.id] || new Set();
      const husbandCompleted = completedUsers.has(husbandId);
      const wifeCompleted = completedUsers.has(wifeId);
      
      let isFullyCompleted = false;
      if (habit.completionType === 'both') {
        isFullyCompleted = husbandCompleted && wifeCompleted;
      } else {
        isFullyCompleted = husbandCompleted || wifeCompleted;
      }
      
      // 連続達成日数を計算
      const streak = await calculateStreak(habit.id, husbandId, wifeId);
      
      return {
        habitId: habit.id,
        habit,
        husbandCompleted,
        wifeCompleted,
        isFullyCompleted,
        streak,
      };
    })
  );
  
  return statuses;
};

// 連続達成日数を計算
const calculateStreak = async (
  habitId: string,
  husbandId: string,
  wifeId: string
): Promise<number> => {
  // 過去30日分の完了記録を取得
  const q = query(
    collection(db, 'habitCompletions'),
    where('habitId', '==', habitId),
    orderBy('date', 'desc')
  );
  const completions = await getDocs(q);
  
  const habitDoc = await getDoc(doc(db, 'habits', habitId));
  if (!habitDoc.exists()) return 0;
  
  const habit = habitDoc.data() as Habit;
  
  // 日付ごとに完了ユーザーをまとめる
  const dateMap: { [key: string]: Set<string> } = {};
  completions.forEach(doc => {
    const data = doc.data();
    if (!dateMap[data.date]) {
      dateMap[data.date] = new Set();
    }
    dateMap[data.date].add(data.userId);
  });
  
  // 連続達成日数をカウント
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    const completedUsers = dateMap[dateStr] || new Set();
    
    let isDayCompleted = false;
    if (habit.completionType === 'both') {
      isDayCompleted = completedUsers.has(husbandId) && completedUsers.has(wifeId);
    } else {
      isDayCompleted = completedUsers.has(husbandId) || completedUsers.has(wifeId);
    }
    
    if (isDayCompleted) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

// ポイントを更新
export const updateUserPoints = async (userId: string, points: number) => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    const currentPoints = userDoc.data().points || 0;
    await updateDoc(userRef, {
      points: currentPoints + points,
    });
  }
};
