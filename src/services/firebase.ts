import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Firebaseコンソールから取得した設定に置き換えてください
// https://console.firebase.google.com/
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// 認証とFirestoreのインスタンスをエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
