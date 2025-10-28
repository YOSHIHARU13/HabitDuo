'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Habit, HabitCompletion, Reward, User } from '@/lib/types';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [partnerUser, setPartnerUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<User | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.uid) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // 現在のユーザーデータを取得
      const currentUserQuery = query(collection(db, 'users'), where('uid', '==', user.uid));
      const currentUserSnap = await getDocs(currentUserQuery);
      if (!currentUserSnap.empty) {
        const currentUserData = {
          uid: currentUserSnap.docs[0].id,
          ...currentUserSnap.docs[0].data(),
          createdAt: currentUserSnap.docs[0].data().createdAt?.toDate(),
        } as User;
        setUserData(currentUserData);

        // パートナーを取得
        if (currentUserData.role) {
          const partnerRole = currentUserData.role === 'husband' ? 'wife' : 'husband';
          const partnerQuery = query(collection(db, 'users'), where('role', '==', partnerRole));
          const partnerSnap = await getDocs(partnerQuery);
          if (!partnerSnap.empty) {
            const partnerData = {
              uid: partnerSnap.docs[0].id,
              ...partnerSnap.docs[0].data(),
              createdAt: partnerSnap.docs[0].data().createdAt?.toDate(),
            } as User;
            setPartnerUser(partnerData);
          }
        }
      }

      // 習慣を取得
      const habitsQuery = query(collection(db, 'habits'), where('isActive', '==', true));
      const habitsSnap = await getDocs(habitsQuery);
      const habitsData = habitsSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate(),
      })) as Habit[];
      setHabits(habitsData);

      // 今日の完了記録を取得
      const completionsQuery = query(
        collection(db, 'habitCompletions'),
        where('date', '==', today)
      );
      const completionsSnap = await getDocs(completionsQuery);
      const completionsData = completionsSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        completedAt: d.data().completedAt?.toDate(),
      })) as HabitCompletion[];
      setCompletions(completionsData);

      // ご褒美を取得
      const rewardsQuery = query(collection(db, 'rewards'));
      const rewardsSnap = await getDocs(rewardsQuery);
      const rewardsData = rewardsSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate(),
        reservedAt: d.data().reservedAt?.toDate(),
        redeemedAt: d.data().redeemedAt?.toDate(),
      })) as Reward[];
      setRewards(rewardsData);
    } catch (error) {
      console.error('エラー:', error);
    }
  };

  const handleCompleteHabit = async (habit: Habit) => {
    if (!user || !userData) return;

    const today = new Date().toISOString().split('T')[0];
    const alreadyCompleted = completions.some(
      c => c.habitId === habit.id && c.userId === user.uid
    );

    if (alreadyCompleted) {
      alert('今日はすでに完了しています！');
      return;
    }

    try {
      await addDoc(collection(db, 'habitCompletions'), {
        habitId: habit.id,
        userId: user.uid,
        completedAt: Timestamp.now(),
        date: today,
      });

      const partnerCompleted = completions.some(
        c => c.habitId === habit.id && c.userId !== user.uid
      );

      let shouldAwardPoints = false;
      if (habit.completionCondition === 'either') {
        shouldAwardPoints = true;
      } else if (habit.completionCondition === 'both' && partnerCompleted) {
        shouldAwardPoints = true;
      }

      if (shouldAwardPoints) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          points: increment(habit.points),
        });

        if (habit.completionCondition === 'both' && partnerUser) {
          const partnerRef = doc(db, 'users', partnerUser.uid);
          await updateDoc(partnerRef, {
            points: increment(habit.points),
          });
        }
      }

      window.location.reload();
    } catch (error) {
      console.error('エラー:', error);
      alert('処理に失敗しました');
    }
  };

  const handleReserveReward = async (reward: Reward) => {
    if (!user || !userData) return;

    try {
      if (reward.pointType === 'individual' && userData.points < reward.pointCost) {
        alert('ポイントが足りません！');
        return;
      }

      if (reward.pointType === 'combined') {
        const totalPoints = userData.points + (partnerUser?.points || 0);
        if (totalPoints < reward.pointCost) {
          alert('二人のポイント合計が足りません！');
          return;
        }
      }

      await updateDoc(doc(db, 'rewards', reward.id), {
        isReserved: true,
        reservedBy: user.uid,
        reservedAt: Timestamp.now(),
      });

      alert('予約しました！');
      await loadData();
    } catch (error) {
      console.error('エラー:', error);
      alert('予約に失敗しました');
    }
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const todayHabits = habits.filter(habit => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly') {
      const today = new Date().getDay();
      return habit.weeklyDays?.includes(today);
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* ヘッダー */}
      <div className="bg-white/70 backdrop-blur-lg shadow-2xl border-b border-purple-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                ✨ 夫婦習慣トラッカー
              </h1>
              <p className="text-lg text-gray-600 font-medium">
                {user.displayName}さん、お疲れ様です！
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/manage')}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                ⚙️ 管理
              </button>
              <button
                onClick={logout}
                className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ポイント表示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative z-10">
              <p className="text-white/90 text-lg font-semibold mb-2">👤 あなた</p>
              <p className="text-white text-7xl font-black mb-2">{userData.points || 0}</p>
              <p className="text-white/90 text-2xl font-bold">ポイント</p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-rose-600 to-red-700 rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative z-10">
              <p className="text-white/90 text-lg font-semibold mb-2">💕 パートナー</p>
              <p className="text-white text-7xl font-black mb-2">{partnerUser?.points || 0}</p>
              <p className="text-white/90 text-2xl font-bold">ポイント</p>
            </div>
          </div>
        </div>

        {/* 今日の習慣 */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-purple-100">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-6">
            <h2 className="text-3xl font-black text-white">✅ 今日の習慣</h2>
          </div>
          
          <div className="p-8">
            {todayHabits.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-2xl text-gray-400 font-semibold mb-6">今日の習慣はありません</p>
                <button
                  onClick={() => router.push('/manage')}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  習慣を追加する
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {todayHabits.map(habit => {
                  const myCompletion = completions.find(
                    c => c.habitId === habit.id && c.userId === user.uid
                  );
                  const partnerCompletion = completions.find(
                    c => c.habitId === habit.id && c.userId !== user.uid
                  );

                  return (
                    <div
                      key={habit.id}
                      className="relative overflow-hidden bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border-2 border-purple-100"
                    >
                      <div className="p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                          <div className="flex-1">
                            <h3 className="text-2xl font-black text-gray-800 mb-2">
                              {habit.title}
                            </h3>
                            {habit.description && (
                              <p className="text-gray-600 text-lg">{habit.description}</p>
                            )}
                          </div>
                          <div className="shrink-0">
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-xl text-xl font-black shadow-lg">
                              +{habit.points}pt
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 mb-4">
                          <div
                            className={`px-6 py-3 rounded-xl text-base font-bold shadow-md ${
                              myCompletion
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {myCompletion ? '✓ 完了済み' : '未完了'}
                          </div>
                          <div
                            className={`px-6 py-3 rounded-xl text-base font-bold shadow-md ${
                              partnerCompletion
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {partnerCompletion ? '✓ パートナー完了' : 'パートナー未完了'}
                          </div>
                        </div>

                        {!myCompletion && (
                          <button
                            onClick={() => handleCompleteHabit(habit)}
                            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-200"
                          >
                            完了する 🎉
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ご褒美 */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-purple-100">
          <div className="bg-gradient-to-r from-pink-600 to-rose-600 px-8 py-6">
            <h2 className="text-3xl font-black text-white">🎁 ご褒美</h2>
          </div>
          
          <div className="p-8">
            {rewards.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🎁</div>
                <p className="text-2xl text-gray-400 font-semibold mb-6">ご褒美がまだありません</p>
                <button
                  onClick={() => router.push('/manage')}
                  className="px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  ご褒美を追加する
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {rewards.map(reward => (
                  <div
                    key={reward.id}
                    className={`relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border-2 ${
                      reward.isReserved
                        ? 'bg-gray-100 border-gray-300'
                        : 'bg-gradient-to-br from-white to-pink-50 border-pink-200'
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-black text-gray-800 mb-2">
                            {reward.title}
                          </h3>
                          {reward.description && (
                            <p className="text-gray-600 text-lg">{reward.description}</p>
                          )}
                          <p className="text-sm text-gray-500 mt-2 font-medium">
                            {reward.pointType === 'individual' ? '個人ポイント' : '合算ポイント'}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-xl text-xl font-black shadow-lg">
                            {reward.pointCost}pt
                          </div>
                        </div>
                      </div>

                      {reward.isReserved ? (
                        <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-300 text-amber-900 px-6 py-4 rounded-2xl text-lg font-bold text-center">
                          ✓ 予約済み
                        </div>
                      ) : (
                        <button
                          onClick={() => handleReserveReward(reward)}
                          className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 hover:from-pink-600 hover:via-rose-600 hover:to-red-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-200"
                        >
                          予約する 🎉
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
