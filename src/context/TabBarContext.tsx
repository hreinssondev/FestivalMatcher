import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TabBarContextType {
  isTabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
}

const TabBarContext = createContext<TabBarContextType | undefined>(undefined);

export const TabBarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);

  const setTabBarVisible = (visible: boolean) => {
    setIsTabBarVisible(visible);
  };

  return (
    <TabBarContext.Provider value={{ isTabBarVisible, setTabBarVisible }}>
      {children}
    </TabBarContext.Provider>
  );
};

export const useTabBar = () => {
  const context = useContext(TabBarContext);
  if (context === undefined) {
    throw new Error('useTabBar must be used within a TabBarProvider');
  }
  return context;
};
