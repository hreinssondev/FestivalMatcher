import React, { createContext, useContext, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserCountContextType {
  hasUserCountFeature: boolean;
  activateUserCountFeature: () => Promise<void>;
  deactivateUserCountFeature: () => Promise<void>;
}

const UserCountContext = createContext<UserCountContextType | undefined>(undefined);

export const useUserCount = () => {
  const context = useContext(UserCountContext);
  if (context === undefined) {
    throw new Error('useUserCount must be used within a UserCountProvider');
  }
  return context;
};

interface UserCountProviderProps {
  children: ReactNode;
}

export const UserCountProvider: React.FC<UserCountProviderProps> = ({ children }) => {
  const [hasUserCountFeature, setHasUserCountFeature] = useState(false);

  const activateUserCountFeature = async () => {
    try {
      await AsyncStorage.setItem('hasUserCountFeature', 'true');
      setHasUserCountFeature(true);
    } catch (error) {
      console.error('Error activating user count feature:', error);
    }
  };

  const deactivateUserCountFeature = async () => {
    try {
      await AsyncStorage.removeItem('hasUserCountFeature');
      setHasUserCountFeature(false);
    } catch (error) {
      console.error('Error deactivating user count feature:', error);
    }
  };

  // Load initial state from AsyncStorage
  React.useEffect(() => {
    const loadUserCountFeature = async () => {
      try {
        const stored = await AsyncStorage.getItem('hasUserCountFeature');
        setHasUserCountFeature(stored === 'true');
      } catch (error) {
        console.error('Error loading user count feature state:', error);
      }
    };

    loadUserCountFeature();
  }, []);

  const value = {
    hasUserCountFeature,
    activateUserCountFeature,
    deactivateUserCountFeature,
  };

  return (
    <UserCountContext.Provider value={value}>
      {children}
    </UserCountContext.Provider>
  );
};
