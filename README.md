# 夫婦習慣トラッカー

夫婦で習慣化を楽しく続けるためのWebアプリケーション

## 技術スタック

- Next.js 15 (App Router)
- TypeScript
- Firebase (Authentication + Firestore)
- Tailwind CSS

## 主な機能

1. **ユーザー管理**
   - 夫/妻の2人アカウント
   - メールアドレス＋パスワードでログイン

2. **習慣管理**
   - 毎日・週間の習慣設定
   - ポイント制
   - 達成条件（両方 or どちらか）
   - 連続達成ストリーク機能

3. **ご褒美管理**
   - ポイントで交換できるご褒美
   - 予約機能
   - 個人ポイント・合算ポイント対応

4. **ダッシュボード**
   - 今日の習慣一覧
   - ポイント表示
   - 達成状況確認

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Firebase プロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成
2. Authentication を有効化（Email/Password認証を有効にする）
3. Firestore Database を作成（本番モードで開始）
4. プロジェクト設定から Web アプリを追加し、設定情報を取得

### 3. 環境変数の設定

`.env.local.example` を `.env.local` にコピーして、Firebase の設定情報を入力：

```bash
cp .env.local.example .env.local
```

`.env.local` を編集：

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Firestore セキュリティルールの設定

Firebase Console で以下のセキュリティルールを設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    match /habits/{habitId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /habitCompletions/{completionId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    match /rewards/{rewardId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /streaks/{streakId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 5. ユーザーの初期設定

Firebase Console の Authentication でユーザーを手動作成後、Firestore に以下のドキュメントを追加：

**users コレクション**

夫のドキュメント（UID と同じIDで）:
```json
{
  "email": "husband@example.com",
  "role": "husband",
  "displayName": "夫",
  "points": 0,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

妻のドキュメント（UID と同じIDで）:
```json
{
  "email": "wife@example.com",
  "role": "wife",
  "displayName": "妻",
  "points": 0,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### 6. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションが起動します。

## Vercel へのデプロイ

### 1. Vercel プロジェクトの作成

```bash
npm install -g vercel
vercel login
vercel
```

### 2. 環境変数の設定

Vercel ダッシュボードで以下の環境変数を設定：

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 3. デプロイ

```bash
vercel --prod
```

## データベース構造

### users コレクション
- uid (ドキュメントID)
- email
- role: 'husband' | 'wife'
- displayName
- points
- createdAt

### habits コレクション
- id (自動生成)
- title
- description
- frequency: 'daily' | 'weekly'
- weeklyDays: number[] (0-6, 日曜=0)
- points
- completionCondition: 'both' | 'either'
- isActive
- createdBy
- createdAt

### habitCompletions コレクション
- id (自動生成)
- habitId
- userId
- date (YYYY-MM-DD)
- completedAt

### rewards コレクション
- id (自動生成)
- title
- description
- pointCost
- pointType: 'individual' | 'combined'
- isReserved
- reservedBy
- reservedAt
- redeemedBy
- redeemedAt
- createdBy
- createdAt

### streaks コレクション
- habitId + userId (複合キー)
- currentStreak
- longestStreak
- lastCompletedDate

## 使い方

1. 作成したアカウントでログイン
2. 管理者が習慣とご褒美を追加（Firestore から直接追加）
3. 毎日ダッシュボードにアクセスして習慣を完了
4. ポイントが貯まったらご褒美を予約

## ライセンス

MIT
