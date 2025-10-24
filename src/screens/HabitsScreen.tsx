import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { Habit } from '../types';
import { getHabits, createHabit, updateHabit, deleteHabit } from '../services/habitService';
import { useAuth } from '../contexts/AuthContext';

export default function HabitsScreen() {
  const { currentUser } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newHabit, setNewHabit] = useState({
    title: '',
    description: '',
    points: '',
    category: 'health' as 'health' | 'exercise' | 'household' | 'other',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    completionType: 'both' as 'both' | 'either',
    weekday: 0,
  });

  const loadHabits = async () => {
    const allHabits = await getHabits();
    setHabits(allHabits);
  };

  useEffect(() => {
    loadHabits();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHabits();
    setRefreshing(false);
  };

  const handleCreateHabit = async () => {
    if (!currentUser || !newHabit.title || !newHabit.points) {
      Alert.alert('エラー', 'タイトルとポイントを入力してください');
      return;
    }

    try {
      await createHabit({
        title: newHabit.title,
        description: newHabit.description,
        points: parseInt(newHabit.points),
        category: newHabit.category,
        frequency: newHabit.frequency,
        completionType: newHabit.completionType,
        createdBy: currentUser.id,
        weekday: newHabit.frequency === 'weekly' ? newHabit.weekday : undefined,
        isActive: true,
      });

      setModalVisible(false);
      setNewHabit({
        title: '',
        description: '',
        points: '',
        category: 'health',
        frequency: 'daily',
        completionType: 'both',
        weekday: 0,
      });

      await loadHabits();
      Alert.alert('成功', '習慣を追加しました！');
    } catch (error) {
      Alert.alert('エラー', '習慣の追加に失敗しました');
      console.error(error);
    }
  };

  const handleDeleteHabit = (habitId: string, title: string) => {
    Alert.alert(
      '習慣を削除',
      `「${title}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHabit(habitId);
              await loadHabits();
              Alert.alert('成功', '習慣を削除しました');
            } catch (error) {
              Alert.alert('エラー', '削除に失敗しました');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'health':
        return '💚';
      case 'exercise':
        return '🏃';
      case 'household':
        return '🏠';
      default:
        return '📌';
    }
  };

  const getFrequencyText = (frequency: string, weekday?: number) => {
    if (frequency === 'daily') return '毎日';
    if (frequency === 'weekly') {
      const days = ['日', '月', '火', '水', '木', '金', '土'];
      return `毎週${days[weekday || 0]}曜日`;
    }
    return '毎月';
  };

  const weekdays = [
    { label: '日', value: 0 },
    { label: '月', value: 1 },
    { label: '火', value: 2 },
    { label: '水', value: 3 },
    { label: '木', value: 4 },
    { label: '金', value: 5 },
    { label: '土', value: 6 },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>習慣管理</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+ 習慣追加</Text>
          </TouchableOpacity>
        </View>

        {/* 習慣リスト */}
        <View style={styles.habitsList}>
          {habits.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>習慣がまだありません</Text>
              <Text style={styles.emptySubtext}>
                「+ 習慣追加」ボタンから新しい習慣を作りましょう！
              </Text>
            </View>
          ) : (
            habits.map((habit) => (
              <View key={habit.id} style={styles.habitCard}>
                <View style={styles.habitHeader}>
                  <View style={styles.habitTitleRow}>
                    <Text style={styles.categoryEmoji}>
                      {getCategoryEmoji(habit.category)}
                    </Text>
                    <Text style={styles.habitTitle}>{habit.title}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteHabit(habit.id, habit.title)}
                  >
                    <Text style={styles.deleteButton}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                {habit.description && (
                  <Text style={styles.habitDescription}>{habit.description}</Text>
                )}

                <View style={styles.habitInfo}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>頻度:</Text>
                    <Text style={styles.infoValue}>
                      {getFrequencyText(habit.frequency, habit.weekday)}
                    </Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>達成条件:</Text>
                    <Text style={styles.infoValue}>
                      {habit.completionType === 'both' ? '両方達成' : 'どちらか達成'}
                    </Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>ポイント:</Text>
                    <Text style={styles.pointsValue}>{habit.points}pt</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* 習慣追加モーダル */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>新しい習慣</Text>

              <Text style={styles.label}>タイトル *</Text>
              <TextInput
                style={styles.input}
                placeholder="例: 朝の運動"
                value={newHabit.title}
                onChangeText={(text) => setNewHabit({ ...newHabit, title: text })}
              />

              <Text style={styles.label}>説明（任意）</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="習慣の詳細を入力"
                value={newHabit.description}
                onChangeText={(text) => setNewHabit({ ...newHabit, description: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>ポイント *</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                value={newHabit.points}
                onChangeText={(text) => setNewHabit({ ...newHabit, points: text })}
                keyboardType="numeric"
              />

              <Text style={styles.label}>カテゴリ</Text>
              <View style={styles.categorySelector}>
                {[
                  { label: '💚 健康', value: 'health' },
                  { label: '🏃 運動', value: 'exercise' },
                  { label: '🏠 家事', value: 'household' },
                  { label: '📌 その他', value: 'other' },
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryButton,
                      newHabit.category === cat.value && styles.categoryButtonActive,
                    ]}
                    onPress={() =>
                      setNewHabit({
                        ...newHabit,
                        category: cat.value as any,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        newHabit.category === cat.value && styles.categoryButtonTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>頻度</Text>
              <View style={styles.frequencySelector}>
                {[
                  { label: '毎日', value: 'daily' },
                  { label: '週間', value: 'weekly' },
                ].map((freq) => (
                  <TouchableOpacity
                    key={freq.value}
                    style={[
                      styles.frequencyButton,
                      newHabit.frequency === freq.value && styles.frequencyButtonActive,
                    ]}
                    onPress={() =>
                      setNewHabit({
                        ...newHabit,
                        frequency: freq.value as any,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        newHabit.frequency === freq.value && styles.frequencyButtonTextActive,
                      ]}
                    >
                      {freq.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {newHabit.frequency === 'weekly' && (
                <>
                  <Text style={styles.label}>曜日</Text>
                  <View style={styles.weekdaySelector}>
                    {weekdays.map((day) => (
                      <TouchableOpacity
                        key={day.value}
                        style={[
                          styles.weekdayButton,
                          newHabit.weekday === day.value && styles.weekdayButtonActive,
                        ]}
                        onPress={() => setNewHabit({ ...newHabit, weekday: day.value })}
                      >
                        <Text
                          style={[
                            styles.weekdayButtonText,
                            newHabit.weekday === day.value && styles.weekdayButtonTextActive,
                          ]}
                        >
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>達成条件</Text>
              <View style={styles.completionSelector}>
                {[
                  { label: '両方達成で完了', value: 'both' },
                  { label: 'どちらか達成で完了', value: 'either' },
                ].map((comp) => (
                  <TouchableOpacity
                    key={comp.value}
                    style={[
                      styles.completionButton,
                      newHabit.completionType === comp.value && styles.completionButtonActive,
                    ]}
                    onPress={() =>
                      setNewHabit({
                        ...newHabit,
                        completionType: comp.value as any,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.completionButtonText,
                        newHabit.completionType === comp.value &&
                          styles.completionButtonTextActive,
                      ]}
                    >
                      {comp.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelButtonText}>キャンセル</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalCreateButton}
                  onPress={handleCreateHabit}
                >
                  <Text style={styles.modalCreateButtonText}>追加</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  habitsList: {
    padding: 15,
  },
  habitCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  habitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  deleteButton: {
    fontSize: 20,
    padding: 5,
  },
  habitDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  habitInfo: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    margin: 20,
    marginTop: 60,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  categoryButtonActive: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  frequencySelector: {
    flexDirection: 'row',
    gap: 10,
  },
  frequencyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  frequencyButtonActive: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  frequencyButtonText: {
    fontSize: 14,
    color: '#666',
  },
  frequencyButtonTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  weekdaySelector: {
    flexDirection: 'row',
    gap: 5,
  },
  weekdayButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  weekdayButtonActive: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  weekdayButtonText: {
    fontSize: 14,
    color: '#666',
  },
  weekdayButtonTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  completionSelector: {
    gap: 10,
  },
  completionButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  completionButtonActive: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  completionButtonText: {
    fontSize: 14,
    color: '#666',
  },
  completionButtonTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#666',
  },
  modalCreateButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  modalCreateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
