import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsScreen() {
  const { currentUser, partner, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('エラー', 'ログアウトに失敗しました');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const copyToClipboard = (text) => {
    // React Nativeのクリップボード機能は@react-native-clipboard/clipboardが必要
    // ここでは仮実装としてアラート表示
    Alert.alert('ユーザーID', text);
  };

  return (
    <ScrollView style={styles.container}>
      {/* プロフィール情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>プロフィール</Text>
        
        <View style={styles.card}>
          <View style={styles.profileItem}>
            <Text style={styles.label}>表示名</Text>
            <Text style={styles.value}>{currentUser?.displayName}</Text>
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.label}>メール</Text>
            <Text style={styles.value}>{currentUser?.email}</Text>
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.label}>役割</Text>
            <Text style={styles.value}>
              {currentUser?.role === 'husband' ? '夫' : '妻'}
            </Text>
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.label}>現在のポイント</Text>
            <Text style={styles.pointsValue}>{currentUser?.points || 0}pt</Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.idContainer}
            onPress={() => copyToClipboard(currentUser?.id)}
          >
            <View>
              <Text style={styles.label}>あなたのユーザーID</Text>
              <Text style={styles.idValue}>{currentUser?.id}</Text>
            </View>
            <Text style={styles.copyIcon}>📋</Text>
          </TouchableOpacity>
          <Text style={styles.idHint}>
            タップしてIDをコピー（パートナー連携用）
          </Text>
        </View>
      </View>

      {/* パートナー情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>パートナー情報</Text>
        
        {partner ? (
          <View style={styles.card}>
            <View style={styles.profileItem}>
              <Text style={styles.label}>パートナー名</Text>
              <Text style={styles.value}>{partner.displayName}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.label}>役割</Text>
              <Text style={styles.value}>
                {partner.role === 'husband' ? '夫' : '妻'}
              </Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.label}>ポイント</Text>
              <Text style={styles.pointsValue}>{partner.points || 0}pt</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.label}>合計ポイント</Text>
              <Text style={styles.totalPoints}>
                {(currentUser?.points || 0) + (partner?.points || 0)}pt
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.noPartner}>パートナー未連携</Text>
            <Text style={styles.noPartnerHint}>
              パートナーのユーザーIDを入力して連携しましょう
            </Text>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => Alert.alert('開発中', 'この機能は開発中です')}
            >
              <Text style={styles.linkButtonText}>パートナーと連携</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* アプリ情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アプリ情報</Text>
        
        <View style={styles.card}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>アプリ名</Text>
            <Text style={styles.infoValue}>HabitDuo</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>バージョン</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>説明</Text>
            <Text style={styles.infoDescription}>
              夫婦で一緒に習慣を育て、ポイントを貯めてご褒美をゲット！
            </Text>
          </View>
        </View>
      </View>

      {/* ログアウトボタン */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.logoutButtonText}>ログアウト</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 HabitDuo</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  profileItem: {
    marginBottom: 15,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  totalPoints: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  idContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  idValue: {
    fontSize: 12,
    color: '#2196F3',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  copyIcon: {
    fontSize: 24,
  },
  idHint: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  noPartner: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  noPartnerHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 15,
  },
  linkButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  infoDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
