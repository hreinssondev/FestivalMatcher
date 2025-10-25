import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../../App';
import { useProfile } from '../context/ProfileContext';
import { useOnboarding } from '../context/OnboardingContext';
import { User } from '../types';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MatchingService } from '../services/matchingService';
import { PhotoService } from '../services/photoService';
import { DeviceAuthService } from '../services/deviceAuthService';

const { width, height } = Dimensions.get('window');

type ProfileScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Profile'>;



const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { profileData, updateProfile, refreshProfile } = useProfile();
  
  // Debug logging

  

  const { resetOnboarding } = useOnboarding();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const infoHeightAnim = React.useRef(new Animated.Value(200)).current;
  
  // Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showEditInput, setShowEditInput] = useState(false);
  const [floatingBarTextIndex, setFloatingBarTextIndex] = useState(0); // Start with location
  const floatingBarTexts = [
    { icon: "location-on" as const, text: "Biddinghuizen • 6 min ago" },
    { icon: "location-on" as const, text: `Show on Map ?` }
  ];

  // Welcome modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const welcomeScaleAnim = useRef(new Animated.Value(0)).current;
  const welcomeOpacityAnim = useRef(new Animated.Value(0)).current;

  // Prefetch images for instant loading with logging
  const preloadImages = (photos: string[]) => {
    console.log(`ProfileScreen: Prefetching ${photos.length} photos...`);
    photos.forEach((photoUrl, index) => {
      if (photoUrl) {
        Image.prefetch(photoUrl)
          .then(() => {
            console.log(`ProfileScreen: Photo ${index + 1} cached successfully`);
          })
          .catch((error) => {
            console.warn(`ProfileScreen: Failed to cache photo ${index + 1}:`, error);
          });
      }
    });
  };

  // Preload all profile photos
  useEffect(() => {
    if (profileData.photos && profileData.photos.length > 0) {
      console.log('ProfileScreen: Starting photo prefetch...');
      preloadImages(profileData.photos);
    }
  }, [profileData.photos]);

  // Check for welcome modal on mount
  useEffect(() => {
    const checkWelcomeModal = async () => {
      const shouldShow = await AsyncStorage.getItem('show_welcome_modal');
      if (shouldShow === 'true') {
        await AsyncStorage.removeItem('show_welcome_modal');
        setTimeout(() => {
          setShowWelcomeModal(true);
          // Animate in - faster for better UX
          Animated.parallel([
            Animated.spring(welcomeScaleAnim, {
              toValue: 1,
              tension: 80,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.timing(welcomeOpacityAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }, 500); // Delay to let the screen render
      }
    };
    checkWelcomeModal();
  }, []);

  const closeWelcomeModal = () => {
    Animated.parallel([
      Animated.timing(welcomeScaleAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(welcomeOpacityAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowWelcomeModal(false);
    });
  };


 // Shorter default height

  const nextPhoto = () => {
    if (currentPhotoIndex < (profileData.photos?.length || 0) - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const previousPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  const onGestureEvent = (event: any) => {
    const { translationY, state } = event.nativeEvent;
    
    if (state === State.END) {
      if (translationY < -50) {
        previousPhoto();
      } else if (translationY > 50) {
        nextPhoto();
      }
    }
  };

  const handleEditPress = () => {
    navigation.navigate('CompactEdit' as any);
  };

  const handleFieldPress = (field: string, currentValue: string) => {
    console.log('handleFieldPress called with field:', field, 'currentValue:', currentValue, 'isEditing:', isEditing);
    if (!isEditing) {
      console.log('Not in editing mode, ignoring field press');
      return;
    }
    console.log('Setting edit state - field:', field, 'value:', currentValue);
    setEditingField(field);
    setEditValue(currentValue);
    setShowEditInput(true);
    console.log('Edit modal should now be visible');
  };

  const handleSaveEdit = () => {
    console.log('handleSaveEdit called with editingField:', editingField, 'editValue:', editValue);
    if (editingField && (editValue.trim() || editingField === 'interests')) {
      let value;
      if (editingField === 'age') {
        value = parseInt(editValue.trim(), 10) || 0;
      } else if (editingField === 'interests') {
        // Treat bio as a single text entry, not comma-separated
        // Allow empty array if user wants to clear their bio
        value = editValue.trim() ? [editValue.trim()] : [];
        console.log('Processing interests - editValue:', editValue, 'processed value:', value);
      } else {
        value = editValue.trim();
      }
      console.log('Calling updateProfile with:', { [editingField]: value });
      updateProfile({ [editingField]: value });
    }
    setShowEditInput(false);
    setEditingField(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setShowEditInput(false);
    setEditingField(null);
    setEditValue('');
  };

  const handleFloatingBarPress = () => {
    if (floatingBarTextIndex === 0) {
      // First tap: show "Show on Map ?" text
      setFloatingBarTextIndex(1);
    } else {
      // Second tap: navigate to Map tab
      navigation.navigate('Map');
    }
  };



  const handleResetOnboarding = () => {
    resetOnboarding();
    navigation.navigate('Onboarding' as any);
  };

  const handleClearSwipes = async () => {
    try {
      const result = await MatchingService.clearAllSwipes();
      if (result.success) {
        alert('✅ All swipes cleared! Go back to Swipe tab to see profiles again.');
      } else {
        alert('❌ Failed to clear swipes');
      }
    } catch (error) {
      console.error('Error clearing swipes:', error);
      alert('❌ Error clearing swipes');
    }
  };



  const handleImagePress = async () => {
    if (!isEditing) {
      alert('Please tap the Edit button first to enable photo editing.');
      return;
    }
    
    // Navigate to onboarding photo edit
    navigation.navigate('Onboarding' as any);
  };

  const handleAddPhoto = async () => {
    try {
      // Check current permissions first
      const permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        // Request permissions if not granted
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
          alert('Photo access required!\n\nTo add photos, please allow access to your photos in Settings.');
          return;
        }
      }

      // Launch image picker with enhanced options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1.0, // Full quality now that file size limit is removed
        allowsMultipleSelection: false,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets[0]) {
        // Get user ID
        const deviceUserId = await DeviceAuthService.getDeviceUserId();
        
        // Upload photo to Supabase Storage
        const { url, error } = await PhotoService.uploadPhoto(
          deviceUserId, 
          result.assets[0].uri, 
          profileData.photos?.length || 0
        );
        
        if (error) {
          console.error('Photo upload failed:', error);
          alert('Upload Failed\n\nFailed to upload photo. Please check your internet connection and try again.\n\nError: ' + (error.message || error));
          return;
        }
        
        // Add the new photo URL to the photos array
        const newPhotos = [...(profileData.photos || []), url];
        updateProfile({ photos: newPhotos });
        
        // Update the database
        const updateResult = await DeviceAuthService.updateUserProfile({ photos: newPhotos });
        if (updateResult.error) {
          console.error('Failed to update profile in database:', updateResult.error);
          alert('Save Failed\n\nPhoto uploaded but failed to save to your profile. Please try again.');
          return;
        }
        
        alert('Success!\n\nPhoto added successfully!');
      }
    } catch (error: any) {
      console.error('Error accessing photos:', error);
      alert(`Error accessing photos: ${error.message || error}\n\nPlease try again.`);
    }
  };

  const handleRemovePhoto = async () => {
    if (!profileData.photos || profileData.photos.length === 0) {
      alert('No photos to remove.');
      return;
    }

    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const photoToRemove = profileData.photos[safePhotoIndex];
              const newPhotos = profileData.photos.filter((_, index) => index !== safePhotoIndex);
              
              // Update local state first
              updateProfile({ photos: newPhotos });
              
              // Reset photo index if we removed the last photo
              if (currentPhotoIndex >= newPhotos.length) {
                setCurrentPhotoIndex(Math.max(0, newPhotos.length - 1));
              }
              
              // Delete from Supabase Storage if it's a Supabase URL
              if (PhotoService.isSupabaseUrl(photoToRemove)) {
                const { error } = await PhotoService.deletePhoto(photoToRemove);
                if (error) {
                  console.error('Failed to delete photo from storage:', error);
                  return;
                }
              }
              
              // Update the database
              const updateResult = await DeviceAuthService.updateUserProfile({ photos: newPhotos });
              if (updateResult.error) {
                console.error('Failed to update profile in database:', updateResult.error);
                return;
              }
            } catch (error) {
              console.error('Error removing photo:', error);
              alert('❌ Failed to remove photo. Please try again.');
            }
          }
        }
      ]
    );
  };



  // Safety check to prevent crashes
  if (!profileData) {
    return (
      <View style={styles.container}>
        <Text style={styles.noMoreText}>Profile not available</Text>
      </View>
    );
  }

  // Ensure currentPhotoIndex is within bounds
  const safePhotoIndex = Math.min(Math.max(0, currentPhotoIndex), (profileData.photos?.length || 0) - 1);

    return (
    <View style={styles.container}>
      {/* Floating bar background - extends from under profile card */}
      <View style={styles.floatingBarBackground} />
      
      {/* Floating bar above card */}
      <View style={styles.floatingBar}>
        <TouchableOpacity 
          style={styles.floatingBarContent}
          onPress={handleFloatingBarPress}
          activeOpacity={0.8}
        >
          <View style={styles.floatingBarLeft}>
            <MaterialIcons 
              name={floatingBarTexts[floatingBarTextIndex].icon} 
              size={16} 
              color="rgba(255, 255, 255, 0.82)" 
            />
            <Text style={styles.floatingBarText}>
              {floatingBarTexts[floatingBarTextIndex].text}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <PanGestureHandler onGestureEvent={onGestureEvent}>
            <Animated.View>
              <TouchableOpacity 
                onPress={() => {}} // Disabled - use the dedicated photo button instead
                disabled={true}
                activeOpacity={1}
              >
                {profileData.photos && profileData.photos.length > 0 ? (
                  <View style={styles.cardImage}>
                    {/* Render all images but only show current one - instant switching */}
                    {profileData.photos.map((photoUri, index) => (
                      <Image 
                        key={index}
                        source={{ uri: photoUri }} 
                        style={[
                          styles.cardImage,
                          { 
                            position: index === 0 ? 'relative' : 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            opacity: index === safePhotoIndex ? 1 : 0,
                          }
                        ]}
                        fadeDuration={0}
                        resizeMode="cover"
                        progressiveRenderingEnabled={true}
                        loadingIndicatorSource={undefined}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.noPhotoContainer}>
                    <MaterialIcons name="person" size={80} color="#666" />
                    <Text style={styles.noPhotoText}>No photo available</Text>
                  </View>
                )}

              </TouchableOpacity>
            </Animated.View>
          </PanGestureHandler>
          

          
          {/* Photo indicator dots */}
          {profileData.photos && profileData.photos.length > 0 && (
            <View style={styles.photoIndicator}>
              {profileData.photos.map((_: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.photoDot,
                    index === safePhotoIndex && styles.photoDotActive
                  ]}
                />
              ))}
            </View>
          )}
          

          
          {/* Profile info overlay - same as SwipeScreen */}

          
          <View
            style={[styles.cardOverlay, { zIndex: 9999 }]} // Very high z-index to stay in front
          >

            <Animated.View 
              style={[
                styles.cardInfo,
                { height: infoHeightAnim },
                { zIndex: 100000 } // Higher z-index to ensure it's above tap areas
              ]}
            >
                              {/* Glassmorphism backdrop with fade */}
                <LinearGradient
                  colors={['transparent', 'rgba(0, 0, 0, 0.15)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.6)']}
                  locations={[0, 0.3, 0.7, 1]}
                  style={styles.glassBackdrop}
                />
              <ScrollView 
                style={styles.cardInfoScroll}
                contentContainerStyle={styles.cardInfoContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
                scrollEventThrottle={8}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.nameAgeContainer}>
                  {/* Festival chips - moved above name and age */}
                  <View style={styles.festivalChipsContainer}>
                    {(() => {
                      const realFestivals = profileData.festival.split(',');
                      
                      // If only one festival, position it in position 3 (like Ultra Music Festival)
                      if (realFestivals.length === 1) {
                        const ticketTypes = profileData.ticketType?.split(',') || [];
                        const trimmedTicketType = ticketTypes[0]?.trim();
                        
                        // Check if this specific festival has premium/VIP ticket
                        const hasPremiumTicket = trimmedTicketType && (
                          trimmedTicketType.toLowerCase().includes('premium') ||
                          trimmedTicketType.toLowerCase().includes('vip') ||
                          trimmedTicketType.toLowerCase().includes('gold') ||
                          trimmedTicketType.toLowerCase().includes('platinum')
                        );
                        
                        return (
                          <>
                            {/* Empty spaces for positions 1 and 2 */}
                            <View style={styles.festivalChip} />
                            <View style={styles.festivalChip} />
                            {/* Single festival in position 3 */}
                            <View style={styles.festivalChip}>
                              <Text style={styles.festivalChipText}>{realFestivals[0].trim()}</Text>
                              {hasPremiumTicket && (
                                <View style={styles.premiumStarContainer}>
                                  <MaterialIcons name="star" size={16} color="#FFFFFF" />
                                </View>
                              )}
                            </View>
                          </>
                        );
                      }
                      
                      // Multiple festivals: display normally
                      return (
                        <>
                          {realFestivals.map((fest, index) => {
                            const festivalName = fest.trim();
                            const ticketTypes = profileData.ticketType?.split(',') || [];
                            const trimmedTicketType = ticketTypes[index]?.trim();
                            
                            // Check if this specific festival has premium/VIP ticket
                            const hasPremiumTicket = trimmedTicketType && (
                              trimmedTicketType.toLowerCase().includes('premium') ||
                              trimmedTicketType.toLowerCase().includes('vip') ||
                              trimmedTicketType.toLowerCase().includes('gold') ||
                              trimmedTicketType.toLowerCase().includes('platinum')
                            );
                            
                            return (
                              <View key={index} style={styles.festivalChip}>
                                <Text style={styles.festivalChipText}>{festivalName}</Text>
                                {hasPremiumTicket && (
                                  <View style={styles.premiumStarContainer}>
                                    <MaterialIcons name="star" size={16} color="#FFFFFF" />
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </>
                      );
                    })()}
                  </View>

                  <View style={styles.nameAgeRow}>
                    <Text style={styles.cardName}>
                      {profileData.name}
                    </Text>
                    <Text style={styles.ageSeparator}> </Text>
                    <Text style={styles.cardAge}>
                      {profileData.age}
                    </Text>
                  </View>

                  {(() => {
                    const bioText = profileData.interests?.join(', ') || '';
                    if (bioText) {
                      return (
                        <Text style={styles.bioSection}>
                          -  {bioText}
                        </Text>
                      );
                    }
                    return null;
                  })()}

                </View>
              </ScrollView>
            </Animated.View>
          </View>
          
          {/* Photo navigation tap areas - positioned on top */}
          <TouchableOpacity 
            style={styles.leftTapArea} 
            onPressIn={previousPhoto}
            activeOpacity={0.8}
            delayPressIn={0}
            delayLongPress={200}
            onLongPress={() => {}} // Ignore long press
          />
          <TouchableOpacity 
            style={styles.rightTapArea} 
            onPressIn={nextPhoto}
            activeOpacity={0.8}
            delayPressIn={0}
            delayLongPress={200}
            onLongPress={() => {}} // Ignore long press
          />
        </View>
      </View>

      {/* Edit Profile Button - overlaid on card */}
      <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate('EditProfile' as any)}>
        <Text style={styles.editProfileButtonText}>
          Edit Profile
        </Text>
      </TouchableOpacity>

      {/* Action Buttons - Same as SwipeScreen */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleClearSwipes}
        >
          <MaterialIcons name="delete-sweep" size={20} color="rgba(255, 255, 255, 0.82)" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, isEditing && styles.editButtonActive]}
          onPress={handleEditPress}
        >
          <MaterialIcons name="edit" size={20} color={isEditing ? "#666666" : "rgba(255, 255, 255, 0.82)"} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Settings' as any)}
        >
          <MaterialIcons name="settings" size={20} color="rgba(255, 255, 255, 0.82)" />
        </TouchableOpacity>

      </View>

      {/* Photo Picker Button - Only in Edit Mode */}
      {isEditing && (
        <TouchableOpacity 
          style={styles.photoPickerButton}
          onPress={handleImagePress}
        >
          <MaterialIcons name="camera-alt" size={30} color="#FFFFFF" />
          <Text style={styles.photoPickerButtonText}>Change Photos</Text>
        </TouchableOpacity>
      )}

      {/* Inline Edit Modal */}
      {showEditInput && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showEditInput}
          onRequestClose={handleCancelEdit}
        >
          <View style={styles.editModalContainer}>
            <View style={styles.editModalContent}>
              <Text style={styles.editModalTitle}>Edit {editingField}</Text>
              
              <TextInput
                style={styles.editInput}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={`Enter ${editingField}...`}
                placeholderTextColor="#999"
                autoFocus
                multiline={editingField === 'bio'}
                numberOfLines={editingField === 'bio' ? 3 : 1}
              />

              <View style={styles.editModalButtons}>
                <TouchableOpacity 
                  style={[styles.editModalButton, styles.cancelEditButton]} 
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.cancelEditButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editModalButton, styles.saveEditButton]} 
                  onPress={() => {
                    console.log('Save button pressed!');
                    handleSaveEdit();
                  }}
                >
                  <Text style={styles.saveEditButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}


      {/* Welcome Modal */}
      {showWelcomeModal && (
        <Modal
          transparent
          visible={showWelcomeModal}
          animationType="none"
        >
          <View style={styles.welcomeModalOverlay}>
            <Animated.View
              style={[
                styles.welcomeModalContent,
                {
                  transform: [{ scale: welcomeScaleAnim }],
                  opacity: welcomeOpacityAnim,
                },
              ]}
            >
              <MaterialIcons name="celebration" size={60} color="#FF6B6B" style={{ marginBottom: 20 }} />
              <Text style={styles.welcomeModalTitle}>Welcome to FestivalMatcher!</Text>
              <Text style={styles.welcomeModalMessage}>Remember to be kind to others</Text>
              <TouchableOpacity
                style={styles.welcomeModalButton}
                onPress={closeWelcomeModal}
              >
                <Text style={styles.welcomeModalButtonText}>Let's Go!</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },

  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 173, // Moved up 5px (168 + 5)
  },
  card: {
    width: width * 0.9 + 4,
    height: height * 0.55 + 96,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1.1,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
    zIndex: 10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    zIndex: 1, // Base z-index for the image
  },
  imageEditOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  imageEditText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  photoPickerButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -30 }], // Moved 20px more to the left
    backgroundColor: '#ff6b6b',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    zIndex: 60000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  photoPickerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    overflow: 'hidden',
    zIndex: 999, // Very high z-index to ensure it stays on top
  },
  glassBackdrop: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1, // Behind the text content
  },
  cardInfo: {
    flex: 1,
    // Height is now controlled by animation
    zIndex: 1000, // Very high z-index to ensure text stays in front
  },
  cardInfoScroll: {
    flex: 1,
    zIndex: 1001, // Even higher z-index for scrollable content
    minHeight: 200, // Ensure minimum touch area
  },
  cardInfoContent: {
    paddingTop: -82, // 1px less negative padding
    paddingBottom: 20, // Add bottom padding for better scroll area
    paddingLeft: 20,
    paddingRight: 60,
    minHeight: 180, // Ensure content has minimum height for scrolling
  },
  nameAgeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 5,
    marginTop: -40, // Adjusted to match profile page height
  },
  nameAgeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 0,
    marginBottom: 5,
  },
  cardName: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#fff',
  },
  ageSeparator: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardAge: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardLocation: {
    fontSize: 17,
    color: '#fff',
    marginBottom: 10,
  },
  locationName: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  festivalRow: {
    width: '100%',
    marginBottom: 5,
  },
  festivalName: {
    fontSize: 22,
    color: '#ff4444',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'left',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  festivalDetails: {
    flexDirection: 'column',
    gap: 3,
    marginTop: 2,
  },
  festivalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  festivalDetailIcon: {
    fontSize: 14,
  },
  festivalDetailTextContent: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '500',
    marginTop: 2,
  },
  festivalDetailTicketText: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '500',
    marginTop: 1,
  },
  festivalDetailText: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '500',
    marginTop: 2,
  },
  festivalChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    marginTop: 63, // Moved up 2px from +65 to +63
    gap: 8,
  },
  festivalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 4,
  },
  festivalChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  fakeFestivalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 4,
  },
  fakeFestivalChipText: {
    color: 'transparent',
    fontSize: 12,
    fontWeight: '500',
  },
  festivalDetailsContainer: {
    flexDirection: 'column',
    marginTop: 10,
    gap: 12,
  },
  festivalDetailItem: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  festivalDetailChip: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginBottom: 4,
  },
  festivalDetailChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  festivalContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 2,
    marginLeft: -8,
    flexDirection: 'column',
    marginTop: 0,
    overflow: 'hidden',
  },

  currentlyAtContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  currentlyAtText: {
    fontSize: 10,
    color: '#ff4444',
    fontWeight: '600',
    marginBottom: 0,
    textTransform: 'uppercase',
    textAlign: 'center',
    width: '100%',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  cardBio: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 10,
    marginTop: -5,
    lineHeight: 18,
    fontWeight: 'bold',
  },
  bioSection: {
    fontSize: 17,
    color: '#fff',
    marginBottom: 10,
    marginTop: -5,
    lineHeight: 21,
    fontWeight: 'normal',
  },
  bioQuote: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: 'normal',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  bioLabel: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '600',
    marginTop: -2,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  bioText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 19,
    marginTop: 0,
  },
  leftTapArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: width / 2, // Half the card width
      height: height * 0.57, // 57% of card height for optimal tap area
    zIndex: 99999, // Extremely high z-index to ensure taps work over everything
  },
  rightTapArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: width / 2, // Half the card width
      height: height * 0.57, // 57% of card height for optimal tap area
    zIndex: 99999, // Extremely high z-index to ensure taps work over everything
  },
  bottomLeftTapArea: {
    position: 'absolute',
    left: 0,
    bottom: -50,
    width: width / 2, // Equal width - half each
    height: 100, // Fixed height for bottom area
    zIndex: 1002, // Higher z-index to ensure taps work over text overlay
  },
  bottomRightTapArea: {
    position: 'absolute',
    right: 0,
    bottom: -50,
    width: width / 2, // Equal width - half each
    height: 100, // Fixed height for bottom area
    zIndex: 1002, // Higher z-index to ensure taps work over text overlay
  },
  festivalTopContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  festivalTopName: {
    fontSize: 21,
    color: '#ff4444',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    overflow: 'hidden',
  },
  photoIndicator: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 3,
  },
  floatingBarBackground: {
    position: 'absolute',
    top: 73.7, // Moved down 0.7px
    left: 21.25,
    right: 21.25,
    height: 75, // Extended downward - now 75px tall
    backgroundColor: 'transparent', // Removed gray background
    borderTopLeftRadius: 20, // Rounded corners only at top
    borderTopRightRadius: 20,
    zIndex: 0, // Behind the profile card
  },
  floatingBar: {
    position: 'absolute',
    top: 97.7, // Moved up 5px (102.7 - 5)
    left: 20,
    right: 20,
    backgroundColor: 'transparent',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    zIndex: 1000,
  },
  floatingBarContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingBarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.82, // Make text dimmer
  },
  floatingBarMap: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#95a5a6',
    overflow: 'hidden',
  },
  floatingBarMapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#34495e',
  },
  mapGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  mapGridLine: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    height: '100%',
  },
  distanceIndicator: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    paddingHorizontal: 20,
    width: '100%',
  },
  locationIcon: {
    position: 'absolute',
    left: 80,
    top: 0,
  },
  distanceText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  timeText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
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
  meetupTile: {
    position: 'absolute',
    top: 60,
    left: '50%',
    transform: [{ translateX: -40 }],
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  meetupText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  interestsSection: {
    marginTop: 15,
  },
  interestsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  interestsContainer: {
    flexDirection: 'row',
  },
  interestTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },
  interestText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  centerLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flex: 1,
  },
  headerSettingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(51, 51, 51, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  headerEditButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(51, 51, 51, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  editProfileButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#ff6b6b',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    alignItems: 'center',
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomSettingsButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(51, 51, 51, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 23,
    zIndex: 10000,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#555555',
    borderWidth: 1,
    borderColor: '#777777',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  editButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CCCCCC',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  editProfileButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noMoreText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: height * 0.3,
  },
  editableField: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 5,
    padding: 2,
  },
  editModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingTop: -45, // Move modal content 45px up total
  },
  editModalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 350,
    marginTop: -45, // Additional 45px upward adjustment total
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
    textTransform: 'capitalize',
  },
  editInput: {
    backgroundColor: '#333333',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    textAlignVertical: 'top',
    fontSize: 16,
    minHeight: 50,
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelEditButton: {
    backgroundColor: '#666666',
  },
  saveEditButton: {
    backgroundColor: '#ff6b6b',
  },
  cancelEditButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveEditButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noPhotoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    color: '#999',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  welcomeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeModalContent: {
    backgroundColor: '#2D2D2D',
    borderRadius: 25,
    padding: 40,
    width: width * 0.85,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  welcomeModalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
  },
  welcomeModalMessage: {
    fontSize: 18,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 30,
  },
  welcomeModalButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 50,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  welcomeModalButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  premiumStarContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    zIndex: 15,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.25)',
    gap: 5,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  infoChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  infoChipIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  accommodationContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  accommodationChip: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
  },
  accommodationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  festivalNameText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  accommodationTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  ticketContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  ticketChip: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ticketTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
  
  export default ProfileScreen; 