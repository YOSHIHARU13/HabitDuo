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
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Reward } from '../types';
import {
  getRewards,
  getReservedRewards,
  reserveReward,
  unreserveReward,
  claimReward,
  createReward,
} from '../services/rewardService';

export default function RewardsScreen() {
  const { currentUser, partner } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [reservedRewards, setReservedRewards] = useState<Reward[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newReward, setNewReward] = useState({
    title: '',
    description: '',
    requiredPoints: '',
    type: 'combined' as 'individual' | 'combined',
  });

  const loadRewards = async () => {
    const allRewards = await getRewards();
    const reserved = await getReservedRewards();
    setRewards(allRewards);
    setReservedRewards(reserved);
  };

  useEffect(() => {
    loadRewards();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRewards();
    setRefreshing(false);
  };

  const handleReserve = async (rewardId: string) => {
    if (!currentUser) return;
    
    try {
      await reserveReward(rewardId, currentUser.id);
      await loadRewards();
      Alert.alert('成功', 'ご褒美を予約しました！');
    } catch (error) {
      Alert.alert('エラー', '予約に失敗しました');
      console.error(error);
    }
  };

  const handleUnreserve = async (rewardId: string) => {
    try {
      await unreserveReward(rewardId);
      await loadRewards();
      Alert.alert('成功', '予約をキャンセルしました');
    } catch (error) {
      Alert.alert('エラー', 'キャンセルに失敗しました');
      console.error(error);
    }
  };

  const handleClaim = async (reward: Reward) => {
    if (!currentUser || !partner) return;
    
    Alert.alert(
      'ご褒美を獲得',
      `「${reward.title}」を獲得しますか？\n必要ポイント: ${reward.requiredPoints}pt`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '獲得する',
          onPress: async () => {
            const result = await claimReward(
              reward.id,
              currentUser.id,
              reward.type === 'combined' ? partner.id : undefined
            );
            
            if (result.success) {
              Alert.alert('🎉', result.message);
              await loadRewards();
            } else {
              Alert.alert('エラー', result.message);
            }
          },
        },
      ]
    );
  };

  const handleCreateReward = async () => {
    if (!newReward.title || !newReward.requiredPoints) {
      Alert.alert('エラー', 'タイトルとポイントを入力してください');
      return;
    }

    try {
      await createReward({
        title: newReward.title,
        description: newReward.description,
        requiredPoints: parseInt(newReward.requiredPoints),
        type: newReward.type,
      });
      
      setModalVisible(false);
      setNewReward({
        title: '',
        description: '',
        requiredPoints: '',
        type: 'combined',
      });
      
      await loadRewards();
      Alert.alert('成功', 'ご褒美を追加しました！');
    } catch (error) {
      Alert.alert('エラー', 'ご褒美の追加に失敗しました');
      console.error(error);
    }
  };

  const canAfford = (reward: Reward) => {
    if (!currentUser || !partner) return false;
    
    if (reward.type === 'combined') {
      return (currentUser.points + partner.points) >= reward.requiredPoints;
    } else {
      return currentUser.points >= reward.requiredPoints;
    }
  };

  const getPointsNeeded = (reward: Reward) => {
    if (!currentUser || !partner) return reward.requiredPoints;
    
    if (reward.type === 'combined') {
      const total = currentUser.points + partner.points;
      return Math.max(0, reward.requiredPoints - total);
    } else {
      return Math.max(0, reward.requiredPoints - currentUser.points);
    }
  };

  const totalPoints = (currentUser?.points || 0) + (partner?.points || 0);

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ポイント表示 */}
        <View style={styles.pointsHeader}>
          <Text style={styles.headerTitle}>あなたのポイント</Text>
          <View style={styles.pointsGrid}>
            <View style={styles.pointBox}>
              <Text style={styles.pointLabel}>あなた</Text>
              <Text style={styles.pointValue}>{currentUser?.points || 0}pt</Text>
            </View>
            <View style={styles.pointBox}>
              <Text style={styles.pointLabel}>{partner?.displayName}</Text>
              <Text style={styles.pointValue}>{partner?.points || 0}pt</Text>
            </View>
            <View style={[styles.pointBox, styles.pointBoxTotal]}>
              <Text style={styles.pointLabel}>💑 合算</Text>
              <Text style={styles.pointValue}>{totalPoints}pt</Text>
            </View>
          </View>
        </View>

        {/* 予約中のご褒美 */}
        {reservedRewards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ 予約中のご褒美</Text>
            {reservedRewards.map((reward) => (
              <View key={reward.id} style={styles.reservedCard}>
                <View style={styles.rewardHeader}>
                  <Text style={styles.rewardTitle}>{reward.title}</Text>
                  <Text style={styles.rewardType}>
                    {reward.type === 'combined' ? '💑合算' : '👤個人'}
                  </Text>
                </View>
                {reward.description && (
                  <Text style={styles.rewardDescription}>{reward.description}</Text>
                )}
                <View style={styles.rewardFooter}>
                  <Text style={styles.rewardPoints}>{reward.requiredPoints}pt</Text>
                  <Text style={styles.reservedBy}>
                    予約者: {reward.reservedBy === currentUser?.id ? 'あなた' : partner?.displayName}
                  </Text>
                </View>
                {reward.reservedBy === currentUser?.id && (
                  <TouchableOpacity
                    style={styles.unreserveButton}
                    onPress={() => handleUnreserve(reward.id)}
                  >
                    <Text style={styles.unreserveButtonText}>予約解除</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ご褒美リスト */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ご褒美リスト</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addButtonText}>+ 追加</Text>
            </TouchableOpacity>
          </View>

          {rewards.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>ご褒美がまだありません</Text>
              <Text style={styles.emptySubtext}>
                右上の「+ 追加」ボタンから新しいご褒美を追加しましょう！
              </Text>
            </View>
          ) : (
            rewards.map((reward) => {
              const affordable = canAfford(reward);
              const pointsNeeded = getPointsNeeded(reward);

              return (
                <View
                  key={reward.id}
                  style={[
                    styles.rewardCard,
                    affordable && styles.rewardCardAffordable,
                  ]}
                >
                  <View style={styles.rewardHeader}>
                    <Text style={styles.rewardTitle}>{reward.title}</Text>
                    <Text style={styles.rewardType}>
                      {reward.type === 'combined' ? '💑合算' : '👤個人'}
                    </Text>
                  </View>

                  {reward.description && (
                    <Text style={styles.rewardDescription}>{reward.description}</Text>
                  )}

                  <View style={styles.rewardFooter}>
                    <Text style={styles.rewardPoints}>{reward.requiredPoints}pt</Text>
                    {!affordable && (
                      <Text style={styles.pointsNeeded}>あと{pointsNeeded}pt</Text>
                    )}
                  </View>

                  <View style={styles.rewardActions}>
                    {!reward.isReserved && (
                      <TouchableOpacity
                        style={styles.reserveButton}
                        onPress={() => handleReserve(reward.id)}
                      >
                        <Text style={styles.reserveButtonText}>予約する</Text>
                      </TouchableOpacity>
                    )}

                    {affordable && (
                      <TouchableOpacity
                        style={styles.claimButton}
                        onPress={() => handleClaim(reward)}
                      >
                        <Text style={styles.claimButtonText}>獲得する！</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ご褒美追加モーダル */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新しいご褒美</Text>

            <TextInput
              style={styles.input}
              placeholder="タイトル（例: 美味しいディナー）"
              value={newReward.title}
              onChangeText={(text) => setNewReward({ ...newReward, title: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="説明（任意）"
              value={newReward.description}
              onChangeText={(text) => setNewReward({ ...newReward, description: text })}
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="必要ポイント"
              value={newReward.requiredPoints}
              onChangeText={(text) => setNewReward({ ...newReward, requiredPoints: text })}
              keyboardType="numeric"
            />

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newReward.type === 'individual' && styles.typeButtonActive,
                ]}
                onPress={() => setNewReward({ ...newReward, type: 'individual' })}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    newReward.type === 'individual' && styles.typeButtonTextActive,
                  ]}
                >
                  👤 個人
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newReward.type === 'combined' && styles.typeButtonActive,
                ]}
                onPress={() => setNewReward({ ...newReward, type: 'combined' })}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    newReward.type === 'combined' && styles.typeButtonTextActive,
                  ]}
                >
                  💑 合算
                </Text>
              </TouchableOpacity>
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
                onPress={handleCreateReward}
              >
                <Text style={styles.modalCreateButtonText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  pointsHeader: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  pointsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pointBox: {
    alignItems: 'center',
    flex: 1,
  },
  pointBoxTotal: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingVertical: 10,
  },
  pointLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  pointValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  section: {
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
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
  reservedCard: {
    backgroundColor: '#FFF9C4',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FBC02D',
  },
  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  rewardCardAffordable: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  rewardType: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  rewardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rewardPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  pointsNeeded: {
    fontSize: 14,
    color: '#f44336',
  },
  reservedBy: {
    fontSize: 12,
    color: '#666',
  },
  rewardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  reserveButton: {
    flex: 1,
    backgroundColor: '#FFC107',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reserveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  unreserveButton: {
    backgroundColor: '#757575',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  unreserveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  claimButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
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
