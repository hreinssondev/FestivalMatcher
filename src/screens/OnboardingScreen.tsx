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
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useProfile } from '../context/ProfileContext';
import { DeviceAuthService } from '../services/deviceAuthService';

const { width, height } = Dimensions.get('window');

interface OnboardingData {
  name: string;
  age: string;
  festival: string;
  ticketType: string;
  accommodation: string;
  locationPermission: boolean;
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
];

const accommodations = [
  'Hotel',
  'Camping',
  'Friends Camp',
  'VIP Camping',
  'Day Trip',
];

const ticketTypes = [
  'General Admission',
  'VIP',
  'Premium',
  'Backstage Pass',
  'Artist Pass',
  'Media Pass',
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { updateProfile, refreshProfile } = useProfile();
  const scrollViewRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);
  const ageInputRef = useRef<TextInput>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    age: '',
    festival: '',
    ticketType: '',
    accommodation: '',
    locationPermission: false,
  });

  const [showAccommodationPicker, setShowAccommodationPicker] = useState(false);
  const [showFestivalPicker, setShowFestivalPicker] = useState(false);
  const [showTicketTypePicker, setShowTicketTypePicker] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState('');
  const [customInputField, setCustomInputField] = useState<keyof OnboardingData | null>(null);

  const steps = [
    { id: 0, title: 'Welcome to FestivalMatcher', subtitle: 'Tell us about yourself' },
    { id: 1, title: 'Which Festival?', subtitle: '' },
    { id: 2, title: 'What\'s your ticket?', subtitle: '' },
    { id: 3, title: 'Where are you staying?', subtitle: '' },
    { id: 4, title: 'Location Ping', subtitle: '' },
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

  const handleCustomInput = (field: keyof OnboardingData) => {
    setCustomInputField(field);
    setCustomInputValue('');
    setShowCustomInput(true);
  };

  const handleCustomInputSubmit = () => {
    if (customInputValue.trim() && customInputField) {
      updateData(customInputField, customInputValue.trim());
      setShowCustomInput(false);
      setCustomInputValue('');
      setCustomInputField(null);
      
      // Close the picker and move to next step
      setShowFestivalPicker(false);
      setShowTicketTypePicker(false);
      setShowAccommodationPicker(false);
      handleNext();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return data.name.trim().length > 0 && data.age.trim().length > 0 && parseInt(data.age) >= 18;
      case 1: return data.festival.length > 0;
      case 2: return data.ticketType.length > 0;
      case 3: return true; // Optional accommodation
      case 4: return true; // Can proceed regardless
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
        // Complete onboarding after location step
        setTimeout(() => {
          handleComplete();
        }, 1000);
      } else {
        Alert.alert(
          'Location Access Required', 
          'Location access is required to use FestivalMatcher. Please enable location services to continue.',
          [
            { text: 'Try Again', onPress: () => handleLocationPermission() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert(
        'Location Access Required', 
        'Location access is required to use FestivalMatcher. Please try again.',
        [
          { text: 'Try Again', onPress: () => handleLocationPermission() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };





  const handleComplete = async () => {
    try {
      console.log('Starting onboarding completion...');
      
      // Validate age before proceeding
      const age = parseInt(data.age);
      console.log('Age validation:', { rawAge: data.age, parsedAge: age, isValid: age >= 18 });
      
      if (isNaN(age) || age < 18) {
        throw new Error(`Invalid age: ${data.age}. Must be 18 or older.`);
      }
      
      // Sign in with device (creates or gets existing user)
      console.log('Signing in with device...');
      const deviceResult = await DeviceAuthService.signInWithDevice();
      if (deviceResult.error) {
        console.error('Device sign in error:', deviceResult.error);
        throw deviceResult.error;
      }
      console.log('Device sign in successful:', deviceResult.user);

      // Update user profile with onboarding data
      console.log('Updating user profile with data:', {
        name: data.name,
        age: age,
        festival: data.festival,
        accommodation: data.accommodation,
      });
      
      const updateResult = await DeviceAuthService.updateUserProfile({
        name: data.name,
        age: age,
        festival: data.festival,
        ticket_type: data.ticketType,
        accommodation_type: data.accommodation,
        interests: [], // Will be added later
      });
      console.log('Database update result:', updateResult);

      if (updateResult.error) {
        console.error('Profile update error:', updateResult.error);
        throw updateResult.error;
      }
      console.log('Profile update successful:', updateResult.profile);

      // Save to profile context FIRST (before database)
      console.log('Saving to profile context...');
      await updateProfile({
        name: data.name,
        age: age,
        festival: data.festival,
        ticketType: data.ticketType,
        accommodation: data.accommodation,
        locationPermission: data.locationPermission,
      });
      console.log('Profile context updated');

      // Mark onboarding as completed and go to profile
      console.log('Marking onboarding as completed...');
      await AsyncStorage.setItem('onboarding_completed', 'true');
      
      console.log('Onboarding completed successfully!');
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      
      // More specific error messages
      let errorMessage = 'Failed to save your profile. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('database') || error.message.includes('supabase')) {
          errorMessage = 'Database error. Please make sure your Supabase is properly configured.';
        } else if (error.message.includes('permission') || error.message.includes('auth')) {
          errorMessage = 'Authentication error. Please try again.';
        }
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
             case 0: // Basic Info (Name, Age)
         return (
           <View style={styles.stepContainer}>
             {/* Name */}
             <View style={styles.fieldSection}>
                               <Text style={styles.fieldTitle}>Name</Text>
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
               <Text style={styles.fieldTitle}>Age</Text>
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



             case 1: // Festival Selection
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
                   <TouchableOpacity
                     style={[styles.pickerOption, styles.customInputOption]}
                     onPress={() => handleCustomInput('festival')}
                   >
                     <Text style={[styles.pickerOptionText, styles.customInputText]}>✏️ Write yourself</Text>
                     <MaterialIcons name="edit" size={20} color="#FF6B6B" />
                   </TouchableOpacity>
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

             case 2: // Ticket Type Selection
         return (
           <View style={styles.stepContainer}>
             <View style={styles.fieldSection}>
               <TouchableOpacity
                 style={styles.pickerButton}
                 onPress={() => setShowTicketTypePicker(!showTicketTypePicker)}
               >
                 <Text style={[styles.pickerButtonText, data.ticketType ? styles.pickerButtonTextFilled : null]}>
                   {data.ticketType || 'Select your ticket type'}
                 </Text>
                 <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
               </TouchableOpacity>
               
               {showTicketTypePicker && (
                 <View style={styles.pickerContainer}>
                   <TouchableOpacity
                     style={[styles.pickerOption, styles.customInputOption]}
                     onPress={() => handleCustomInput('ticketType')}
                   >
                     <Text style={[styles.pickerOptionText, styles.customInputText]}>✏️ Write yourself</Text>
                     <MaterialIcons name="edit" size={20} color="#FF6B6B" />
                   </TouchableOpacity>
                   {ticketTypes.map((ticketType) => (
                     <TouchableOpacity
                       key={ticketType}
                       style={styles.pickerOption}
                       onPress={() => {
                         updateData('ticketType', ticketType);
                         setShowTicketTypePicker(false);
                         handleNext();
                       }}
                     >
                       <Text style={styles.pickerOptionText}>{ticketType}</Text>
                       {data.ticketType === ticketType && (
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
                   <TouchableOpacity
                     style={[styles.pickerOption, styles.customInputOption]}
                     onPress={() => handleCustomInput('accommodation')}
                   >
                     <Text style={[styles.pickerOptionText, styles.customInputText]}>✏️ Write yourself</Text>
                     <MaterialIcons name="edit" size={20} color="#FF6B6B" />
                   </TouchableOpacity>
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
             <View style={styles.locationSection}>
               <TouchableOpacity
                 style={styles.locationButton}
                 onPress={handleLocationPermission}
               >
                 <MaterialIcons name="location-on" size={24} color="#FFFFFF" />
                 <Text style={styles.locationButtonText}>
                   {data.locationPermission ? 'Location Access Granted' : 'Enable Location Access (Required)'}
                 </Text>
               </TouchableOpacity>
               
               <Text style={styles.locationText}>
                 Location access is required to use FestivalMatcher. Your location will be used to find people nearby at festivals. Rough location sharing to other users is enabled by default but you can turn it off in settings for better privacy control.
               </Text>
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
                <Text style={styles.welcomeText}>Welcome to</Text>
                <Text style={styles.brandText}>FestivalMatcher</Text>
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
          isKeyboardVisible && styles.navigationContainerWithKeyboard,
          currentStep === 0 && styles.navigationContainerFirstStep
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
          
          {currentStep !== steps.length - 1 && (
            <TouchableOpacity
              style={[
                styles.nextButton,
                !canProceed() && styles.nextButtonDisabled
              ]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <MaterialIcons 
                name="arrow-forward" 
                size={24} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Custom Input Modal */}
        {showCustomInput && (
          <Modal
            animationType="fade"
            transparent={true}
            visible={showCustomInput}
            onRequestClose={() => setShowCustomInput(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {customInputField === 'festival' && 'Enter Festival Name'}
                  {customInputField === 'ticketType' && 'Enter Ticket Type'}
                  {customInputField === 'accommodation' && 'Enter Accommodation Type'}
                </Text>
                
                <TextInput
                  style={styles.modalInput}
                  value={customInputValue}
                  onChangeText={setCustomInputValue}
                  placeholder={`Enter ${customInputField}...`}
                  placeholderTextColor="#666"
                  autoFocus
                  onSubmitEditing={handleCustomInputSubmit}
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalButtonCancel}
                    onPress={() => setShowCustomInput(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButtonSubmit, !customInputValue.trim() && styles.modalButtonDisabled]}
                    onPress={handleCustomInputSubmit}
                    disabled={!customInputValue.trim()}
                  >
                    <Text style={styles.modalButtonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

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
    paddingTop: 120,
  },

  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: -30,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 33,
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
    marginBottom: 0,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    minHeight: 400,
    paddingTop: 13,
  },
  fieldSection: {
    width: '100%',
    marginBottom: 20,
  },
  locationSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  photosSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  photosSummaryContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  photosSummaryText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  completeButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  customInputOption: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  customInputText: {
    color: '#FF6B6B',
    fontWeight: '600',
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
  skipPhotosContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  skipPhotosButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
    alignItems: 'center',
  },
  skipPhotosText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  skipPhotosSubtext: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
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

  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 20,
  },
  navigationContainerFirstStep: {
    justifyContent: 'flex-end',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 80,
  },
  modalContent: {
    backgroundColor: '#2D2D2D',
    borderRadius: 16,
    padding: 24,
    width: width * 0.8,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSubmit: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    backgroundColor: 'rgba(255, 107, 107, 0.5)',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

});

export default OnboardingScreen; 