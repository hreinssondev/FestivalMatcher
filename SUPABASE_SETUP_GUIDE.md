# 🚀 Supabase Setup Guide for Your Dating App

## **Phase 1: Supabase Project Setup**

### **1. Create Supabase Project**
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub
4. Create new project
5. Choose a name (e.g., "festival-matcher")
6. Set a database password
7. Choose a region close to your users

### **2. Get Your Credentials**
1. Go to Settings → API
2. Copy your **Project URL** and **anon public key**
3. Update `src/utils/supabase.ts`:

```typescript
const supabaseUrl = 'YOUR_PROJECT_URL';
const supabaseAnonKey = 'YOUR_ANON_KEY';
```

### **3. Set Up Database Schema**
1. Go to SQL Editor in Supabase dashboard
2. Copy and paste the entire content of `supabase-setup.sql`
3. Click "Run" to execute the SQL

## **Phase 2: Install Dependencies**

```bash
# Install Supabase client
npm install @supabase/supabase-js

# Install additional dependencies if needed
npm install @react-native-async-storage/async-storage
```

## **Phase 3: Update Your App**

### **1. Update ProfileContext**
Replace your current ProfileContext with Supabase integration:

```typescript
// src/context/ProfileContext.tsx
import { AuthService } from '../services/authService';
import { useEffect, useState } from 'react';

// Add authentication state
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  // Listen to auth changes
  const { data: { subscription } } = AuthService.onAuthStateChange((user) => {
    setUser(user);
    setLoading(false);
  });

  return () => subscription.unsubscribe();
}, []);
```

### **2. Create Authentication Screens**
Create login/signup screens using `AuthService`:

```typescript
// Example signup
const handleSignUp = async () => {
  const { user, error } = await AuthService.signUp(email, password, {
    name: 'Hlynur',
    age: 25,
    festival: 'Defqon-1',
    ticketType: 'Weekend VIP',
    accommodationType: 'Friends Camp',
  });
  
  if (error) {
    console.error('Signup error:', error);
  } else {
    // Navigate to main app
  }
};
```

### **3. Update SwipeScreen**
Replace mock data with real data:

```typescript
// src/screens/SwipeScreen.tsx
import { MatchingService } from '../services/matchingService';
import { LocationService } from '../services/locationService';

const [potentialMatches, setPotentialMatches] = useState([]);

useEffect(() => {
  loadPotentialMatches();
}, []);

const loadPotentialMatches = async () => {
  const location = await LocationService.getCurrentLocation();
  if (location) {
    const { users } = await MatchingService.getPotentialMatches(
      user.id,
      { latitude: location.coords.latitude, longitude: location.coords.longitude }
    );
    setPotentialMatches(users);
  }
};

const handleSwipe = async (action: 'like' | 'dislike' | 'superlike') => {
  await MatchingService.recordSwipe(user.id, currentUser.id, action);
  // Check for match
  const { isMatched } = await MatchingService.checkIfMatched(user.id, currentUser.id);
  if (isMatched) {
    // Show match notification
  }
  // Load next user
  loadPotentialMatches();
};
```

### **4. Update MatchesScreen**
Use real match data:

```typescript
// src/screens/MatchesScreen.tsx
import { MatchingService } from '../services/matchingService';

const [matches, setMatches] = useState([]);

useEffect(() => {
  loadMatches();
}, []);

const loadMatches = async () => {
  const { matches } = await MatchingService.getUserMatches(user.id);
  setMatches(matches);
};
```

### **5. Update ChatScreen**
Implement real-time messaging:

```typescript
// src/screens/ChatScreen.tsx
import { ChatService } from '../services/chatService';

const [messages, setMessages] = useState([]);

useEffect(() => {
  loadMessages();
  // Subscribe to real-time messages
  const subscription = ChatService.subscribeToMessages(matchId, (newMessage) => {
    setMessages(prev => [...prev, newMessage]);
  });

  return () => subscription.unsubscribe();
}, [matchId]);

const sendMessage = async () => {
  if (newMessage.trim()) {
    await ChatService.sendMessage(matchId, user.id, newMessage);
    setNewMessage('');
  }
};
```

## **Phase 4: Location Features**

### **1. Enable Location Tracking**
```typescript
// In your main app component
useEffect(() => {
  if (user) {
    const locationSubscription = LocationService.watchLocation(
      (location) => {
        // Location updated
        console.log('New location:', location);
      },
      user.id
    );

    return () => locationSubscription?.remove();
  }
}, [user]);
```

### **2. Update MapScreen**
```typescript
// src/screens/MapScreen.tsx
const [nearbyUsers, setNearbyUsers] = useState([]);

useEffect(() => {
  loadNearbyUsers();
}, [location]);

const loadNearbyUsers = async () => {
  if (location) {
    const { users } = await LocationService.getNearbyUsers(
      { latitude: location.coords.latitude, longitude: location.coords.longitude },
      5 // 5km radius
    );
    setNearbyUsers(users);
  }
};
```

## **Phase 5: Testing**

### **1. Test Authentication**
- Create test accounts
- Test login/logout
- Test profile updates

### **2. Test Matching**
- Create multiple test users
- Test swiping functionality
- Verify matches are created

### **3. Test Chat**
- Test message sending
- Test real-time updates
- Test message history

### **4. Test Location**
- Test location updates
- Test nearby user queries
- Test festival-based filtering

## **Phase 6: Optimization**

### **1. Photo Storage**
For photo uploads, you can use Supabase Storage:

```typescript
// Upload photo
const { data, error } = await supabase.storage
  .from('profile-photos')
  .upload(`${userId}/${photoId}.jpg`, photoFile);

// Get photo URL
const { data: { publicUrl } } = supabase.storage
  .from('profile-photos')
  .getPublicUrl(`${userId}/${photoId}.jpg`);
```

### **2. Caching**
Implement local caching for better performance:

```typescript
// Cache user profiles locally
const cacheUserProfile = async (userId: string, profile: any) => {
  await AsyncStorage.setItem(`profile_${userId}`, JSON.stringify(profile));
};

const getCachedProfile = async (userId: string) => {
  const cached = await AsyncStorage.getItem(`profile_${userId}`);
  return cached ? JSON.parse(cached) : null;
};
```

## **Phase 7: Add Firebase Later**

When you're ready to add Firebase for push notifications and enhanced real-time features:

### **1. Install Firebase**
```bash
npm install firebase
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### **2. Create Firebase Service**
```typescript
// src/services/firebaseService.ts
import firebase from 'firebase/app';
import 'firebase/messaging';

export class FirebaseService {
  static async sendPushNotification(userId: string, title: string, body: string) {
    // Implementation for push notifications
  }

  static async updateLocationRealTime(userId: string, location: any) {
    // Real-time location updates
  }
}
```

### **3. Hybrid Integration**
```typescript
// Use Supabase for data, Firebase for real-time features
const handleSwipe = async (action: 'like' | 'dislike' | 'superlike') => {
  // Store swipe in Supabase
  await MatchingService.recordSwipe(user.id, currentUser.id, action);
  
  // Send push notification via Firebase
  if (action === 'like') {
    await FirebaseService.sendPushNotification(
      currentUser.id,
      'New Like!',
      `${user.name} liked your profile!`
    );
  }
};
```

## **🎯 Benefits of This Approach:**

1. **Start Simple**: Supabase handles everything initially
2. **Cost-Effective**: Free tier covers most needs
3. **Easy to Scale**: Add Firebase when needed
4. **Better Location**: PostGIS for geospatial queries
5. **Real-time Chat**: Built-in subscriptions
6. **Type Safety**: Full TypeScript support

## **📊 Free Tier Limits:**

- **500MB database storage**
- **1GB file storage**
- **50K reads/day**
- **50K writes/day**
- **50K users**

This should be sufficient for testing and initial launch!

## **🚀 Next Steps:**

1. Set up Supabase project
2. Run the SQL setup
3. Update your app with the services
4. Test all features
5. Deploy to App Store
6. Add Firebase when you need push notifications

Would you like me to help you implement any specific part of this setup? 