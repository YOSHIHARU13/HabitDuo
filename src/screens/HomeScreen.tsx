import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { DailyHabitStatus } from '../types';
import {
  getTodayHabitStatuses,
  completeHabit,
  uncompleteHabit,
  updateUserPoints,
} from '../services/habitService';

export default function HomeScreen() {
  const { currentUser, partner } = useAuth();
  const [habitStatuses, setHabitStatuses] = useState<DailyHabitStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [todayPoints, setTodayPoints] = useState(0);

  const loadHabits = async () => {
    if (!currentUser || !partner) return;
    
    const husbandId = currentUser.role === 'husband' ? currentUser.id : partner.id;
    const wifeId = currentUser.role === 'wife' ? currentUser.id : partner.id;
    
    const statuses = await getTodayHabitStatuses(husbandId, wifeId);
    setHabitStatuses(statuses);
    
    // 今日獲得したポイントを計算
    const points = statuses
      .filter(s => s.isFullyCompleted)
      .reduce((sum, s) => sum + s.habit.points, 0);
    setTodayPoints(points);
  };

  useEffect(() => {
    loadHabits();
  }, [currentUser, partner]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHabits();
    setRefreshing(false);
  };

  const handleToggleComplete = async (status: DailyHabitStatus) => {
    if (!currentUser || !partner) return;
    
    const isCurrentUserCompleted = 
      currentUser.role === 'husband' 
        ? status.husbandCompleted 
        : status.wifeCompleted;
    
    try {
      if (isCurrentUserCompleted) {
        // 完了をキャンセル
        await uncompleteHabit(status.habitId, currentUser.id);
        
        // もし完全達成済みだった場合、ポイントを戻す
        if (status.isFullyCompleted) {
          await updateUserPoints(currentUser.id, -status.habit.points);
        }
      } else {
        // 完了としてマーク
        await completeHabit(status.habitId, currentUser.id);
        
        // 完全達成になった場合、ポイントを付与
        const willBeFullyCompleted = 
          status.habit.completionType === 'either' ||
          (status.habit.completionType === 'both' && 
           (currentUser.role === 'husband' ? status.wifeCompleted : status.husbandCompleted));
        
        if (willBeFullyCompleted) {
          await updateUserPoints(currentUser.id, status.habit.points);
        }
      }
      
      await loadHabits();
    } catch (error) {
      Alert.alert('エラー', '操作に失敗しました');
      console.error(error);
    }
  };

  const getCompletionIcon = (status: DailyHabitStatus) => {
    if (currentUser?.role === 'husband') {
      return status.husbandCompleted ? '✅' : '⏳';
    } else {
      return status.wifeCompleted ? '✅' : '⏳';
    }
  };

  const getPartnerIcon = (status: DailyHabitStatus) => {
    if (currentUser?.role === 'husband') {
      return status.wifeCompleted ? '✅' : '⏳';
    } else {
      return status.husbandCompleted ? '✅' : '⏳';
    }
  };

  const formatDate = () => {
    const date = new Date();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    
    return `${year}/${month}/${day} (${weekday})`;
  };

  const getWeeklyCompletionRate = () => {
    // 簡易計算（今日のデータから）
    if (habitStatuses.length === 0) return 0;
    const completed = habitStatuses.filter(s => s.isFullyCompleted).length;
    return Math.round((completed / habitStatuses.length) * 100);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.date}>{formatDate()}</Text>
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsLabel}>今日の獲得</Text>
          <Text style={styles.points}>{todayPoints}pt</Text>
        </View>
      </View>

      {/* 統計サマリー */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>あなた</Text>
          <Text style={styles.statValue}>{currentUser?.points || 0}pt</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{partner?.displayName}</Text>
          <Text style={styles.statValue}>{partner?.points || 0}pt</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>合算</Text>
          <Text style={styles.statValue}>
            {(currentUser?.points || 0) + (partner?.points || 0)}pt
          </Text>
        </View>
      </View>

      {/* 今週の達成率 */}
      <View style={styles.weeklyRate}>
        <Text style={styles.weeklyRateText}>
          今週の達成率: {getWeeklyCompletionRate()}%
        </Text>
      </View>

      {/* 習慣リスト */}
      <View style={styles.habitsContainer}>
        <Text style={styles.sectionTitle}>今日の習慣</Text>
        
        {habitStatuses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>習慣がまだありません</Text>
            <Text style={styles.emptySubtext}>
              習慣タブから新しい習慣を追加しましょう！
            </Text>
          </View>
        ) : (
          habitStatuses.map((status) => (
            <TouchableOpacity
              key={status.habitId}
              style={[
                styles.habitCard,
                status.isFullyCompleted && styles.habitCardCompleted,
              ]}
              onPress={() => handleToggleComplete(status)}
            >
              <View style={styles.habitHeader}>
                <Text style={styles.habitTitle}>{status.habit.title}</Text>
                <Text style={styles.habitPoints}>{status.habit.points}pt</Text>
              </View>
              
              {status.habit.description && (
                <Text style={styles.habitDescription}>
                  {status.habit.description}
                </Text>
              )}
              
              <View style={styles.habitFooter}>
                <View style={styles.completionStatus}>
                  <Text style={styles.statusText}>
                    あなた: {getCompletionIcon(status)}
                  </Text>
                  <Text style={styles.statusText}>
                    {partner?.displayName}: {getPartnerIcon(status)}
                  </Text>
                </View>
                
                {status.streak > 0 && (
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakText}>
                      🔥 {status.streak}日連続
                    </Text>
                  </View>
                )}
              </View>
              
              {status.isFullyCompleted && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>✨ 達成！</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  date: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsLabel: {
    fontSize: 14,
    color: '#666',
  },
  points: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    marginTop: 10,
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  weeklyRate: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  weeklyRateText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
  },
  habitsContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  habitCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  habitCardCompleted: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  habitPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  habitDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  habitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionStatus: {
    flexDirection: 'row',
    gap: 15,
  },
  statusText: {
    fontSize: 14,
  },
  streakBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  streakText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  completedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  completedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
