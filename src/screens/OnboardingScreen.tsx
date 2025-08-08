import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
  FlatList,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useProfile } from '../context/ProfileContext';

const { width, height } = Dimensions.get('window');

interface OnboardingData {
  name: string;
  age: string;
  gender: string;
  festival: string;
  accommodation: string;
  locationPermission: boolean;
  photos: string[];
  profilePhotoIndex: number;
}

const festivals = [
  'Defqon.1',
  'Tomorrowland',
  'Ultra Music Festival',
  'Electric Daisy Carnival',
  'Coachella',
  'Burning Man',
  'Sziget Festival',
  'Lowlands',
  'Glastonbury',
  'Other',
];

const accommodations = [
  'Hotel',
  'Camping',
  'Friends Camp',
  'VIP Camping',
  'Day Trip',
  'Other',
];

const genders = [
  'Male',
  'Female',
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { updateProfile } = useProfile();
  const scrollViewRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);
  const ageInputRef = useRef<TextInput>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    age: '',
    gender: '',
    festival: '',
    accommodation: '',
    locationPermission: false,
    photos: [],
    profilePhotoIndex: 0,
  });

  const [showAccommodationPicker, setShowAccommodationPicker] = useState(false);
  const [showFestivalPicker, setShowFestivalPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [slotAssignments, setSlotAssignments] = useState<{ [key: number]: number }>({});
  

  


  const steps = [
    { id: 0, title: 'Welcome to FestivalMatcher', subtitle: 'Tell us about yourself' },
    { id: 1, title: 'What\'s your gender?', subtitle: 'Help us find better matches' },
    { id: 2, title: 'Which Festival?', subtitle: 'Find people going to the same event' },
    { id: 3, title: 'Where are you staying?', subtitle: 'Optional - helps with planning meetups' },
    { id: 4, title: 'Location Access', subtitle: 'Find people nearby' },
    { id: 5, title: 'Add Photos', subtitle: 'Show yourself off' },
  ];

  // Auto-focus name input when component mounts
  useEffect(() => {
    if (currentStep === 0) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return data.name.trim().length > 0 && data.age.trim().length > 0 && parseInt(data.age) >= 18;
      case 1: return data.gender.length > 0;
      case 2: return data.festival.length > 0;
      case 3: return true; // Optional accommodation
      case 4: return true; // Can proceed regardless
      case 5: return data.photos.length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      // Scroll to top when moving to next step
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      // Scroll to top when moving to previous step
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  const handleLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      updateData('locationPermission', status === 'granted');
      
      if (status === 'granted') {
        Alert.alert('Location Access Granted', 'You can now find people nearby at festivals!');
      } else {
        Alert.alert('Location Access Denied', 'You can enable this later in Settings.');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('Error', 'Failed to request location permission. You can enable this later.');
    }
  };

  const handleAddPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos to add profile pictures.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 6 - data.photos.length, // Max 6 photos total
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map(asset => asset.uri);
        updateData('photos', [...data.photos, ...newPhotos]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to add photo. Please try again.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = data.photos.filter((_, i) => i !== index);
    let newProfilePhotoIndex = data.profilePhotoIndex;
    
    // Adjust profile photo index if needed
    if (index === data.profilePhotoIndex) {
      newProfilePhotoIndex = 0;
    } else if (index < data.profilePhotoIndex) {
      newProfilePhotoIndex = Math.max(0, data.profilePhotoIndex - 1);
    }
    
    updateData('photos', newPhotos);
    updateData('profilePhotoIndex', newProfilePhotoIndex);
  };

  const handleSetProfilePhoto = (index: number) => {
    updateData('profilePhotoIndex', index);
  };

  const handleComplete = async () => {
    try {
      // Save to profile context
      await updateProfile({
        name: data.name,
        age: parseInt(data.age),
        gender: data.gender,
        festival: data.festival,
        accommodation: data.accommodation,
        locationPermission: data.locationPermission,
        photos: data.photos,
        profilePhotoIndex: data.profilePhotoIndex,
      });

      // Mark onboarding as completed
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
             case 0: // Basic Info (Name, Age)
         return (
           <View style={styles.stepContainer}>
             {/* Name */}
             <View style={styles.fieldSection}>
               <Text style={styles.fieldTitle}>What's your name?</Text>
               <TextInput
                 ref={nameInputRef}
                 style={styles.textInput}
                 value={data.name}
                 onChangeText={(text) => updateData('name', text)}
                 placeholder="Enter your name"
                 placeholderTextColor="#666"
                 returnKeyType="next"
                 onSubmitEditing={() => {
                   ageInputRef.current?.focus();
                   // Scroll to age field
                   setTimeout(() => {
                     scrollViewRef.current?.scrollTo({ y: 200, animated: true });
                   }, 100);
                 }}
                 keyboardAppearance="dark"
               />
             </View>

             {/* Age */}
             <View style={styles.fieldSection}>
               <Text style={styles.fieldTitle}>How old are you?</Text>
               <TextInput
                 ref={ageInputRef}
                 style={styles.textInput}
                 value={data.age}
                 onChangeText={(text) => updateData('age', text.replace(/[^0-9]/g, ''))}
                 placeholder="Enter your age"
                 placeholderTextColor="#666"
                 keyboardType="numeric"
                 returnKeyType="done"
                 onSubmitEditing={() => {
                   Keyboard.dismiss();
                   handleNext();
                 }}
                 keyboardAppearance="dark"
               />
               {data.age && parseInt(data.age) < 18 && (
                 <Text style={styles.errorText}>You must be 18 or older to use this app</Text>
               )}
             </View>
           </View>
         );

             case 1: // Gender Selection
         return (
           <View style={styles.stepContainer}>
             <View style={styles.fieldSection}>
               <Text style={styles.fieldTitle}>What's your gender?</Text>
               <TouchableOpacity
                 style={styles.pickerButton}
                 onPress={() => setShowGenderPicker(!showGenderPicker)}
               >
                 <Text style={[styles.pickerButtonText, data.gender ? styles.pickerButtonTextFilled : null]}>
                   {data.gender || 'Select your gender'}
                 </Text>
                 <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
               </TouchableOpacity>
               
               {showGenderPicker && (
                 <View style={styles.pickerContainer}>
                   {genders.map((gender) => (
                     <TouchableOpacity
                       key={gender}
                       style={styles.pickerOption}
                       onPress={() => {
                         updateData('gender', gender);
                         setShowGenderPicker(false);
                         handleNext();
                       }}
                     >
                       <Text style={styles.pickerOptionText}>{gender}</Text>
                       {data.gender === gender && (
                         <MaterialIcons name="check" size={20} color="#FF6B6B" />
                       )}
                     </TouchableOpacity>
                   ))}
                 </View>
               )}
             </View>
           </View>
         );

             case 2: // Festival Selection
         return (
           <View style={styles.stepContainer}>
             <View style={styles.fieldSection}>
               <TouchableOpacity
                 style={styles.pickerButton}
                 onPress={() => setShowFestivalPicker(!showFestivalPicker)}
               >
                 <Text style={[styles.pickerButtonText, data.festival ? styles.pickerButtonTextFilled : null]}>
                   {data.festival || 'Select a festival'}
                 </Text>
                 <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
               </TouchableOpacity>
               
               {showFestivalPicker && (
                 <View style={styles.pickerContainer}>
                   {festivals.map((festival) => (
                     <TouchableOpacity
                       key={festival}
                       style={styles.pickerOption}
                       onPress={() => {
                         updateData('festival', festival);
                         setShowFestivalPicker(false);
                         handleNext();
                       }}
                     >
                       <Text style={styles.pickerOptionText}>{festival}</Text>
                       {data.festival === festival && (
                         <MaterialIcons name="check" size={20} color="#FF6B6B" />
                       )}
                     </TouchableOpacity>
                   ))}
                 </View>
               )}
             </View>
           </View>
         );

       case 3: // Accommodation
         return (
           <View style={styles.stepContainer}>
             <View style={styles.fieldSection}>
               <TouchableOpacity
                 style={styles.pickerButton}
                 onPress={() => setShowAccommodationPicker(!showAccommodationPicker)}
               >
                 <Text style={[styles.pickerButtonText, data.accommodation ? styles.pickerButtonTextFilled : null]}>
                   {data.accommodation || 'Select accommodation (optional)'}
                 </Text>
                 <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
               </TouchableOpacity>
               
               {showAccommodationPicker && (
                 <View style={styles.pickerContainer}>
                   {accommodations.map((accommodation) => (
                     <TouchableOpacity
                       key={accommodation}
                       style={styles.pickerOption}
                       onPress={() => {
                         updateData('accommodation', accommodation);
                         setShowAccommodationPicker(false);
                         handleNext();
                       }}
                     >
                       <Text style={styles.pickerOptionText}>{accommodation}</Text>
                       {data.accommodation === accommodation && (
                         <MaterialIcons name="check" size={20} color="#FF6B6B" />
                       )}
                     </TouchableOpacity>
                   ))}
                 </View>
               )}
             </View>
           </View>
         );

             case 4: // Location Access
         return (
           <View style={styles.stepContainer}>
             <View style={styles.fieldSection}>
               <Text style={styles.locationText}>
                 Allow location access to find people nearby at festivals and discover local events.
               </Text>
               
               <TouchableOpacity
                 style={styles.locationButton}
                 onPress={handleLocationPermission}
               >
                 <MaterialIcons name="location-on" size={24} color="#FFFFFF" />
                 <Text style={styles.locationButtonText}>
                   {data.locationPermission ? 'Location Access Granted' : 'Enable Location Access'}
                 </Text>
               </TouchableOpacity>
               
               <TouchableOpacity
                 style={styles.skipLocationButton}
                 onPress={() => updateData('locationPermission', false)}
               >
                 <Text style={styles.skipLocationText}>Can be enabled later</Text>
               </TouchableOpacity>
             </View>
           </View>
         );

              case 5: // Photos
         return (
           <View style={styles.stepContainer}>
             <View style={styles.fieldSection}>
                              {/* Big Add Photos Button */}
               <View style={styles.bigAddPhotoContainer}>
                 <TouchableOpacity style={styles.bigAddPhotoButton} onPress={handleAddPhoto}>
                   <MaterialIcons name="add-a-photo" size={24} color="#FFFFFF" />
                   <Text style={styles.bigAddPhotoText}>Add Photos</Text>
                   <Text style={styles.bigAddPhotoSubtext}>Select photos for your profile</Text>
                 </TouchableOpacity>
               </View>
               
               {/* Photo Slots and Selection - Only show when photos exist */}
               {data.photos.length > 0 && (
                 <View style={styles.photoSlotsContainer}>
                   <Text style={styles.photoSlotsTitle}>Photo Slots</Text>
                   <Text style={styles.photoSlotsInstruction}>Select a slot then pick a photo</Text>
                   
                   {/* Top Row - Photo Slots */}
                   <View style={styles.photoSlotsRow}>
                     {[0, 1, 2, 3].map((slotIndex) => (
                       <TouchableOpacity
                         key={slotIndex}
                         style={[
                           styles.photoSlot,
                           selectedSlot === slotIndex && styles.photoSlotSelected
                         ]}
                         onPress={() => {
                           setSelectedSlot(slotIndex);
                         }}
                       >
                         {slotAssignments[slotIndex] !== undefined ? (
                           <Image 
                             source={{ uri: data.photos[slotAssignments[slotIndex]] }} 
                             style={styles.photoSlotImage} 
                           />
                         ) : (
                           <View style={styles.emptySlot}>
                             <MaterialIcons name="add" size={24} color="#666" />
                             <Text style={styles.emptySlotText}>{slotIndex + 1}</Text>
                           </View>
                         )}
                         <Text style={styles.slotNumber}>{slotIndex + 1}</Text>
                       </TouchableOpacity>
                     ))}
                   </View>
                   
                   {/* Bottom Row - Selected Photos */}
                   <View style={styles.selectedPhotosContainer}>
                     <Text style={styles.selectedPhotosTitle}>Your Photos</Text>
                     <View style={styles.selectedPhotosRow}>
                       {data.photos.map((photo, index) => (
                         <TouchableOpacity
                           key={index}
                           style={styles.selectedPhotoContainer}
                           onPress={() => {
                             // Assign this photo to the selected slot
                             if (selectedSlot !== null) {
                               setSlotAssignments(prev => ({
                                 ...prev,
                                 [selectedSlot]: index
                               }));
                               setSelectedSlot(null);
                             }
                           }}
                         >
                           <Image source={{ uri: photo }} style={styles.selectedPhotoImage} />
                           <View style={styles.selectedPhotoOverlay}>
                             <Text style={styles.selectedPhotoNumber}>{index + 1}</Text>
                           </View>
                         </TouchableOpacity>
                       ))}
                     </View>
                   </View>
                 </View>
               )}
             </View>
           </View>
         );

      default:
        return null;
    }
  };

  return (
    <LinearGradient
      colors={['#1A1A1A', '#2D2D2D']}
      style={styles.container}
    >
      <View style={styles.mainContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >


          {/* Step Content */}
          <View style={styles.content}>
            {currentStep === 0 ? (
              <View style={styles.welcomeHeader}>
                <Text style={styles.welcomeText}>Welcome to the</Text>
                <Text style={styles.brandText}>FestivalMatcher</Text>
                <Text style={styles.stepSubtitle}>{steps[currentStep].subtitle}</Text>
              </View>
            ) : currentStep !== 4 ? (
              <>
                <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
                <Text style={styles.stepSubtitle}>{steps[currentStep].subtitle}</Text>
              </>
            ) : null}
            
            {renderStep()}
          </View>
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={[
          styles.navigationContainer,
          isKeyboardVisible && styles.navigationContainerWithKeyboard
        ]}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.nextButton,
              !canProceed() && styles.nextButtonDisabled
            ]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
            </Text>
            <MaterialIcons 
              name={currentStep === steps.length - 1 ? "check" : "arrow-forward"} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 40,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 40,
    textAlign: 'center',
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    minHeight: 400,
    paddingTop: 20,
  },
  fieldSection: {
    width: '100%',
    marginBottom: 20,
  },
  fieldTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  fieldSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  textInput: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pickerButton: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pickerButtonText: {
    fontSize: 18,
    color: '#666',
  },
  pickerButtonTextFilled: {
    color: '#FFFFFF',
  },
  pickerContainer: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  locationText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  skipLocationButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipLocationText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  photoInstructions: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  photoContainer: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
    padding: 8,
  },
  removePhotoButton: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setProfilePhotoButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'center',
  },
  setProfilePhotoText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  addPhotoButton: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  addPhotoText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  profileCardPreview: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileCard: {
    width: width * 0.9,
    height: height * 0.5,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },



  // Card styles - Same as SwipeScreen
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  card: {
    width: width * 0.9 + 4,
    height: height * 0.75 + 33,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  photoContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 20,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2D2D2D',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
    marginTop: 10,
  },
  photoIndicator: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  photoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  photoDotActive: {
    backgroundColor: '#FFFFFF',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    justifyContent: 'flex-end',
  },
  cardInfo: {
    padding: 20,
    paddingBottom: 30,
  },
  cardName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  festivalContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  festivalName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cardBio: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  bioLabel: {
    fontWeight: '600',
    color: '#FF6B6B',
  },
  addPhotoButtonSmall: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FF6B6B',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addPhotoButtonCorner: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FF6B6B',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bigAddPhotoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  bigAddPhotoButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bigAddPhotoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  bigAddPhotoSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
    opacity: 0.8,
  },
  // Small card styles
  smallCardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  smallCard: {
    width: width * 0.6,
    height: height * 0.4,
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  smallCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  smallPlaceholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2D2D2D',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallPlaceholderText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  smallPhotoIndicator: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  smallPhotoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  smallPhotoDotActive: {
    backgroundColor: '#FFFFFF',
  },
  smallCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    justifyContent: 'flex-end',
  },
  smallCardInfo: {
    padding: 15,
    paddingBottom: 20,
  },
  smallCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  smallFestivalContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  smallFestivalName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  smallAddPhotoButton: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: '#FF6B6B',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Photo slots styles
  photoSlotsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  photoSlotsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  photoSlotsInstruction: {
    fontSize: 14,
    color: '#999',
    marginBottom: 15,
    textAlign: 'center',
  },
  photoSlotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  photoSlot: {
    width: (width - 80) / 4,
    height: (width - 80) / 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D2D2D',
  },
  photoSlotSelected: {
    borderStyle: 'solid',
    borderColor: '#FF6B6B',
    borderWidth: 3,
  },
  photoSlotImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  emptySlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  slotNumber: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#FF6B6B',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selectedPhotosContainer: {
    marginTop: 20,
  },
  selectedPhotosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  selectedPhotosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  selectedPhotoContainer: {
    width: (width - 80) / 4,
    height: (width - 80) / 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  selectedPhotoImage: {
    width: '100%',
    height: '100%',
  },
  selectedPhotoOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#FF6B6B',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPhotoNumber: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  photoManagement: {
    marginTop: 20,
  },
  photoManagementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  photoManagementSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 15,
    textAlign: 'center',
  },
  photoThumbnailContainer: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  photoThumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
    padding: 8,
  },
  draggedThumbnail: {
    opacity: 0.7,
    transform: [{ scale: 1.1 }],
    zIndex: 1000,
  },
  photoNumberBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#FF6B6B',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#FFD700',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setProfilePhotoButton: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
  },
  setProfilePhotoText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },

  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 20,
  },
  navigationContainerWithKeyboard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  nextButtonDisabled: {
    backgroundColor: 'rgba(255, 107, 107, 0.5)',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default OnboardingScreen; 