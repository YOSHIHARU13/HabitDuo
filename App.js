import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import HabitsScreen from './src/screens/HabitsScreen';
import RewardsScreen from './src/screens/RewardsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

// タブアイコン（絵文字で代用）
const TabIcon = ({ icon, focused }) => (
  <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
);

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#999',
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'ホーム',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Habits"
        component={HabitsScreen}
        options={{
          title: '習慣',
          tabBarIcon: ({ focused }) => <TabIcon icon="✓" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Rewards"
        component={RewardsScreen}
        options={{
          title: 'ご褒美',
          tabBarIcon: ({ focused }) => <TabIcon icon="🎁" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '設定',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {currentUser ? <MainTabs /> : <AuthScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
