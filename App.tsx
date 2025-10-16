import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons as Icon } from '@expo/vector-icons';

// Import screens
import SwipeScreen from './src/screens/SwipeScreen';
import MapScreen from './src/screens/MapScreen';
import MatchesScreen from './src/screens/MatchesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChatScreen from './src/screens/ChatScreen';
import AuthTestScreen from './src/screens/AuthTestScreen';
import SupabaseTestScreen from './src/screens/SupabaseTestScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CompactEditScreen from './src/screens/CompactEditScreen';
import UserCountResultsScreen from './src/screens/UserCountResultsScreen';
import MapSettingsScreen from './src/screens/MapSettingsScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import { ProfileProvider } from './src/context/ProfileContext';
import { OnboardingProvider, useOnboarding } from './src/context/OnboardingContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { PremiumProvider } from './src/context/PremiumContext';
import { UserCountProvider } from './src/context/UserCountContext';

// Define navigation types
export type RootStackParamList = {
  Main: undefined;
  Chat: { matchId: string; matchName: string; matchPhoto: string };
  AuthTest: undefined;
  SupabaseTest: undefined;
  Onboarding: undefined;
  Settings: undefined;
  EditProfile: undefined;
  CompactEdit: undefined;
  UserCountResults: {
    userCountResults: {
      totalUsers: number;
      visibleUsers: number;
      totalUserPhotos: string[];
      visibleUserPhotos: string[];
    };
  };
  MapSettings: undefined;
  NotificationSettings: undefined;
};

export type MainTabParamList = {
  Swipe: undefined;
  Map: undefined;
  Matches: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Profile"
      screenOptions={{
        tabBarActiveTintColor: '#ff4444',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopWidth: 0,
          height: 72, // Reduced by 4px more
          paddingBottom: 0, // Reduced by 1px
          paddingTop: 0,
          elevation: 0,
          shadowOpacity: 0,
          position: 'absolute',
          bottom: -1, // Moved down 1px
          left: -1, // Moved left 1px
          right: -1, // Moved right 1px
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 0,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Swipe"
        component={SwipeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name="local-fire-department"
              size={23}
              color={color}
              style={{ opacity: focused ? 1 : 0.5, marginTop: -2 }}
            />
          ),
          tabBarLabel: 'Swipe',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 0,
          },
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name="place"
              size={23}
              color={color}
              style={{ opacity: focused ? 1 : 0.5, marginTop: -3 }}
            />
          ),
          tabBarLabel: 'Map',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 0,
          },
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name="chat-bubble-outline"
              size={23}
              color={color}
              style={{ opacity: focused ? 1 : 0.5, marginTop: -1 }}
            />
          ),
          tabBarLabel: 'Messages',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 0,
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name="person"
              size={23}
              color={color}
              style={{ opacity: focused ? 1 : 0.5, marginTop: -1 }}
            />
          ),
          tabBarLabel: 'Profile',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 0,
          },
        }}
      />
    </Tab.Navigator>
  );
}

function MainApp() {
  const { isOnboardingCompleted, isLoading, completeOnboarding } = useOnboarding();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={{ color: 'white', marginTop: 20, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  if (!isOnboardingCompleted) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1A1A1A',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SupabaseTest"
          component={SupabaseTestScreen}
          options={{ 
            title: 'Supabase Test',
            headerShown: true,
            headerStyle: { backgroundColor: '#1A1A1A' },
            headerTintColor: '#FFFFFF'
          }}
        />
        <Stack.Screen
          name="CompactEdit"
          component={CompactEditScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="UserCountResults"
          component={UserCountResultsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MapSettings"
          component={MapSettingsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="NotificationSettings"
          component={NotificationSettingsScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <OnboardingProvider>
        <ProfileProvider>
          <SettingsProvider>
            <PremiumProvider>
              <UserCountProvider>
                <MainApp />
              </UserCountProvider>
            </PremiumProvider>
          </SettingsProvider>
        </ProfileProvider>
      </OnboardingProvider>
    </GestureHandlerRootView>
  );
}
