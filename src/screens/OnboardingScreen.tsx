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
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useProfile } from '../context/ProfileContext';
import { DeviceAuthService } from '../services/deviceAuthService';
import { PhotoService } from '../services/photoService';

const { width, height } = Dimensions.get('window');

interface OnboardingData {
  name: string;
  age: string;
  gender: string;
  festival: string[];
  ticketType: { [festival: string]: string };
  accommodation: { [festival: string]: string };
  photos: string[];
  bio: string;
  locationPermission: boolean;
  pushNotifications: boolean;
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
  const festivalCustomInputRef = useRef<TextInput>(null);
  const ticketTypeCustomInputRef = useRef<TextInput>(null);
  const accommodationCustomInputRef = useRef<TextInput>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [animatingItem, setAnimatingItem] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    age: '',
    gender: '',
    festival: [],
    ticketType: {},
    accommodation: {},
    photos: [],
    bio: '',
    locationPermission: false,
    pushNotifications: false,
  });

  const [showAccommodationPicker, setShowAccommodationPicker] = useState(false);
  const [showFestivalPicker, setShowFestivalPicker] = useState(false);
  const [showTicketTypePicker, setShowTicketTypePicker] = useState(false);
  const [selectedFestivalForTicket, setSelectedFestivalForTicket] = useState<string | null>(null);
  const [selectedFestivalForAccommodation, setSelectedFestivalForAccommodation] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState('');
  const [customInputField, setCustomInputField] = useState<keyof OnboardingData | null>(null);
  const [showFestivalCustomInput, setShowFestivalCustomInput] = useState(false);
  const [showTicketTypeCustomInput, setShowTicketTypeCustomInput] = useState(false);
  const [showAccommodationCustomInput, setShowAccommodationCustomInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const steps = [
    { id: 0, title: 'Welcome to FestivalMatcher', subtitle: 'Tell us about yourself' },
    { id: 1, title: 'Which Festivals?', subtitle: 'Which festivals are you attending this year?  You can add multiple.' },
    { id: 2, title: 'What\'s your ticket?', subtitle: '' },
    { id: 3, title: 'Accommodation', subtitle: '' },
    { id: 4, title: 'Add Photos', subtitle: '' },
    { id: 5, title: 'About You', subtitle: '' },
    { id: 6, title: 'Location Ping', subtitle: '' },
    { id: 7, title: 'Push Notifications', subtitle: '' },
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

  // Focus festival custom input when shown
  useEffect(() => {
    if (showFestivalCustomInput) {
      const timer = setTimeout(() => {
        festivalCustomInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showFestivalCustomInput]);

  // Focus ticket type custom input when shown
  useEffect(() => {
    if (showTicketTypeCustomInput) {
      const timer = setTimeout(() => {
        ticketTypeCustomInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showTicketTypeCustomInput]);

  // Focus accommodation custom input when shown
  useEffect(() => {
    if (showAccommodationCustomInput) {
      const timer = setTimeout(() => {
        accommodationCustomInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showAccommodationCustomInput]);

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
      case 2: return data.festival.every(fest => data.ticketType[fest]?.length > 0);
      case 3: return true; // Optional accommodation
      case 4: return true; // Photos are optional
      case 5: return true; // Bio is optional
      case 6: return true; // Can proceed regardless
      case 7: return true; // Can proceed regardless
      default: return false;
    }
  };

  const playSuccessAnimation = (itemId: string, callback: () => void) => {
    setAnimatingItem(itemId);
    
    // Just show color change briefly, then proceed
    setTimeout(() => {
      setAnimatingItem(null);
      callback();
    }, 290);
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

  const handleSelectionWithAnimation = (itemId: string, onSelect: () => void) => {
    playSuccessAnimation(itemId, () => {
      onSelect();
      handleNext();
    });
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
        // Go to next page (notifications)
        handleNext();
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

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need permission to access your photos.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 5],
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map(asset => asset.uri);
        const updatedPhotos = [...data.photos, ...newPhotos].slice(0, 6); // Max 6 photos
        setData(prev => ({ ...prev, photos: updatedPhotos }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = data.photos.filter((_, i) => i !== index);
    setData(prev => ({ ...prev, photos: updatedPhotos }));
  };

  const movePhoto = (fromIndex: number, toIndex: number) => {
    const updatedPhotos = [...data.photos];
    const [movedPhoto] = updatedPhotos.splice(fromIndex, 1);
    updatedPhotos.splice(toIndex, 0, movedPhoto);
    setData(prev => ({ ...prev, photos: updatedPhotos }));
  };



  const handleComplete = async () => {
    try {
      setIsUploading(true);
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

      // Upload photos if any were selected
      let photoUrls: string[] = [];
      if (data.photos.length > 0) {
        console.log('Uploading photos...');
        const deviceUserId = await DeviceAuthService.getDeviceUserId();
        
        // Test bucket access first
        const { success, error: bucketError } = await PhotoService.testBucketAccess();
        if (!success) {
          console.warn('Photo storage bucket not configured, skipping photo upload:', bucketError);
          // Continue without photos instead of failing
        } else {
          // Upload photos to Supabase Storage
          const { urls, error } = await PhotoService.uploadPhotos(deviceUserId, data.photos);
          
          if (error) {
            console.warn('Photo upload failed, continuing without photos:', error);
            // Continue without photos instead of failing
          } else {
            photoUrls = urls;
            console.log('Photos uploaded successfully:', photoUrls);
          }
        }
      }

      // Update user profile with onboarding data
      console.log('Updating user profile with data:', {
        name: data.name,
        age: age,
        festival: data.festival.join(', '),
        accommodation: Object.entries(data.accommodation).map(([fest, accom]) => `${fest}: ${accom}`).join(', '),
        photos: photoUrls.length,
      });
      
      const updateResult = await DeviceAuthService.updateUserProfile({
        name: data.name,
        age: age,
        festival: data.festival.join(', '),
        ticket_type: Object.entries(data.ticketType).map(([fest, ticket]) => `${fest}: ${ticket}`).join(', '),
        accommodation_type: Object.entries(data.accommodation).map(([fest, accom]) => `${fest}: ${accom}`).join(', '),
        interests: data.bio.trim() ? [data.bio.trim()] : [],
        photos: photoUrls, // Add uploaded photo URLs
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
        festival: data.festival.join(', '),
        ticketType: Object.entries(data.ticketType).map(([fest, ticket]) => `${fest}: ${ticket}`).join(', '),
        accommodation: Object.entries(data.accommodation).map(([fest, accom]) => `${fest}: ${accom}`).join(', '),
        locationPermission: data.locationPermission,
        photos: photoUrls, // Add uploaded photo URLs
      });
      console.log('Profile context updated');

      // Mark onboarding as completed and go to profile
      console.log('Marking onboarding as completed...');
      await AsyncStorage.setItem('onboarding_completed', 'true');
      await AsyncStorage.setItem('show_welcome_modal', 'true');
      
      console.log('Onboarding completed successfully!');
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsUploading(false);
      
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
              <Animated.View
                style={[
                  { width: '100%' }
                ]}
              >
                <TextInput
                  ref={ageInputRef}
                  style={[
                    styles.textInput,
                    animatingItem === 'age-input' && styles.textInputSelected
                  ]}
                  value={data.age}
                  onChangeText={(text) => updateData('age', text.replace(/[^0-9]/g, ''))}
                  placeholder="Enter your age"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (canProceed()) {
                      handleSelectionWithAnimation('age-input', () => {
                        Keyboard.dismiss();
                      });
                    }
                  }}
                  keyboardAppearance="dark"
                />
              </Animated.View>
              {data.age && parseInt(data.age) < 18 && (
                <Text style={styles.errorText}>You must be 18 or older to use this app</Text>
              )}
            </View>

            {/* Gender */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldTitle}>Gender</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    data.gender === 'male' && styles.genderOptionSelected
                  ]}
                  onPress={() => updateData('gender', 'male')}
                >
                  <Text style={[
                    styles.genderText,
                    data.gender === 'male' && styles.genderTextSelected
                  ]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    data.gender === 'female' && styles.genderOptionSelected
                  ]}
                  onPress={() => updateData('gender', 'female')}
                >
                  <Text style={[
                    styles.genderText,
                    data.gender === 'female' && styles.genderTextSelected
                  ]}>Female</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    data.gender === 'other' && styles.genderOptionSelected
                  ]}
                  onPress={() => updateData('gender', 'other')}
                >
                  <Text style={[
                    styles.genderText,
                    data.gender === 'other' && styles.genderTextSelected
                  ]}>Other</Text>
                </TouchableOpacity>
              </View>
            </View>
           </View>
         );



            case 1: // Festival Selection
        return (
          <View style={[styles.stepContainer, { marginTop: -11 }]}>
            <View style={styles.fieldSection}>
              {/* Display selected festivals as chips */}
              {data.festival.length > 0 && (
                <View style={styles.selectedChipsContainer}>
                  {data.festival.map((selectedFestival, index) => (
                    <View key={index} style={styles.festivalChip}>
                      <Text style={styles.festivalChipText}>{selectedFestival}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          const newFestivals = data.festival.filter((_, i) => i !== index);
                          updateData('festival', newFestivals);
                        }}
                      >
                        <MaterialIcons name="close" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {!showFestivalCustomInput ? (
                <>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowFestivalPicker(!showFestivalPicker)}
                  >
                    <Text style={[styles.pickerButtonText, data.festival.length > 0 ? styles.pickerButtonTextFilled : null]}>
                      {data.festival.length > 0 ? 'Add more festivals' : 'Select a festival'}
                    </Text>
                    <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
                  </TouchableOpacity>
                  
                  {showFestivalPicker && (
                    <View style={styles.pickerContainer}>
                      <TouchableOpacity
                        style={[styles.pickerOption, styles.customInputOption]}
                        onPress={() => {
                          setShowFestivalPicker(false);
                          setShowFestivalCustomInput(true);
                        }}
                      >
                        <Text style={[styles.pickerOptionText, styles.customInputText]}>✏️ Write it</Text>
                        <MaterialIcons name="edit" size={20} color="#FF6B6B" />
                      </TouchableOpacity>
                      {festivals.map((festival) => (
                        <Animated.View
                          key={festival}
                          style={[
                            { width: '100%', alignItems: 'flex-start' }
                          ]}
                        >
                          <TouchableOpacity
                            style={[
                              styles.pickerOption,
                              animatingItem === festival && styles.pickerOptionSelected
                            ]}
                            onPress={() => {
                              if (!data.festival.includes(festival)) {
                                playSuccessAnimation(festival, () => {
                                  updateData('festival', [...data.festival, festival]);
                                });
                              }
                            }}
                          >
                            <Text style={[
                              styles.pickerOptionText,
                              animatingItem === festival && styles.pickerOptionTextSelected
                            ]}>{festival}</Text>
                            {data.festival.includes(festival) && (
                              <MaterialIcons name="check" size={20} color="#FF6B6B" />
                            )}
                          </TouchableOpacity>
                        </Animated.View>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <View>
                  <Animated.View
                    style={[
                      { width: '100%' }
                    ]}
                  >
                    <TextInput
                      ref={festivalCustomInputRef}
                      style={[
                        styles.textInput,
                        animatingItem === 'festival-custom' && styles.textInputSelected
                      ]}
                      placeholder="Enter festival name"
                      placeholderTextColor="#666"
                      returnKeyType="done"
                      keyboardAppearance="dark"
                      onSubmitEditing={(e) => {
                        const customFestival = e.nativeEvent.text.trim();
                        if (customFestival && !data.festival.includes(customFestival)) {
                          playSuccessAnimation('festival-custom', () => {
                            updateData('festival', [...data.festival, customFestival]);
                            setShowFestivalCustomInput(false);
                            Keyboard.dismiss();
                          });
                        } else {
                          setShowFestivalCustomInput(false);
                          Keyboard.dismiss();
                        }
                      }}
                    />
                  </Animated.View>
                  <TouchableOpacity
                    style={styles.backToPickerButton}
                    onPress={() => {
                      setShowFestivalCustomInput(false);
                      setShowFestivalPicker(true);
                    }}
                  >
                    <Text style={styles.backToPickerText}>Back to list</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        );

            case 2: // Ticket Type Selection
        return (
          <View style={[styles.stepContainer, { marginTop: -1 }]}>
            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
              {data.festival.map((festival, index) => (
                <View key={index} style={styles.festivalTicketSection}>
                  <Text style={styles.festivalTicketLabel}>{festival}</Text>
                  <View style={styles.fieldSection}>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => {
                        setSelectedFestivalForTicket(festival);
                        setShowTicketTypePicker(true);
                      }}
                    >
                      <Text style={[styles.pickerButtonText, data.ticketType[festival] ? styles.pickerButtonTextFilled : null]}>
                        {data.ticketType[festival] || 'Select ticket type'}
                      </Text>
                      <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
                    </TouchableOpacity>
                    
                    {showTicketTypePicker && selectedFestivalForTicket === festival && (
                      <View style={styles.pickerContainer}>
                        <TouchableOpacity
                          style={[styles.pickerOption, styles.customInputOption]}
                          onPress={() => {
                            setShowTicketTypePicker(false);
                            setShowTicketTypeCustomInput(true);
                          }}
                        >
                          <Text style={[styles.pickerOptionText, styles.customInputText]}>✏️ Write it</Text>
                          <MaterialIcons name="edit" size={20} color="#FF6B6B" />
                        </TouchableOpacity>
                        {ticketTypes.map((ticketType) => (
                          <TouchableOpacity
                            key={ticketType}
                            style={[
                              styles.pickerOption,
                              animatingItem === ticketType && styles.pickerOptionSelected
                            ]}
                            onPress={() => {
                              playSuccessAnimation(ticketType, () => {
                                const newTicketTypes = { ...data.ticketType, [festival]: ticketType };
                                updateData('ticketType', newTicketTypes);
                                setShowTicketTypePicker(false);
                              });
                            }}
                          >
                            <Text style={[
                              styles.pickerOptionText,
                              animatingItem === ticketType && styles.pickerOptionTextSelected
                            ]}>{ticketType}</Text>
                            {data.ticketType[festival] === ticketType && (
                              <MaterialIcons name="check" size={20} color="#FF6B6B" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    
                    {showTicketTypeCustomInput && selectedFestivalForTicket === festival && (
                      <View>
                        <TextInput
                          ref={ticketTypeCustomInputRef}
                          style={[
                            styles.textInput,
                            animatingItem === 'tickettype-custom' && styles.textInputSelected
                          ]}
                          placeholder="Enter ticket type"
                          placeholderTextColor="#666"
                          returnKeyType="done"
                          keyboardAppearance="dark"
                          onSubmitEditing={(e) => {
                            const customTicketType = e.nativeEvent.text.trim();
                            if (customTicketType) {
                              playSuccessAnimation('tickettype-custom', () => {
                                const newTicketTypes = { ...data.ticketType, [festival]: customTicketType };
                                updateData('ticketType', newTicketTypes);
                                setShowTicketTypeCustomInput(false);
                                Keyboard.dismiss();
                              });
                            } else {
                              setShowTicketTypeCustomInput(false);
                              Keyboard.dismiss();
                            }
                          }}
                        />
                        <TouchableOpacity
                          style={styles.backToPickerButton}
                          onPress={() => {
                            setShowTicketTypeCustomInput(false);
                            setShowTicketTypePicker(true);
                          }}
                        >
                          <Text style={styles.backToPickerText}>Back to list</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        );

                   case 3: // Accommodation
        return (
          <View style={[styles.stepContainer, { marginTop: -1 }]}>
            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
              {data.festival.map((festival, index) => (
                <View key={index} style={styles.festivalTicketSection}>
                  <Text style={styles.festivalTicketLabel}>{festival}</Text>
                  <View style={styles.fieldSection}>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => {
                        setSelectedFestivalForAccommodation(festival);
                        setShowAccommodationPicker(true);
                      }}
                    >
                      <Text style={[styles.pickerButtonText, data.accommodation[festival] ? styles.pickerButtonTextFilled : null]}>
                        {data.accommodation[festival] || 'Select accommodation (optional)'}
                      </Text>
                      <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
                    </TouchableOpacity>
                    
                    {showAccommodationPicker && selectedFestivalForAccommodation === festival && (
                      <View style={styles.pickerContainer}>
                        <TouchableOpacity
                          style={[styles.pickerOption, styles.customInputOption]}
                          onPress={() => {
                            setShowAccommodationPicker(false);
                            setShowAccommodationCustomInput(true);
                          }}
                        >
                          <Text style={[styles.pickerOptionText, styles.customInputText]}>✏️ Write it</Text>
                          <MaterialIcons name="edit" size={20} color="#FF6B6B" />
                        </TouchableOpacity>
                        {accommodations.map((accommodation) => (
                          <TouchableOpacity
                            key={accommodation}
                            style={[
                              styles.pickerOption,
                              animatingItem === accommodation && styles.pickerOptionSelected
                            ]}
                            onPress={() => {
                              playSuccessAnimation(accommodation, () => {
                                const newAccommodations = { ...data.accommodation, [festival]: accommodation };
                                updateData('accommodation', newAccommodations);
                                setShowAccommodationPicker(false);
                              });
                            }}
                          >
                            <Text style={[
                              styles.pickerOptionText,
                              animatingItem === accommodation && styles.pickerOptionTextSelected
                            ]}>{accommodation}</Text>
                            {data.accommodation[festival] === accommodation && (
                              <MaterialIcons name="check" size={20} color="#FF6B6B" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    
                    {showAccommodationCustomInput && selectedFestivalForAccommodation === festival && (
                      <View>
                        <TextInput
                          ref={accommodationCustomInputRef}
                          style={[
                            styles.textInput,
                            animatingItem === 'accommodation-custom' && styles.textInputSelected
                          ]}
                          placeholder="Enter accommodation type"
                          placeholderTextColor="#666"
                          returnKeyType="done"
                          keyboardAppearance="dark"
                          onSubmitEditing={(e) => {
                            const customAccommodation = e.nativeEvent.text.trim();
                            if (customAccommodation) {
                              playSuccessAnimation('accommodation-custom', () => {
                                const newAccommodations = { ...data.accommodation, [festival]: customAccommodation };
                                updateData('accommodation', newAccommodations);
                                setShowAccommodationCustomInput(false);
                                Keyboard.dismiss();
                              });
                            } else {
                              setShowAccommodationCustomInput(false);
                              Keyboard.dismiss();
                            }
                          }}
                        />
                        <TouchableOpacity
                          style={styles.backToPickerButton}
                          onPress={() => {
                            setShowAccommodationCustomInput(false);
                            setShowAccommodationPicker(true);
                          }}
                        >
                          <Text style={styles.backToPickerText}>Back to list</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        );

             case 4: // Add Photos
        return (
          <View style={[styles.stepContainer, { marginTop: -1 }]}>
            {data.photos.length === 0 && (
              <Text style={styles.photoPromptText}>Profile Photos</Text>
            )}
            <View style={[styles.photoSection, data.photos.length > 0 && { justifyContent: 'flex-start' }]}>
               {data.photos.length === 0 ? (
                 <View style={styles.photoButtonContainer}>
                   <Text style={styles.photoSubtext}>Tap to add your pictures</Text>
                   <TouchableOpacity
                     style={styles.addPhotoButtonLarge}
                     onPress={pickImage}
                   >
                     <MaterialIcons name="add-a-photo" size={48} color="#FFFFFF" />
                   </TouchableOpacity>
                 </View>
               ) : (
                 <>
                   <TouchableOpacity
                     style={styles.addPhotoButton}
                     onPress={pickImage}
                   >
                     <Text style={styles.addPhotoButtonText}>
                       Add More Photos ({data.photos.length}/6)
                     </Text>
                   </TouchableOpacity>

                   <View style={styles.photoGrid}>
                     {data.photos.map((photo, index) => (
                       <View key={index} style={styles.photoItem}>
                         <Image source={{ uri: photo }} style={styles.photoImage} />
                         
                         {/* Order number */}
                         <View style={styles.photoNumber}>
                           <Text style={styles.photoNumberText}>{index + 1}</Text>
                         </View>
                         
                         {/* Remove button */}
                         <TouchableOpacity
                           style={styles.removePhotoButton}
                           onPress={() => removePhoto(index)}
                         >
                           <MaterialIcons name="close" size={18} color="#FFFFFF" />
                         </TouchableOpacity>
                         
                         {/* Reorder buttons */}
                         <View style={styles.reorderButtons}>
                           {index > 0 && (
                             <TouchableOpacity
                               style={styles.reorderButton}
                               onPress={() => movePhoto(index, index - 1)}
                             >
                               <MaterialIcons name="arrow-back" size={16} color="#FFFFFF" />
                             </TouchableOpacity>
                           )}
                           {index < data.photos.length - 1 && (
                             <TouchableOpacity
                               style={styles.reorderButton}
                               onPress={() => movePhoto(index, index + 1)}
                             >
                               <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
                             </TouchableOpacity>
                           )}
                         </View>
                       </View>
                     ))}
                   </View>
                 </>
               )}
             </View>
          </View>
        );

            case 5: // Bio
        return (
          <View style={[styles.stepContainer, { marginTop: -1 }]}>
            <View style={styles.fieldSection}>
              <TextInput
                style={[styles.bioInput, { height: 120 }]}
                value={data.bio}
                onChangeText={(text) => {
                  if (text.length <= 150) {
                    updateData('bio', text);
                  }
                }}
                placeholder="Tell us about yourself..."
                placeholderTextColor="#666"
                multiline
                maxLength={150}
                textAlignVertical="top"
                keyboardAppearance="dark"
              />
              <Text style={styles.characterCount}>{data.bio.length}/150</Text>
            </View>
          </View>
        );

            case 6: // Location Access
        return (
          <View style={[styles.stepContainer, { marginTop: -1 }]}>
            <View style={[styles.locationSection, { marginTop: -70 }]}>
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

            case 7: // Push Notifications
        return (
          <View style={[styles.stepContainer, { marginTop: -1 }]}>
            <View style={[styles.locationSection, { marginTop: -150 }]}>
               <TouchableOpacity
                 style={styles.locationButton}
                 onPress={() => {
                   setData(prev => ({ ...prev, pushNotifications: !prev.pushNotifications }));
                   setTimeout(() => {
                     handleComplete();
                   }, 300);
                 }}
               >
                 <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
                 <Text style={styles.locationButtonText}>
                   {data.pushNotifications ? 'Push Notifications Enabled' : 'Enable Push Notifications (Optional)'}
                 </Text>
               </TouchableOpacity>
               
               <Text style={styles.locationText}>
                 Stay updated with matches, messages, and festival updates. You can change this anytime in settings.
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
                <Text style={[styles.stepTitle, (currentStep === 5 || currentStep === 6) && { marginTop: 199 }]}>{steps[currentStep].title}</Text>
                <Text style={[styles.stepSubtitle, currentStep === 1 && { marginTop: 40 }]}>{steps[currentStep].subtitle}</Text>
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
            <Animated.View
              style={[
                { alignItems: 'flex-start' }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  !canProceed() && styles.nextButtonDisabled
                ]}
                onPress={() => {
                  if (canProceed()) {
                    playSuccessAnimation('next-button', handleNext);
                  }
                }}
                disabled={!canProceed()}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <MaterialIcons 
                  name="arrow-forward" 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </Animated.View>
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

        {/* Loading Modal */}
        {isUploading && (
          <Modal
            animationType="fade"
            transparent={true}
            visible={isUploading}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.loadingModalContent}>
                <ActivityIndicator size="large" color="#FF6B6B" />
                <Text style={styles.loadingText}>
                  {data.photos.length > 0 ? 'Uploading photos...' : 'Setting up your profile...'}
                </Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: -30,
    marginTop: 59,
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
  festivalTicketSection: {
    width: '100%',
    marginBottom: 25,
  },
  festivalTicketLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  selectedChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    gap: 10,
  },
  festivalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  festivalChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
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
  photoSection: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  photoPromptText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: -108,
    marginTop: 180,
  },
  photoButtonContainer: {
    alignItems: 'center',
    width: '100%',
    marginTop: -84,
  },
  photoSubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  addPhotoButtonLarge: {
    width: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButtonLargeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
  },
  addPhotoButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  addPhotoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  photoGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    justifyContent: 'flex-start',
  },
  photoItem: {
    width: (width - 64) / 3, // 3 columns with gaps
    aspectRatio: 4 / 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    marginRight: 6,
    marginBottom: 12,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoNumber: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  reorderButtons: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  reorderButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
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
    fontSize: 20,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textInputSelected: {
    color: '#FF6B6B',
  },
  bioInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 18,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  characterCount: {
    fontSize: 14,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
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
    fontSize: 20,
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
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  pickerOptionText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  pickerOptionSelected: {
    // No background change
  },
  pickerOptionTextSelected: {
    color: '#FF6B6B',
    fontWeight: '600',
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
  backToPickerButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
  },
  backToPickerText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
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
  loadingModalContent: {
    backgroundColor: '#2D2D2D',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  genderOptionSelected: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  genderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  genderTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

});

export default OnboardingScreen; 