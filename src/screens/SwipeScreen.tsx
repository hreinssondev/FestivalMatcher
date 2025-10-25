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
  Alert,
  Modal,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MatchingService } from '../services/matchingService';
import { DeviceAuthService } from '../services/deviceAuthService';
import { useProfile } from '../context/ProfileContext';
import { usePremium } from '../context/PremiumContext';
import { User } from '../types/index';
import { MainTabParamList } from '../../App';
import MatchPopup from '../components/MatchPopup';
import PremiumPopup from '../components/PremiumPopup';
import { supabase } from '../utils/supabase';


const { width, height } = Dimensions.get('window');

type SwipeScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Swipe'>;

const SwipeScreen = () => {
  const navigation = useNavigation<SwipeScreenNavigationProp>();
  const { isPremium } = usePremium();
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [potentialMatches, setPotentialMatches] = useState<User[]>([]);
  const [isFading, setIsFading] = useState(false);
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const infoHeightAnim = React.useRef(new Animated.Value(200)).current;
  const cardOpacityAnim = React.useRef(new Animated.Value(1)).current;

  const currentUser = potentialMatches[currentUserIndex];
  const [floatingBarTextIndex, setFloatingBarTextIndex] = useState(0); // Start with distance
  const floatingBarTexts = [
    { icon: "location-on" as const, text: `${currentUser?.distance || 0} km away` },
    { icon: "location-on" as const, text: `Tap to Show on Map` }
  ];

  const handleFloatingBarPress = () => {
    if (floatingBarTextIndex === 0) {
      // First tap: show "Show on Map ?" text
      setFloatingBarTextIndex(1);
    } else {
      // Second tap: navigate to Map tab
      navigation.navigate('Map');
    }
  };

  // Reset text index when user changes
  useEffect(() => {
    if (currentUser) {
      setFloatingBarTextIndex(0); // Reset to distance text
    }
  }, [currentUser]);


  const preloadImages = (photos: string[]) => {
    // Aggressively prefetch all photos
    photos.forEach(photoUrl => {
      if (photoUrl) {
        Image.prefetch(photoUrl).catch(() => {
          // Silently handle prefetch errors
        });
      }
    });
  };

  // Preload all images of current user when they change
  useEffect(() => {
    if (currentUser && currentUser.photos && currentUser.photos.length > 0) {
      preloadImages(currentUser.photos);
    }
  }, [currentUser]);

  const loadPotentialMatches = async () => {
    try {
      const deviceUserId = await DeviceAuthService.getDeviceUserId();
      const userLocation = { latitude: 0, longitude: 0 }; // Default location
      const result = await MatchingService.getAllUsersByDistance(deviceUserId, userLocation);
      
      if (result.error) {
        console.error('Error loading matches:', result.error);
        return;
      }
      
      // Additional filter to ensure current user is never shown
      const filteredUsers = result.users.filter(user => user.id !== deviceUserId);
      
      setPotentialMatches(filteredUsers);
      
      // Aggressively preload images for the first 5 users for instant display
      filteredUsers.slice(0, 5).forEach(user => {
        if (user.photos && user.photos.length > 0) {
          preloadImages(user.photos);
        }
      });
    } catch (error) {
      console.error('Error loading potential matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPotentialMatches();
  }, []);

  // Refresh data when screen comes into focus (e.g., after clearing swipes)
  useFocusEffect(
    React.useCallback(() => {
      loadPotentialMatches();
    }, [])
  );

  const handleLike = async () => {
    if (!currentUser) return;
    
    try {
      const deviceUserId = await DeviceAuthService.getDeviceUserId();
      console.log('SwipeScreen: REAL LIKE - About to record swipe for user:', currentUser.name, 'deviceUserId:', deviceUserId);
      
      // First, try to record the swipe (ignore errors)
      try {
        await MatchingService.recordSwipe(deviceUserId, currentUser.id, 'like');
        console.log('SwipeScreen: Swipe recorded successfully');
      } catch (swipeError: any) {
        console.log('SwipeScreen: Swipe error (continuing anyway):', swipeError);
      }
      
      // Now check if there's a match (either new or existing)
      try {
        // Check if these users are already matched
        const existingMatch = await MatchingService.checkIfMatched(deviceUserId, currentUser.id);
        console.log('SwipeScreen: Match check result:', existingMatch);
        
        if (existingMatch.isMatched) {
          console.log('SwipeScreen: MATCH FOUND! Showing popup for:', currentUser.name);
          setMatchedUser(currentUser);
          setShowMatchPopup(true);
          return; // Don't proceed to next card yet
        }
      } catch (matchError: any) {
        console.log('SwipeScreen: Match check error:', matchError);
      }
      
      console.log('SwipeScreen: No match, proceeding to next card');
      
      // Add fade-out effect
      setIsFading(true);
      Animated.timing(cardOpacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        nextCard();
        cardOpacityAnim.setValue(1);
        setIsFading(false);
      });
      
    } catch (error) {
      console.error('Error in handleLike:', error);
      
      // Even if there's an error, proceed to next card
      setIsFading(true);
      Animated.timing(cardOpacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        nextCard();
        cardOpacityAnim.setValue(1);
        setIsFading(false);
      });
    }
  };

  // Test function to force show popup
  const testMatchPopup = () => {
    console.log('SwipeScreen: Testing match popup');
    console.log('SwipeScreen: Current user:', currentUser);
    console.log('SwipeScreen: showMatchPopup state:', showMatchPopup);
    console.log('SwipeScreen: matchedUser state:', matchedUser);
    if (currentUser) {
      setMatchedUser(currentUser);
      setShowMatchPopup(true);
      console.log('SwipeScreen: Set matchedUser and showMatchPopup to true');
    }
  };

  // Test function to simulate a real match
  const testRealMatch = async () => {
    console.log('SwipeScreen: Testing real match simulation');
    if (!currentUser) return;
    
    try {
      const deviceUserId = await DeviceAuthService.getDeviceUserId();
      console.log('SwipeScreen: Simulating match for user:', currentUser.name);
      
      // Simulate a match result
      const mockMatchResult = {
        swipe: { id: 'test-swipe' },
        match: { id: 'test-match', user1_id: deviceUserId, user2_id: currentUser.id },
        error: null
      };
      
      console.log('SwipeScreen: Mock match result:', mockMatchResult);
      if (mockMatchResult.match) {
        console.log('SwipeScreen: MOCK MATCH DETECTED! Showing popup for:', currentUser.name);
        setMatchedUser(currentUser);
        setShowMatchPopup(true);
        console.log('SwipeScreen: Set matchedUser and showMatchPopup from mock');
      }
    } catch (error) {
      console.error('Error in test real match:', error);
    }
  };

  const handleDislike = async () => {
    if (!currentUser) return;
    
    try {
      const deviceUserId = await DeviceAuthService.getDeviceUserId();
      await MatchingService.recordSwipe(deviceUserId, currentUser.id, 'dislike');
      
      // Add fade-out effect
      setIsFading(true);
      Animated.timing(cardOpacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        nextCard();
        cardOpacityAnim.setValue(1);
        setIsFading(false);
      });
      
    } catch (error) {
      console.error('Error recording dislike:', error);
    }
  };

  const nextCard = () => {
    if (currentUserIndex < potentialMatches.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1);
      setCurrentPhotoIndex(0);
      
      // Preload images for the next 2 users ahead
      const nextUser = potentialMatches[currentUserIndex + 1];
      const nextNextUser = potentialMatches[currentUserIndex + 2];
      
      if (nextUser && nextUser.photos && nextUser.photos.length > 0) {
        preloadImages(nextUser.photos);
      }
      if (nextNextUser && nextNextUser.photos && nextNextUser.photos.length > 0) {
        preloadImages(nextNextUser.photos);
      }
    } else {
      // Force the component to re-render with no more profiles state
      setCurrentUserIndex(potentialMatches.length);
    }
  };

  const nextPhoto = () => {
    if (currentPhotoIndex < currentUser.photos.length - 1) {
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

  const handleMatchClose = () => {
    setShowMatchPopup(false);
    setMatchedUser(null);
    
    // Proceed to next card after match popup closes
    setIsFading(true);
    Animated.timing(cardOpacityAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      nextCard();
      cardOpacityAnim.setValue(1);
      setIsFading(false);
    });
  };

  const handleSendMessage = async () => {
    if (!matchedUser) return;
    
    setShowMatchPopup(false);
    
    try {
      const deviceUserId = await DeviceAuthService.getDeviceUserId();
      
      // Find or create the match between the users
      const { data: existingMatch, error: findError } = await supabase
        .from('matches')
        .select('*')
        .or(`and(user1_id.eq.${deviceUserId},user2_id.eq.${matchedUser.id}),and(user1_id.eq.${matchedUser.id},user2_id.eq.${deviceUserId})`)
        .single();

      if (existingMatch) {
        console.log('SwipeScreen: Found existing match:', existingMatch.id);
        // Navigate directly to chat screen with keyboard ready
        navigation.navigate('Chat', {
          matchId: existingMatch.id,
          matchName: matchedUser.name,
          matchPhoto: matchedUser.photos?.[0] || null,
          openKeyboard: true // Flag to open keyboard immediately
        });
      } else {
        // Create a new match if it doesn't exist
        const { data: newMatch, error: createError } = await supabase
          .from('matches')
          .insert({
            user1_id: deviceUserId,
            user2_id: matchedUser.id
          })
          .select()
          .single();

        if (newMatch) {
          console.log('SwipeScreen: Created new match:', newMatch.id);
          // Navigate directly to chat screen with keyboard ready
          navigation.navigate('Chat', {
            matchId: newMatch.id,
            matchName: matchedUser.name,
            matchPhoto: matchedUser.photos?.[0] || null,
            openKeyboard: true // Flag to open keyboard immediately
          });
        } else {
          console.error('SwipeScreen: Error creating match:', createError);
          // Fallback to matches tab if there's an error
          navigation.navigate('Matches');
        }
      }
    } catch (error) {
      console.error('SwipeScreen: Error in handleSendMessage:', error);
      // Fallback to matches tab if there's an error
      navigation.navigate('Matches');
    }
    
    setMatchedUser(null);
  };

  const handleDirectMessage = () => {
    if (!currentUser) return;
    
    // Check if user has premium
    if (!isPremium) {
      setShowPremiumPopup(true);
      return;
    }
    
    console.log('SwipeScreen: Direct message to:', currentUser.name);
    
    // Create a match first (like regular chat) but mark it as a direct message
    const createDirectMessageMatch = async () => {
      try {
        const deviceUserId = await DeviceAuthService.getDeviceUserId();
        
        // Create a match record for direct messaging (just like regular matching)
        const { data: match, error } = await supabase
          .from('matches')
          .insert({
            user1_id: deviceUserId,
            user2_id: currentUser.id
          })
          .select()
          .single();

        if (error && error.code !== '23505') { // Ignore duplicate key errors
          console.log('SwipeScreen: Error creating direct message match:', error);
          // Try to find existing match
          const { data: existingMatch } = await supabase
            .from('matches')
            .select('*')
            .or(`and(user1_id.eq.${deviceUserId},user2_id.eq.${currentUser.id}),and(user1_id.eq.${currentUser.id},user2_id.eq.${deviceUserId})`)
            .single();
          
          if (existingMatch) {
            console.log('SwipeScreen: Found existing match:', existingMatch.id);
            navigation.navigate('Chat', {
              matchId: existingMatch.id,
              matchName: currentUser.name,
              matchPhoto: currentUser.photos?.[0] || null,
              isDirectMessage: true
            });
            return;
          }
        }

        // Navigate to chat screen with the new or existing match
        if (match?.id) {
          console.log('SwipeScreen: Created new match:', match.id);
          navigation.navigate('Chat', {
            matchId: match.id,
            matchName: currentUser.name,
            matchPhoto: currentUser.photos?.[0] || null,
            isDirectMessage: true
          });
        }
      } catch (error) {
        console.error('SwipeScreen: Error in direct message setup:', error);
        // Don't navigate if we can't create a proper match
        Alert.alert('Error', 'Unable to start direct message. Please try again.');
      }
    };

    createDirectMessageMatch();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profiles...</Text>
        </View>
      </View>
    );
  }

  if (!currentUser || currentUserIndex >= potentialMatches.length) {
    return (
      <View style={styles.container}>
        <View style={styles.noMoreContainer}>
          <MaterialIcons name="sentiment-dissatisfied" size={80} color="#666" />
          <Text style={styles.noMoreTitle}>No more souls left at this time</Text>
          <Text style={styles.noMoreSubtitle}>Check back later for new matches!</Text>
        </View>
      </View>
    );
  }

  // Safety check to prevent crashes
  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.noMoreText}>Profile not available</Text>
      </View>
    );
  }

  // Ensure currentPhotoIndex is within bounds
  const safePhotoIndex = Math.min(Math.max(0, currentPhotoIndex), currentUser.photos.length - 1);

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
        <Animated.View style={[styles.card, { opacity: cardOpacityAnim }]}>
          <PanGestureHandler onGestureEvent={onGestureEvent}>
            <Animated.View>
              <TouchableOpacity 
                onPress={() => {}} // Disabled - use the dedicated photo button instead
                disabled={true}
                activeOpacity={1}
              >
                {currentUser.photos && currentUser.photos.length > 0 ? (
                  <View style={styles.cardImage}>
                    {/* Render all images but only show current one - instant switching */}
                    {currentUser.photos.map((photoUri, index) => (
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
                        resizeMode="cover"
                        loadingIndicatorSource={undefined}
                        progressiveRenderingEnabled={true}
                        fadeDuration={0}
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
          {currentUser.photos && currentUser.photos.length > 0 && (
            <View style={styles.photoIndicator}>
              {currentUser.photos.map((_, index) => (
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
          

          
          {/* Profile info overlay - same as ProfileScreen */}

          
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
                      const realFestivals = currentUser.festival.split(',');
                      
                      // Clean layout: Only real festivals, no empty containers
                      return (
                        <>
                          {realFestivals.map((fest, index) => {
                            const festivalName = fest.trim();
                            const ticketTypes = currentUser.ticketType?.split(',') || [];
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
                      {currentUser.name}
                    </Text>
                    <Text style={styles.ageSeparator}> </Text>
                    <Text style={styles.cardAge}>
                      {currentUser.age}
                    </Text>
                  </View>

                  {(() => {
                    const bioText = currentUser.interests?.join(', ') || '';
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
        </Animated.View>
      </View>

      {/* Like Buttons - Same Position as ProfileScreen Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleDislike}
          disabled={!currentUser || currentUserIndex >= potentialMatches.length}
        >
          <MaterialIcons name="close" size={20} color="rgba(255, 255, 255, 0.82)" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleDirectMessage}
          disabled={!currentUser || currentUserIndex >= potentialMatches.length}
        >
          <MaterialIcons name="chat" size={20} color="rgba(255, 255, 255, 0.82)" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleLike}
          disabled={!currentUser || currentUserIndex >= potentialMatches.length}
        >
          <MaterialIcons name="favorite" size={20} color="rgba(255, 255, 255, 0.82)" />
        </TouchableOpacity>
      </View>

      {/* Profile Modal */}
      {currentUser && (
        <Modal
          visible={showProfileModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowProfileModal(false)}
        >
          <View style={styles.profileModalOverlay}>
            <View style={styles.profileModalContainer}>
              <TouchableOpacity
                style={styles.profileModalClose}
                onPress={() => setShowProfileModal(false)}
              >
                <MaterialIcons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>

              <ScrollView
                style={styles.profileModalScroll}
                contentContainerStyle={styles.profileModalContent}
                showsVerticalScrollIndicator={true}
              >
                {/* Profile Photos */}
                <View style={styles.profileModalPhotos}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.profileModalPhotoScroll}
                    ref={(ref) => {
                      if (ref) {
                        ref.scrollTo({ x: modalPhotoIndex * width * 0.9, animated: false });
                      }
                    }}
                  >
                    {currentUser.photos && currentUser.photos.length > 0 ? (
                      currentUser.photos.map((photo, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.profileModalPhotoContainer}
                          onPress={() => {
                            const nextIndex = (index + 1) % currentUser.photos.length;
                            setModalPhotoIndex(nextIndex);
                          }}
                          activeOpacity={0.9}
                        >
                          <Image
                            source={{ uri: photo }}
                            style={styles.profileModalPhoto}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.profileModalPhotoPlaceholder}>
                        <MaterialIcons name="person" size={80} color="#666" />
                        <Text style={styles.profileModalPhotoPlaceholderText}>No photos</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>

                {/* Profile Info */}
                <View style={styles.nameAgeContainer}>
                  <View style={styles.nameAgeRow}>
                    <Text style={styles.cardName}>
                      {currentUser.name}
                    </Text>
                      <Text style={styles.ageSeparator}> </Text>
                    <Text style={styles.cardAge}>
                      {currentUser.age}
                    </Text>
                  </View>

                  {(() => {
                    const bioText = currentUser.interests?.join(', ') || '';
                    if (bioText) {
                      return (
                        <Text style={styles.bioSection}>
                          {" "}{bioText}
                        </Text>
                      );
                    }
                    return null;
                  })()}

                  {/* Festival details with ticket and accommodation info */}
                  <View style={styles.festivalDetailsContainer}>
                    {currentUser.festival.split(',').map((fest, index) => {
                      const festivalName = fest.trim();
                      
                      const ticketTypes = currentUser.ticketType ? currentUser.ticketType.split(',').reduce((acc, item) => {
                        const match = item.match(/(.+?):\s*(.+)/);
                        if (match) {
                          acc[match[1].trim()] = match[2].trim();
                        }
                        return acc;
                      }, {} as { [key: string]: string }) : {};
                      
                      const accommodations = currentUser.accommodationType ? currentUser.accommodationType.split(',').reduce((acc, item) => {
                        const match = item.match(/(.+?):\s*(.+)/);
                        if (match) {
                          acc[match[1].trim()] = match[2].trim();
                        }
                        return acc;
                      }, {} as { [key: string]: string }) : {};
                      
                      const ticketType = ticketTypes[festivalName];
                      const accommodation = accommodations[festivalName];
                      
                      return (
                        <View key={index} style={styles.festivalDetailItem}>
                          <View style={styles.festivalDetailChip}>
                            <Text style={styles.festivalDetailChipText}>{festivalName}</Text>
                          </View>
                          <View style={styles.festivalDetails}>
                            {ticketType && (
                              <View style={styles.festivalDetailRow}>
                                <Text style={styles.festivalDetailIcon}>🎫</Text>
                                <Text style={styles.festivalDetailTicketText}>{ticketType}</Text>
                              </View>
                            )}
                            {accommodation && (
                              <View style={styles.festivalDetailRow}>
                                <Text style={styles.festivalDetailIcon}>🏠</Text>
                                <Text style={styles.festivalDetailTextContent}>{accommodation}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Match Popup */}
      {matchedUser && (
        <MatchPopup
          isVisible={showMatchPopup}
          matchedUser={matchedUser}
          onClose={handleMatchClose}
          onSendMessage={handleSendMessage}
        />
      )}

      {/* Premium Popup */}
      <PremiumPopup
        isVisible={showPremiumPopup}
        onClose={() => setShowPremiumPopup(false)}
        onUpgrade={() => {
          setShowPremiumPopup(false);
          navigation.navigate('Settings' as any);
        }}
        title="Premium Feature"
        message="Direct messaging is a premium feature!"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 173, // Moved up 5px to match ProfileScreen
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
    marginTop: 100, // Moved up 2px from +102 to +100
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
    top: 97.7, // Moved down to match ProfileScreen
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
    top: 20,
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
  centerLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flex: 1,
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
  noMoreContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noMoreTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
  },
  noMoreSubtitle: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  noMoreText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: height * 0.3,
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalContainer: {
    width: width * 0.9,
    height: height * 0.8,
    backgroundColor: '#2D2D2D',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileModalClose: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 5,
  },
  profileModalScroll: {
    flex: 1,
  },
  profileModalContent: {
    paddingBottom: 25,
    paddingLeft: 27,
    paddingRight: 20,
  },
  profileModalPhotos: {
    height: height * 0.4,
    marginBottom: 20,
    alignItems: 'center',
  },
  profileModalPhotoScroll: {
    flex: 1,
  },
  profileModalPhotoContainer: {
    width: width * 0.9,
    height: height * 0.4,
  },
  profileModalPhoto: {
    width: width * 0.9,
    height: height * 0.4,
  },
  profileModalPhotoPlaceholder: {
    width: width * 0.9,
    height: height * 0.4,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalPhotoPlaceholderText: {
    color: '#666',
    fontSize: 16,
    marginTop: 10,
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

export default SwipeScreen;
