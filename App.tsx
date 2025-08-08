import React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import SwipeScreen from './src/screens/SwipeScreen';
import MapScreen from './src/screens/MapScreen';
import MatchesScreen from './src/screens/MatchesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChatScreen from './src/screens/ChatScreen';
import AuthTestScreen from './src/screens/AuthTestScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { ProfileProvider } from './src/context/ProfileContext';
import { OnboardingProvider, useOnboarding } from './src/context/OnboardingContext';

// Define navigation types
export type RootStackParamList = {
  Main: undefined;
  Chat: { matchId: string; matchName: string; matchPhoto: string };
  AuthTest: undefined;
  Onboarding: undefined;
  Settings: undefined;
  EditProfile: undefined;
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
      screenOptions={{
        tabBarActiveTintColor: '#ff4444',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopWidth: 0,
          height: 80,
          paddingBottom: 0,
          paddingTop: 4,
          elevation: 0,
          shadowOpacity: 0,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 3,
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
              size={24}
              color={color}
              style={{ opacity: focused ? 1 : 0.5 }}
            />
          ),
          tabBarLabel: 'Swipe',
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name="place"
              size={24}
              color={color}
              style={{ opacity: focused ? 1 : 0.5 }}
            />
          ),
          tabBarLabel: 'Map',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 4,
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
              size={24}
              color={color}
              style={{ opacity: focused ? 1 : 0.5 }}
            />
          ),
          tabBarLabel: 'Messages',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 5,
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
              size={24}
              color={color}
              style={{ opacity: focused ? 1 : 0.5 }}
            />
          ),
          tabBarLabel: 'Profile',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 5,
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <OnboardingProvider>
        <ProfileProvider>
          <MainApp />
        </ProfileProvider>
      </OnboardingProvider>
    </GestureHandlerRootView>
  );
}
