import React, { useState } from 'react';
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
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useProfile } from '../context/ProfileContext';
import { useOnboarding } from '../context/OnboardingContext';
import { User } from '../types';
import IconLodgicons from 'react-native-ico-lodgicons';
import IconCoolicons from 'react-native-ico-coolicons';
import IconEssential from 'react-native-ico-essential';
import IconUIInterface from 'react-native-ico-ui-interface';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const { width, height } = Dimensions.get('window');

// Mock user data - will be updated with profile context
const createUserFromProfile = (profileData: any): User => ({
  id: '1',
  name: profileData.name,
  age: profileData.age,
  festival: profileData.festival,
  ticketType: 'General Admission', // Default
  accommodationType: profileData.accommodation || 'Not specified',
  photos: profileData.photos && profileData.photos.length > 0 
    ? profileData.photos 
    : [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400'
      ],
  interests: ['Hiking', 'Coffee', 'Travel', 'Photography', 'Reading', 'Cooking', 'Music', 'Art'],
  lastSeen: 'Biddinghuizen - 6 minutes ago',
  distance: 2,
});

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { profileData, updateProfile } = useProfile();
  const { resetOnboarding } = useOnboarding();
  const user = createUserFromProfile(profileData);
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
 // Shorter default height

  const nextPhoto = () => {
    if (currentPhotoIndex < user.photos.length - 1) {
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
    setIsEditing(!isEditing);
  };

  const handleFieldPress = (field: string, currentValue: string) => {
    if (!isEditing) return;
    setEditingField(field);
    setEditValue(currentValue);
    setShowEditInput(true);
  };

  const handleSaveEdit = () => {
    if (editingField && editValue.trim()) {
      // Convert age to number if editing age field
      const value = editingField === 'age' ? parseInt(editValue.trim(), 10) || 0 : editValue.trim();
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

  const handleResetOnboarding = async () => {
    await resetOnboarding();
  };

  const handleImagePress = async () => {
    console.log('handleImagePress called, isEditing:', isEditing);
    
    if (!isEditing) {
      alert('Please tap the Edit button first to enable photo editing.');
      return;
    }
    
    try {
      console.log('Checking media library permissions...');
      
      // Check current permissions first
      const permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
      console.log('Current permission status:', permissionResult.status);
      
      if (permissionResult.status !== 'granted') {
        console.log('Requesting media library permissions...');
        // Request permissions if not granted
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('Permission request result:', status);
        
        if (status !== 'granted') {
          alert('Photo access required!\n\nTo change your profile picture, please allow access to your photos in Settings.');
          return;
        }
      }

      console.log('Launching image picker...');
      // Launch image picker with enhanced options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        allowsMultipleSelection: false,
        selectionLimit: 1,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets[0]) {
        // Here you would typically upload the image to your server
        // For now, we'll show a success message
        alert(`Photo selected successfully!\n\nImage: ${result.assets[0].width}x${result.assets[0].height}\n\nIn a real app, this would upload to your server and update your profile.`);
        console.log('Selected image details:', {
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height,
          fileSize: result.assets[0].fileSize,
        });
      }
    } catch (error) {
      console.error('Error accessing photos:', error);
      alert(`Error accessing photos: ${error.message || error}\n\nPlease try again.`);
    }
  };



  // Safety check to prevent crashes
  if (!user || !user.photos || user.photos.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noMoreText}>Profile not available</Text>
      </View>
    );
  }

  // Ensure currentPhotoIndex is within bounds
  const safePhotoIndex = Math.min(Math.max(0, currentPhotoIndex), user.photos.length - 1);

    return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <PanGestureHandler onGestureEvent={onGestureEvent}>
            <Animated.View>
              <TouchableOpacity 
                onPress={() => {}} // Disabled - use the dedicated photo button instead
                disabled={true}
                activeOpacity={1}
              >
                <Image 
                  source={{ uri: user.photos[safePhotoIndex] || user.photos[0] }} 
                  style={styles.cardImage} 
                />

              </TouchableOpacity>
            </Animated.View>
          </PanGestureHandler>
          
          {/* Photo navigation tap areas - left and right only */}
          <TouchableOpacity 
            style={styles.leftTapArea} 
            onPress={previousPhoto}
            activeOpacity={0.8}
            delayPressIn={50}
            delayLongPress={200}
            onLongPress={() => {}} // Ignore long press
            pointerEvents="box-none"
          />
          <TouchableOpacity 
            style={styles.rightTapArea} 
            onPress={nextPhoto}
            activeOpacity={0.8}
            delayPressIn={50}
            delayLongPress={200}
            onLongPress={() => {}} // Ignore long press
            pointerEvents="box-none"
          />
          
          {/* Bottom tap areas for photo navigation */}
          <TouchableOpacity 
            style={styles.bottomLeftTapArea} 
            onPress={previousPhoto}
            activeOpacity={0.8}
            delayPressIn={50}
            delayLongPress={200}
            onLongPress={() => {}} // Ignore long press
            pointerEvents="box-none"
          />
          <TouchableOpacity 
            style={styles.bottomRightTapArea} 
            onPress={nextPhoto}
            activeOpacity={0.8}
            delayPressIn={50}
            delayLongPress={200}
            onLongPress={() => {}} // Ignore long press
            pointerEvents="box-none"
          />
          
          {/* Photo indicator dots */}
          <View style={styles.photoIndicator}>
            {user.photos && user.photos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.photoDot,
                  index === safePhotoIndex && styles.photoDotActive
                ]}
              />
            ))}
          </View>
          
          {/* Distance indicator */}
          <View style={styles.distanceIndicator}>
            <View style={styles.distanceRow}>
              <View style={styles.centerLocationContainer}>
                <MaterialIcons name="location-on" size={18} color="#FFFFFF" style={styles.locationIcon} />
                <Text style={styles.distanceText}>{user.lastSeen.split(' - ')[0]}</Text>
              </View>
            </View>
            <Text style={styles.timeText}>{user.lastSeen.split(' - ')[1]}</Text>
          </View>
          
          {/* Profile info overlay - same as SwipeScreen */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)']}
            locations={[0, 0.3, 0.7, 1]}
            style={[styles.cardOverlay, { zIndex: 9999 }]} // Very high z-index to stay in front
          >
            <Animated.View 
              style={[
                styles.cardInfo,
                { height: infoHeightAnim },
                { zIndex: 1000 } // Ensure animated wrapper stays in front
              ]}
            >
              <ScrollView 
                ref={scrollViewRef}
                style={styles.cardInfoScroll}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.cardInfoContent}
                onScroll={(event) => {
                  const y = event.nativeEvent.contentOffset.y;
                  setScrollPosition(y);
                  setIsScrolling(true);
                  
                  // Reset to default height when scrolling back to top
                  if (y <= 0) {
                    Animated.timing(infoHeightAnim, {
                      toValue: 200, // Default height
                      duration: 200,
                      useNativeDriver: false,
                    }).start();
                  }
                }}
                onScrollBeginDrag={() => setIsScrolling(true)}
                onScrollEndDrag={() => {
                  setTimeout(() => setIsScrolling(false), 100);
                }}
                scrollEventThrottle={16}
                nestedScrollEnabled={true}
                bounces={true}
              >
                <View style={styles.nameAgeContainer}>
                  <View style={styles.nameAgeRow}>
                    <TouchableOpacity onPress={() => handleFieldPress('name', user.name)} disabled={!isEditing}>
                      <Text style={[styles.cardName, isEditing && styles.editableField]}>
                        {user.name}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.ageSeparator}>, </Text>
                    <TouchableOpacity onPress={() => handleFieldPress('age', user.age.toString())} disabled={!isEditing}>
                      <Text style={[styles.cardAge, isEditing && styles.editableField]}>
                        {user.age}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity onPress={() => handleFieldPress('festival', user.festival)} disabled={!isEditing}>
                    <View style={[styles.festivalContainer, isEditing && styles.editableField]}>
                      <Text style={styles.festivalName}>{user.festival}</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <Text style={styles.cardBio}>
                  <Text style={styles.bioLabel}>Ticket: </Text>
                  <Text 
                    style={[styles.bioText, isEditing && styles.editableField]} 
                    onPress={() => handleFieldPress('ticketType', user.ticketType)}
                  >
                    {user.ticketType}
                  </Text>
                  {'\n'}
                  <Text style={styles.bioLabel}>Accommodation: </Text>
                  <Text 
                    style={[styles.bioText, isEditing && styles.editableField]} 
                    onPress={() => handleFieldPress('accommodationType', user.accommodationType)}
                  >
                    {user.accommodationType}
                  </Text>
                  {'\n'}
                  <Text 
                    style={[styles.bioText, isEditing && styles.editableField]} 
                    onPress={() => handleFieldPress('bio', 'Looking for afterparty buddy')}
                  >
                    - Looking for afterparty buddy
                  </Text>
                </Text>
              </ScrollView>
            </Animated.View>
          </LinearGradient>
        </View>
      </View>



      {/* Edit Profile Button - overlaid on card */}
      <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate('EditProfile')}>
        <Text style={styles.editProfileButtonText}>
          Edit Profile
        </Text>
      </TouchableOpacity>

      {/* Settings and Adjust Buttons - Same Position as SwipeScreen Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <IconEssential name="settings-5" width={20} height={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleEditPress}
        >
          <IconEssential name="edit-1" width={20} height={20} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleResetOnboarding}
        >
          <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
        </TouchableOpacity>

      </View>

      {/* Photo Picker Button - Only in Edit Mode */}
      {isEditing && (
        <TouchableOpacity 
          style={styles.photoPickerButton}
          onPress={handleImagePress}
        >
          <MaterialIcons name="camera-alt" size={30} color="#FFFFFF" />
          <Text style={styles.photoPickerButtonText}>Change Photo</Text>
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
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.saveEditButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 48,
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
    overflow: 'hidden',
    zIndex: 1,
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
    paddingTop: 20,
    paddingLeft: 20,
    paddingRight: 20,
    // Removed paddingBottom to eliminate safe area bar
    zIndex: 999, // Very high z-index to ensure it stays on top
  },
  cardInfo: {
    flex: 1,
    // Height is now controlled by animation
    zIndex: 1000, // Very high z-index to ensure text stays in front
  },
  cardInfoScroll: {
    flex: 1,
    zIndex: 1001, // Even higher z-index for scrollable content
  },
  cardInfoContent: {
    paddingTop: 35, // Add top padding to position text lower in the card
    // Removed bottom padding to make text extend all the way down
  },
  nameAgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  nameAgeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cardName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  ageSeparator: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardAge: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardLocation: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
  },
  locationName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  festivalName: {
    fontSize: 24,
    color: '#ff4444',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
    width: '100%',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  festivalContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
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
    marginBottom: 15,
    lineHeight: 20,
  },
  bioLabel: {
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: '600',
  },
  bioText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginTop: 5,
  },
  leftTapArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: width / 2, // Equal width - half each
    height: '100%', // Cover the entire card including photo and text areas
    zIndex: 1002, // Higher z-index to ensure taps work over text overlay
  },
  rightTapArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: width / 2, // Equal width - half each
    height: '100%', // Cover the entire card including photo and text areas
    zIndex: 1002, // Higher z-index to ensure taps work over text overlay
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
  photoIndicator: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 3,
  },
  distanceIndicator: {
    position: 'absolute',
    top: 45,
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
    bottom: 87,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    zIndex: 10000,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#666666',
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
});
  
  export default ProfileScreen; 