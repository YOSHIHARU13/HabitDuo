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
import { Reward } from '../types';
import { updateUserPoints } from './habitService';

// ご褒美を作成
export const createReward = async (reward: Omit<Reward, 'id' | 'createdAt' | 'isReserved'>) => {
  const rewardData = {
    ...reward,
    isReserved: false,
    createdAt: Timestamp.now(),
  };
  const docRef = await addDoc(collection(db, 'rewards'), rewardData);
  return docRef.id;
};

// すべてのご褒美を取得
export const getRewards = async (): Promise<Reward[]> => {
  const q = query(
    collection(db, 'rewards'),
    where('claimedAt', '==', null),
    orderBy('requiredPoints', 'asc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    claimedAt: doc.data().claimedAt?.toDate(),
  })) as Reward[];
};

// 予約済みのご褒美を取得
export const getReservedRewards = async (): Promise<Reward[]> => {
  const q = query(
    collection(db, 'rewards'),
    where('isReserved', '==', true),
    where('claimedAt', '==', null)
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as Reward[];
};

// ご褒美を予約
export const reserveReward = async (rewardId: string, userId: string) => {
  const rewardRef = doc(db, 'rewards', rewardId);
  await updateDoc(rewardRef, {
    isReserved: true,
    reservedBy: userId,
  });
};

// ご褒美の予約をキャンセル
export const unreserveReward = async (rewardId: string) => {
  const rewardRef = doc(db, 'rewards', rewardId);
  await updateDoc(rewardRef, {
    isReserved: false,
    reservedBy: null,
  });
};

// ご褒美を獲得（ポイント消費）
export const claimReward = async (
  rewardId: string,
  userId: string,
  partnerId?: string
): Promise<{ success: boolean; message: string }> => {
  const rewardDoc = await getDoc(doc(db, 'rewards', rewardId));
  if (!rewardDoc.exists()) {
    return { success: false, message: 'ご褒美が見つかりません' };
  }
  
  const reward = { id: rewardDoc.id, ...rewardDoc.data() } as Reward;
  
  // ユーザー情報を取得
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) {
    return { success: false, message: 'ユーザーが見つかりません' };
  }
  
  const userPoints = userDoc.data().points || 0;
  
  // 合算ポイントの場合
  if (reward.type === 'combined') {
    if (!partnerId) {
      return { success: false, message: 'パートナーIDが必要です' };
    }
    
    const partnerDoc = await getDoc(doc(db, 'users', partnerId));
    if (!partnerDoc.exists()) {
      return { success: false, message: 'パートナーが見つかりません' };
    }
    
    const partnerPoints = partnerDoc.data().points || 0;
    const totalPoints = userPoints + partnerPoints;
    
    if (totalPoints < reward.requiredPoints) {
      return { 
        success: false, 
        message: `ポイントが足りません（あと${reward.requiredPoints - totalPoints}pt必要）` 
      };
    }
    
    // 両方からポイントを引く（割合で）
    const userDeduction = Math.floor((userPoints / totalPoints) * reward.requiredPoints);
    const partnerDeduction = reward.requiredPoints - userDeduction;
    
    await updateUserPoints(userId, -userDeduction);
    await updateUserPoints(partnerId, -partnerDeduction);
    
  } else {
    // 個人ポイントの場合
    if (userPoints < reward.requiredPoints) {
      return { 
        success: false, 
        message: `ポイントが足りません（あと${reward.requiredPoints - userPoints}pt必要）` 
      };
    }
    
    await updateUserPoints(userId, -reward.requiredPoints);
  }
  
  // ご褒美を獲得済みとしてマーク
  const rewardRef = doc(db, 'rewards', rewardId);
  await updateDoc(rewardRef, {
    claimedAt: Timestamp.now(),
    claimedBy: userId,
    isReserved: false,
  });
  
  return { success: true, message: 'ご褒美を獲得しました！🎉' };
};

// ご褒美を更新
export const updateReward = async (rewardId: string, updates: Partial<Reward>) => {
  const rewardRef = doc(db, 'rewards', rewardId);
  await updateDoc(rewardRef, updates);
};

// ご褒美を削除
export const deleteReward = async (rewardId: string) => {
  const rewardRef = doc(db, 'rewards', rewardId);
  await deleteDoc(rewardRef);
};

// 獲得したご褒美の履歴を取得
export const getClaimedRewards = async (): Promise<Reward[]> => {
  const q = query(
    collection(db, 'rewards'),
    where('claimedAt', '!=', null),
    orderBy('claimedAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    claimedAt: doc.data().claimedAt?.toDate(),
  })) as Reward[];
};
