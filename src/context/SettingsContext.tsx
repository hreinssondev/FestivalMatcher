import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  pushNotifications: boolean;
  locationServices: boolean;
  profileVisibility: boolean;
  showOnlineStatus: boolean;
  allowMessagesFromStrangers: boolean;
  autoPlayVideos: boolean;
}

interface SettingsContextType {
  settings: SettingsState;
  updateSetting: (key: keyof SettingsState, value: boolean) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const defaultSettings: SettingsState = {
  pushNotifications: true,
  locationServices: true,
  profileVisibility: true,
  showOnlineStatus: true,
  allowMessagesFromStrangers: false,
  autoPlayVideos: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('app_settings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading settings:', error);
      setIsLoaded(true);
    }
  };

  const updateSetting = async (key: keyof SettingsState, value: boolean) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      
      // Handle specific setting changes
      switch (key) {
        case 'pushNotifications':
          // Here you would integrate with actual push notification service
          console.log('Push notifications:', value ? 'enabled' : 'disabled');
          break;
        case 'locationServices':
          // Here you would handle location permissions
          console.log('Location services:', value ? 'enabled' : 'disabled');
          break;
        case 'profileVisibility':
          // Here you would update profile visibility in backend
          console.log('Profile visibility:', value ? 'public' : 'private');
          break;
        case 'showOnlineStatus':
          console.log('Online status:', value ? 'visible' : 'hidden');
          break;
        case 'allowMessagesFromStrangers':
          console.log('Messages from strangers:', value ? 'allowed' : 'blocked');
          break;
        case 'autoPlayVideos':
          console.log('Auto-play videos:', value ? 'enabled' : 'disabled');
          break;
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      // Revert the change if saving failed
      setSettings(settings);
    }
  };

  const resetSettings = async () => {
    try {
      setSettings(defaultSettings);
      await AsyncStorage.setItem('app_settings', JSON.stringify(defaultSettings));
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  };

  if (!isLoaded) {
    return null; // Or a loading spinner
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
