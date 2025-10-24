import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  partner: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, role: 'husband' | 'wife') => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ユーザー情報をFirestoreから取得
  const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        return { id: firebaseUser.uid, ...userDoc.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('ユーザー情報の取得エラー:', error);
      return null;
    }
  };

  // パートナー情報を取得
  const fetchPartner = async (partnerId: string): Promise<User | null> => {
    try {
      const partnerDoc = await getDoc(doc(db, 'users', partnerId));
      if (partnerDoc.exists()) {
        return { id: partnerId, ...partnerDoc.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('パートナー情報の取得エラー:', error);
      return null;
    }
  };

  // サインアップ
  const signUp = async (email: string, password: string, displayName: string, role: 'husband' | 'wife') => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Firestoreにユーザー情報を保存
    await setDoc(doc(db, 'users', uid), {
      email,
      displayName,
      role,
      points: 0,
      createdAt: new Date().toISOString(),
    });
  };

  // サインイン
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // サインアウト
  const signOut = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setPartner(null);
  };

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await fetchUserData(firebaseUser);
        setCurrentUser(userData);

        // パートナー情報を取得
        if (userData?.partnerId) {
          const partnerData = await fetchPartner(userData.partnerId);
          setPartner(partnerData);
        }
      } else {
        setCurrentUser(null);
        setPartner(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    partner,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
