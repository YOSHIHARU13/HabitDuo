import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'husband' | 'wife'>('husband');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    if (isSignUp && !displayName) {
      Alert.alert('エラー', '表示名を入力してください');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, displayName, role);
        Alert.alert('成功', 'アカウントを作成しました！');
      } else {
        await signIn(email, password);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        'エラー',
        error.message || 
        (isSignUp ? 'アカウント作成に失敗しました' : 'ログインに失敗しました')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* ロゴ・タイトル */}
          <View style={styles.header}>
            <Text style={styles.logo}>💑</Text>
            <Text style={styles.title}>HabitDuo</Text>
            <Text style={styles.subtitle}>二人で育てる習慣アプリ</Text>
          </View>

          {/* フォーム */}
          <View style={styles.form}>
            {isSignUp && (
              <>
                <Text style={styles.label}>表示名</Text>
                <TextInput
                  style={styles.input}
                  placeholder="あなたの名前"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />

                <Text style={styles.label}>役割</Text>
                <View style={styles.roleSelector}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      role === 'husband' && styles.roleButtonActive,
                    ]}
                    onPress={() => setRole('husband')}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === 'husband' && styles.roleButtonTextActive,
                      ]}
                    >
                      夫
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      role === 'wife' && styles.roleButtonActive,
                    ]}
                    onPress={() => setRole('wife')}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === 'wife' && styles.roleButtonTextActive,
                      ]}
                    >
                      妻
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text style={styles.label}>メールアドレス</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>パスワード</Text>
            <TextInput
              style={styles.input}
              placeholder="6文字以上"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.authButton, loading && styles.authButtonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              <Text style={styles.authButtonText}>
                {loading
                  ? '処理中...'
                  : isSignUp
                  ? 'アカウント作成'
                  : 'ログイン'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.switchButtonText}>
                {isSignUp
                  ? 'すでにアカウントをお持ちの方はこちら'
                  : 'アカウントをお持ちでない方はこちら'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 説明 */}
          {isSignUp && (
            <View style={styles.info}>
              <Text style={styles.infoTitle}>💡 使い方</Text>
              <Text style={styles.infoText}>
                1. 二人とも別々にアカウントを作成{'\n'}
                2. 設定画面でパートナーIDを交換{'\n'}
                3. 一緒に習慣を育てよう！
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  roleSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  roleButtonText: {
    fontSize: 16,
    color: '#666',
  },
  roleButtonTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  authButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  authButtonDisabled: {
    backgroundColor: '#ccc',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#2196F3',
    fontSize: 14,
  },
  info: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
});
