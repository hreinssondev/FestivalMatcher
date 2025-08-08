import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProfileData {
  name: string;
  age: number;
  gender: string;
  festival: string;
  accommodation: string;
  locationPermission: boolean;
  photos: string[];
  profilePhotoIndex: number;
}

interface ProfileContextType {
  profileData: ProfileData;
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const [profileData, setProfileData] = useState<ProfileData>({
    name: 'Hlynur',
    age: 25,
    gender: 'Male',
    festival: 'Defqon.1',
    accommodation: 'Friends Camp',
    locationPermission: false,
    photos: [],
    profilePhotoIndex: 0,
  });

  const updateProfile = async (data: Partial<ProfileData>) => {
    setProfileData(prev => ({ ...prev, ...data }));
  };

  return (
    <ProfileContext.Provider value={{ profileData, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}; 