import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfile } from '../context/ProfileContext';
import { User } from '../types';
import Icon from 'react-native-ico-essential';
import IconLodgicons from 'react-native-ico-lodgicons';
import { MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Mock data - will be updated with profile context
const createMockUsers = (profileData: any): User[] => [
  {
    id: '1',
    name: 'Sarah',
    age: 25,
    festival: profileData.festival,
    ticketType: profileData.ticketType,
    accommodationType: profileData.accommodationType,
    photos: [
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400'
    ],
    interests: ['Hiking', 'Coffee', 'Travel', 'Photography'],
    lastSeen: '1 km away - 6 minutes ago',
    distance: 2,
  },
  {
    id: '2',
    name: 'Mike',
    age: 28,
    festival: profileData.festival,
    ticketType: profileData.ticketType,
    accommodationType: profileData.accommodationType,
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400'
    ],
    interests: ['Music', 'Technology', 'Cooking', 'Fitness'],
    lastSeen: '2 km away - 6 minutes ago',
    distance: 5,
  },
  {
    id: '3',
    name: 'Emma',
    age: 23,
    festival: profileData.festival,
    ticketType: profileData.ticketType,
    accommodationType: profileData.accommodationType,
    photos: [
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400'
    ],
    interests: ['Art', 'Yoga', 'Meditation', 'Reading'],
    lastSeen: '3 km away - 6 minutes ago',
    distance: 1,
  },
  {
    id: '4',
    name: 'Alex',
    age: 26,
    festival: profileData.festival,
    ticketType: profileData.ticketType,
    accommodationType: profileData.accommodationType,
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
    ],
    interests: ['Adventure', 'Food', 'Travel', 'Fitness'],
    lastSeen: '4 km away - 6 minutes ago',
    distance: 3,
  },
  {
    id: '5',
    name: 'Sophia',
    age: 24,
    festival: profileData.festival,
    ticketType: profileData.ticketType,
    accommodationType: profileData.accommodationType,
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400'
    ],
    interests: ['Music', 'Art', 'Poetry', 'Nature'],
    lastSeen: '5 km away - 6 minutes ago',
    distance: 4,
  },
];

const SwipeScreen: React.FC = () => {
  const { profileData } = useProfile();
  const mockUsers = createMockUsers(profileData);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const infoHeightAnim = React.useRef(new Animated.Value(200)).current;
 // Shorter default height

  const currentUser = mockUsers[currentUserIndex];

  // Safety check to prevent crashes
  if (!currentUser || currentUserIndex >= mockUsers.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.noMoreText}>No more profiles to show!</Text>
      </View>
    );
  }

  const handleLike = () => {
    nextCard();
  };

  const handleDislike = () => {
    nextCard();
  };

  const nextCard = () => {
    if (currentUserIndex < mockUsers.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1);
      setCurrentPhotoIndex(0);
    }
  };

  const nextPhoto = () => {
    if (currentUser && currentPhotoIndex < currentUser.photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const previousPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  const switchPhoto = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (direction === 'left' && currentPhotoIndex < currentUser.photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    } else if (direction === 'right' && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    } else if (direction === 'up' && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    } else if (direction === 'down' && currentPhotoIndex < currentUser.photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

    const onGestureEvent = (event: any) => {
    const { translationY, state } = event.nativeEvent;

    if (state === State.END) {
      if (translationY < -50) {
        // Swipe up - go to previous photo
        switchPhoto('up');
      } else if (translationY > 50) {
        // Swipe down - go to next photo
        switchPhoto('down');
      }
    }
  };



  // Safety check to prevent crashes
  if (!currentUser || currentUserIndex >= mockUsers.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.noMoreText}>No more profiles to show!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <PanGestureHandler onGestureEvent={onGestureEvent}>
            <Animated.View>
              <Image 
                source={{ uri: currentUser.photos[currentPhotoIndex] || currentUser.photos[0] }} 
                style={styles.cardImage} 
              />
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
            {currentUser.photos && currentUser.photos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.photoDot,
                  index === currentPhotoIndex && styles.photoDotActive
                ]}
              />
            ))}
          </View>
          
          {/* Distance indicator */}
          <View style={styles.distanceIndicator}>
            <View style={styles.distanceRow}>
              <MaterialIcons name="location-on" size={16} color="#FFFFFF" style={styles.locationIcon} />
              <Text style={styles.distanceText}>{currentUser.lastSeen.split(' - ')[0]}</Text>
            </View>
            <Text style={styles.timeText}>{currentUser.lastSeen.split(' - ')[1]}</Text>
          </View>
          

          
          {/* Profile info overlay - same as ProfileScreen */}
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
                <Text style={styles.cardName}>
                  {currentUser.name}, {currentUser.age}
                </Text>
                <View style={styles.festivalContainer}>
                  <Text style={styles.festivalName}>{currentUser.festival}</Text>
                </View>

                <Text style={styles.cardBio}>
                  <Text style={styles.bioLabel}>Ticket: </Text>{currentUser.ticketType}{'\n'}
                  <Text style={styles.bioLabel}>Accommodation: </Text>{currentUser.accommodationType}{'\n'}
                  <Text style={styles.bioText}>- Looking for afterparty buddy</Text>
                </Text>
              </ScrollView>
            </Animated.View>
          </LinearGradient>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.actionButton, styles.dislikeButton]} onPress={handleDislike}>
          <Text style={styles.actionButtonText}>✕</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.superLikeButton]}>
          <IconLodgicons name="1-star" width={20} height={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.likeButton]} onPress={handleLike}>
          <Text style={styles.actionButtonText}>♥</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  settingsButton: {
    position: 'absolute',
    top: 53,
    left: 20,
    zIndex: 1000,
    padding: 10,
  },
  adjustButton: {
    position: 'absolute',
    top: 53,
    right: 20,
    zIndex: 1000,
    padding: 10,
  },
  adjustIcon: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  line: {
    width: 24,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
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
    overflow: 'hidden', // Ensure rounded corners are visible
    zIndex: 1, // Base z-index for the card
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    zIndex: 1, // Base z-index for the image
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
  cardName: {
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
    paddingHorizontal: 0,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 34,
    left: 155,
    width: 152,
    zIndex: 10000,
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
  bottomSection: {
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 88,
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
  dislikeButton: {
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#666666',
  },
  superLikeButton: {
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#666666',
  },
  likeButton: {
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#666666',
  },
  actionButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  starIcon: {
    fontSize: 20,
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
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  locationIcon: {
    position: 'absolute',
    left: -18,
    top: 0,
  },
  distanceText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    alignSelf: 'center',
  },
  timeText: {
    fontSize: 12,
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
  noMoreText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  nameAgeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 5,
    position: 'relative',
  },
  flagEmoji: {
    fontSize: 18,
    marginLeft: 5,
    position: 'absolute',
    top: -7,
    right: 185,
  },
  flagContainer: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 12,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    // Add a subtle border to make it look more like a tab
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
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
});

export default SwipeScreen; 