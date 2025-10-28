import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Habit, HabitCompletion, Reward, User } from '@/lib/types';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [partnerUser, setPartnerUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'habits' | 'rewards'>('habits');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const habitsQuery = query(collection(db, 'habits'), where('isActive', '==', true));
    const habitsSnap = await getDocs(habitsQuery);
    const habitsData = habitsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Habit[];
    setHabits(habitsData);

    const completionsQuery = query(
      collection(db, 'habitCompletions'),
      where('date', '==', today)
    );
    const completionsSnap = await getDocs(completionsQuery);
    const completionsData = completionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      completedAt: doc.data().completedAt?.toDate(),
    })) as HabitCompletion[];
    setCompletions(completionsData);

    const rewardsQuery = query(collection(db, 'rewards'));
    const rewardsSnap = await getDocs(rewardsQuery);
    const rewardsData = rewardsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      reservedAt: doc.data().reservedAt?.toDate(),
      redeemedAt: doc.data().redeemedAt?.toDate(),
    })) as Reward[];
    setRewards(rewardsData);

    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', user.role === 'husband' ? 'wife' : 'husband')
    );
    const usersSnap = await getDocs(usersQuery);
    if (!usersSnap.empty) {
      const partnerData = {
        uid: usersSnap.docs[0].id,
        ...usersSnap.docs[0].data(),
        createdAt: usersSnap.docs[0].data().createdAt?.toDate(),
      } as User;
      setPartnerUser(partnerData);
    }
  };

  const handleCompleteHabit = async (habit: Habit) => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const alreadyCompleted = completions.some(
      c => c.habitId === habit.id && c.userId === user.uid
    );

    if (alreadyCompleted) {
      alert('今日はすでに完了しています！');
      return;
    }

    await addDoc(collection(db, 'habitCompletions'), {
      habitId: habit.id,
      userId: user.uid,
      completedAt: new Date(),
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
      await updateDoc(doc(db, 'users', user.uid), {
        points: increment(habit.points),
      });
      
      if (habit.completionCondition === 'both' && partnerUser) {
        await updateDoc(doc(db, 'users', partnerUser.uid), {
          points: increment(habit.points),
        });
      }
    }

    loadData();
  };

  const handleReserveReward = async (reward: Reward) => {
    if (!user) return;

    if (reward.pointType === 'individual' && user.points < reward.pointCost) {
      alert('ポイントが足りません！');
      return;
    }

    if (reward.pointType === 'combined') {
      const totalPoints = user.points + (partnerUser?.points || 0);
      if (totalPoints < reward.pointCost) {
        alert('二人のポイント合計が足りません！');
        return;
      }
    }

    await updateDoc(doc(db, 'rewards', reward.id), {
      isReserved: true,
      reservedBy: user.uid,
      reservedAt: new Date(),
    });

    loadData();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  if (!user) {
    return null;
  }

  const todayHabits = habits.filter(habit => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly') {
      const today = new Date().getDay();
      return habit.weeklyDays?.includes(today);
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">夫婦習慣トラッカー</h1>
            <p className="text-sm text-gray-600">{user.displayName}さん</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">ポイント</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">あなた</p>
              <p className="text-3xl font-bold text-blue-600">{user.points}pt</p>
            </div>
            <div className="bg-pink-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">パートナー</p>
              <p className="text-3xl font-bold text-pink-600">{partnerUser?.points || 0}pt</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('habits')}
              className={`flex-1 py-4 font-semibold transition ${
                activeTab === 'habits'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              今日の習慣
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`flex-1 py-4 font-semibold transition ${
                activeTab === 'rewards'
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              ご褒美
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'habits' && (
              <div className="space-y-4">
                {todayHabits.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">今日の習慣はありません</p>
                ) : (
                  todayHabits.map(habit => {
                    const myCompletion = completions.find(
                      c => c.habitId === habit.id && c.userId === user.uid
                    );
                    const partnerCompletion = completions.find(
                      c => c.habitId === habit.id && c.userId !== user.uid
                    );

                    return (
                      <div
                        key={habit.id}
                        className="border rounded-lg p-4 hover:shadow-md transition"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">{habit.title}</h3>
                            {habit.description && (
                              <p className="text-sm text-gray-600 mt-1">{habit.description}</p>
                            )}
                          </div>
                          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                            {habit.points}pt
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-sm ${
                                myCompletion
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {myCompletion ? '✓ 完了' : '未完了'}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-sm ${
                                partnerCompletion
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {partnerCompletion ? '✓ パートナー完了' : 'パートナー未完了'}
                            </span>
                          </div>

                          {!myCompletion && (
                            <button
                              onClick={() => handleCompleteHabit(habit)}
                              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition font-semibold"
                            >
                              完了
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'rewards' && (
              <div className="space-y-4">
                {rewards.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">ご褒美がまだありません</p>
                ) : (
                  rewards.map(reward => (
                    <div
                      key={reward.id}
                      className={`border rounded-lg p-4 ${
                        reward.isReserved ? 'bg-gray-50' : 'hover:shadow-md'
                      } transition`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{reward.title}</h3>
                          {reward.description && (
                            <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                            {reward.pointCost}pt
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {reward.pointType === 'individual' ? '個人' : '合算'}
                          </p>
                        </div>
                      </div>

                      {reward.isReserved ? (
                        <div className="mt-4 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg text-sm">
                          予約済み
                        </div>
                      ) : (
                        <button
                          onClick={() => handleReserveReward(reward)}
                          className="mt-4 w-full bg-pink-500 text-white py-2 rounded-lg hover:bg-pink-600 transition font-semibold"
                        >
                          予約する
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
