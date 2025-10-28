import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DeviceAuthService } from '../services/deviceAuthService';

interface ProfileData {
  name: string;
  age: number;
  gender: string;
  festival: string;
  ticketType: string;
  accommodation: string;
  locationPermission: boolean;
  photos: string[];
  profilePhotoIndex: number;
  interests: string[];
  instagram?: string;
}

interface ProfileContextType {
  profileData: ProfileData;
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
  refreshProfile: () => Promise<void>;
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
    gender: 'male',
    festival: 'Defqon.1',
    ticketType: 'General Admission',
    accommodation: 'Friends Camp',
    locationPermission: false,
    photos: [],
    profilePhotoIndex: 0,
    interests: [],
  });

  // Load user data from database on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const result = await DeviceAuthService.getCurrentUser();
      if (result.user && !result.error) {
        console.log('ProfileContext loading user data:', result.user);
        console.log('Interests from database:', result.user.interests);
        setProfileData({
          name: result.user.name || 'Hlynur',
          age: result.user.age || 25,
          festival: result.user.festival || 'Defqon.1',
          ticketType: result.user.ticket_type || 'General Admission',
          accommodation: result.user.accommodation_type || 'Friends Camp',
          locationPermission: false,
          photos: result.user.photos || [],
          profilePhotoIndex: 0,
          interests: result.user.interests || [],
          instagram: result.user.instagram || '',
        });
        console.log('ProfileData set with interests:', result.user.interests || []);
      } else {
        console.log('Error loading user or no user found:', result.error);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const updateProfile = async (data: Partial<ProfileData>) => {
    console.log('ProfileContext updateProfile called with:', data);
    
    // Update local state immediately for responsive UI
    setProfileData(prev => {
      const newData = { ...prev, ...data };
      console.log('ProfileContext new data:', newData);
      return newData;
    });

    // Save to database
    try {
      const dbData: any = {};
      
      // Map ProfileData fields to database fields
      if (data.name !== undefined) dbData.name = data.name;
      if (data.age !== undefined) dbData.age = data.age;
      if (data.festival !== undefined) dbData.festival = data.festival;
      if (data.ticketType !== undefined) dbData.ticket_type = data.ticketType;
      if (data.accommodation !== undefined) dbData.accommodation_type = data.accommodation;
      if (data.interests !== undefined) dbData.interests = data.interests;
      if (data.photos !== undefined) dbData.photos = data.photos;
      if (data.instagram !== undefined) dbData.instagram = data.instagram;

      console.log('Saving to database:', dbData);
      const result = await DeviceAuthService.updateUserProfile(dbData);
      if (result.error) {
        console.error('Error saving profile to database:', result.error);
      } else {
        console.log('Profile saved to database successfully:', result);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const refreshProfile = async () => {
    await loadUserData();
  };

  return (
    <ProfileContext.Provider value={{ profileData, updateProfile, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}; 