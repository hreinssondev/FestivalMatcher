import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PremiumContextType {
  isPremium: boolean;
  premiumExpiryDate: Date | null;
  activatePremium: (expiryDate: Date) => Promise<void>;
  deactivatePremium: () => Promise<void>;
  checkPremiumStatus: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};

interface PremiumProviderProps {
  children: React.ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpiryDate, setPremiumExpiryDate] = useState<Date | null>(null);

  const activatePremium = async (expiryDate: Date) => {
    try {
      await AsyncStorage.setItem('premiumExpiryDate', expiryDate.toISOString());
      setIsPremium(true);
      setPremiumExpiryDate(expiryDate);
    } catch (error) {
      console.error('Error activating premium:', error);
    }
  };

  const deactivatePremium = async () => {
    try {
      await AsyncStorage.removeItem('premiumExpiryDate');
      setIsPremium(false);
      setPremiumExpiryDate(null);
    } catch (error) {
      console.error('Error deactivating premium:', error);
    }
  };

  const checkPremiumStatus = async () => {
    try {
      const expiryDateString = await AsyncStorage.getItem('premiumExpiryDate');
      if (expiryDateString) {
        const expiryDate = new Date(expiryDateString);
        const now = new Date();
        
        if (expiryDate > now) {
          // Premium is still valid
          setIsPremium(true);
          setPremiumExpiryDate(expiryDate);
        } else {
          // Premium has expired
          await deactivatePremium();
        }
      } else {
        // No premium data found
        setIsPremium(false);
        setPremiumExpiryDate(null);
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
      setPremiumExpiryDate(null);
    }
  };

  useEffect(() => {
    checkPremiumStatus();
  }, []);

  const value: PremiumContextType = {
    isPremium,
    premiumExpiryDate,
    activatePremium,
    deactivatePremium,
    checkPremiumStatus,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
};
