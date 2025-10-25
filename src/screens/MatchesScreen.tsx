import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList, Match } from '../types';
import { formatTime } from '../utils/helpers';
import { useProfile } from '../context/ProfileContext';
import { MatchingService } from '../services/matchingService';
import { DeviceAuthService } from '../services/deviceAuthService';


type MatchesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const { width, height } = Dimensions.get('window');

const MatchesScreen: React.FC = () => {
  const navigation = useNavigation<MatchesScreenNavigationProp>();
  const { profileData } = useProfile();
  const [matches, setMatches] = useState<Match[]>([]);
  const [directMessages, setDirectMessages] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [toggleValue, setToggleValue] = useState(0); // 0: All, 1: DM, 2: Matches
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const [floatingBarTextIndex, setFloatingBarTextIndex] = useState(0); // Start with distance
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [deleteTargetMatch, setDeleteTargetMatch] = useState<Match | null>(null);
  const [deletePopupPosition, setDeletePopupPosition] = useState({ x: 0, y: 0 });

  // Floating bar texts for profile overlay
  const floatingBarTexts = [
    { icon: "location-on" as const, text: `${selectedMatch?.user?.distance || 0} km away` },
    { icon: "location-on" as const, text: `Show on Map ?` }
  ];

  // Handle floating bar press for profile overlay
  const handleFloatingBarPress = () => {
    if (floatingBarTextIndex === 0) {
      // First tap: show "Show on Map ?" text
      setFloatingBarTextIndex(1);
    } else {
      // Second tap: navigate to Map tab
      navigation.navigate('Map' as any);
    }
  };

  // Reset text index when selected match changes
  useEffect(() => {
    if (selectedMatch) {
      setFloatingBarTextIndex(0); // Reset to distance text
    }
  }, [selectedMatch]);

  // Prefetch images for instant loading
  const preloadImages = (photos: string[]) => {
    photos.forEach(photoUrl => {
      if (photoUrl) {
        Image.prefetch(photoUrl).catch(() => {
          // Silently handle prefetch errors
        });
      }
    });
  };

  // Preload all images when a match is selected
  useEffect(() => {
    if (selectedMatch && selectedMatch.user.photos && selectedMatch.user.photos.length > 0) {
      preloadImages(selectedMatch.user.photos);
    }
  }, [selectedMatch]);
  


  // Combine matches and direct messages based on toggle value
  const filteredMatches = (() => {
    switch (toggleValue) {
      case 0: // All
        return [...matches, ...directMessages];
      case 1: // DM - only show direct messages
        return directMessages;
      case 2: // Matches - only show actual matches
        return matches;
      default:
        return [...matches, ...directMessages];
    }
  })();

  // Load matches and direct messages from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const deviceUserId = await DeviceAuthService.getDeviceUserId();
        
        // Load matches
        const matchesResult = await MatchingService.getUserMatches(deviceUserId);
        if (matchesResult.error) {
          throw matchesResult.error;
        }
        setMatches(matchesResult.matches);
        
        // Preload all match photos for instant display
        matchesResult.matches.forEach(match => {
          if (match.user.photos && match.user.photos.length > 0) {
            preloadImages(match.user.photos);
          }
        });
        
        // Load direct messages (users who sent messages but aren't matched)
        const dmResult = await MatchingService.getDirectMessages(deviceUserId);
        if (dmResult.error) {
          console.error('Error loading direct messages:', dmResult.error);
          setDirectMessages([]);
        } else {
          setDirectMessages(dmResult.messages);
          // Preload DM photos too
          dmResult.messages.forEach(dm => {
            if (dm.user.photos && dm.user.photos.length > 0) {
              preloadImages(dm.user.photos);
            }
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleMatchPress = (match: Match) => {
    // Navigate to chat (same for both regular and direct messages)
    navigation.navigate('Chat', {
      matchId: match.id,
      matchName: match.user.name,
      matchPhoto: match.user.photos[0],
      openKeyboard: true // Always open keyboard when navigating from matches
    });
  };







  const closeProfileModal = () => {
    // Animate out fast
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 150, // Fast exit animation
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowProfileModal(false);
      setSelectedMatch(null);
      setCurrentPhotoIndex(0);
      // Reset animation values for next time
      modalOpacity.setValue(0);
      modalScale.setValue(0.8);
    });
  };

  const nextPhoto = () => {
    if (selectedMatch) {
      setCurrentPhotoIndex((prevIndex) => (prevIndex + 1) % selectedMatch.user.photos.length);
    }
  };

  const previousPhoto = () => {
    if (selectedMatch) {
      setCurrentPhotoIndex((prevIndex) => (prevIndex - 1 + selectedMatch.user.photos.length) % selectedMatch.user.photos.length);
    }
  };

  const onSwipeGesture = (event: any) => {
    const { translationY, state } = event.nativeEvent;
    
    if (state === State.END) {
      // Swipe down to close modal
      if (translationY > 100) {
        closeProfileModal();
      }
    }
  };

  const handleRemoveConnection = async (match: Match) => {
    console.log('Long press detected! handleRemoveConnection called for MatchesScreen');
    setDeleteTargetMatch(match);
    setShowDeletePopup(true);
  };

  const confirmDeleteConnection = async () => {
    if (!deleteTargetMatch) return;
    
    try {
      const deviceUserId = await DeviceAuthService.getDeviceUserId();
      
      const result = await MatchingService.removeConnection(deviceUserId, deleteTargetMatch.user.id);
      
      if (result.success) {
        // Refresh the matches list
        const deviceUserId = await DeviceAuthService.getDeviceUserId();
        const matchesResult = await MatchingService.getUserMatches(deviceUserId);
        if (!matchesResult.error) {
          setMatches(matchesResult.matches);
        }
        const dmResult = await MatchingService.getDirectMessages(deviceUserId);
        if (!dmResult.error) {
          setDirectMessages(dmResult.messages);
        }
        
        // Show success message briefly
        Alert.alert('Connection Removed', 'The connection has been removed successfully.');
      } else {
        Alert.alert('Error', 'Failed to remove connection. Please try again.');
      }
    } catch (error) {
      console.error('Error removing connection:', error);
      Alert.alert('Error', 'Failed to remove connection. Please try again.');
    }
    
    setShowDeletePopup(false);
    setDeleteTargetMatch(null);
  };

  const cancelDeleteConnection = () => {
    setShowDeletePopup(false);
    setDeleteTargetMatch(null);
  };

  const handlePressIn = (match: Match) => {
    console.log('MatchesScreen: Press in detected');
    const timer = setTimeout(() => {
      console.log('MatchesScreen: Long press timer triggered!');
      handleRemoveConnection(match);
    }, 500);
    setLongPressTimer(timer);
  };

  const handlePressOut = () => {
    console.log('MatchesScreen: Press out detected');
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleCirclePress = (match: Match) => {
    // Only show profile popup if no delete popup is active
    if (!showDeletePopup) {
      setSelectedMatch(match);
      setCurrentPhotoIndex(0);
      setShowProfileModal(true);
      
      // Animate in
      Animated.parallel([
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalScale, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchItem}
      onPress={() => handleMatchPress(item)}
      onPressIn={() => handlePressIn(item)}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
    >
      {item.user.photos && item.user.photos.length > 0 && item.user.photos[0] ? (
        <Image source={{ uri: item.user.photos[0] }} style={styles.matchItemImage} />
      ) : (
        <View style={styles.noPhotoContainer}>
          <MaterialIcons name="person" size={24} color="#666" />
        </View>
      )}
      <View style={styles.matchInfo}>
        <View style={styles.matchItemHeader}>
          <Text style={styles.matchItemName}>
            {item.user.name}, {item.user.age}
          </Text>
          {item.lastMessage && (
            <Text style={styles.matchTime}>
              {formatTime(item.lastMessage.timestamp)}
            </Text>
          )}
        </View>
        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage.senderId === 'me' ? 'You: ' : ''}
            {item.lastMessage.text}
          </Text>
        )}
        {item.lastMessage && !item.lastMessage.isRead && item.lastMessage.senderId !== 'me' && (
          <View style={styles.unreadIndicator} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Match circles header */}
      <View style={styles.matchHeader}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.matchScrollContainer}
          decelerationRate={0.8}
          scrollEventThrottle={1}
        >
          {filteredMatches.map((match) => (
            <TouchableOpacity
              key={match.id}
              style={styles.matchCircleContainer}
              onPress={() => handleCirclePress(match)}
              onPressIn={() => handlePressIn(match)}
              onPressOut={handlePressOut}
              activeOpacity={0.7}
            >
              <View style={styles.matchCircle}>
                {match.user.photos && match.user.photos.length > 0 && match.user.photos[0] ? (
                  <Image 
                    source={{ uri: match.user.photos[0] }} 
                    style={styles.matchImage}
                  />
                ) : (
                  <View style={styles.noPhotoContainer}>
                    <MaterialIcons name="person" size={24} color="#666" />
                  </View>
                )}
              </View>
              <Text style={styles.matchName}>{match.user.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Toggle Buttons */}
      <View style={styles.toggleContainer}>
        {/* Minimalist background bar */}
        <View style={styles.toggleBackground} />
        <View style={styles.toggleButtons}>
          <TouchableOpacity 
            style={[
              styles.toggleButton, 
              toggleValue === 0 && styles.toggleButtonActive
            ]}
            onPress={() => setToggleValue(0)}
          >
            <Text style={[
              styles.toggleButtonText, 
              toggleValue === 0 && styles.toggleButtonTextActive
            ]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.toggleButton, 
              toggleValue === 2 && styles.toggleButtonActive
            ]}
            onPress={() => setToggleValue(2)}
          >
            <Text style={[
              styles.toggleButtonText, 
              toggleValue === 2 && styles.toggleButtonTextActive
            ]}>
              Matches
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.toggleButton, 
              toggleValue === 1 && styles.toggleButtonActive
            ]}
            onPress={() => setToggleValue(1)}
          >
            <Text style={[
              styles.toggleButtonText, 
              toggleValue === 1 && styles.toggleButtonTextActive
            ]}>
              Direct Messages
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {filteredMatches.length > 0 ? (
        <FlatList
          data={filteredMatches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          decelerationRate={0.8}
          scrollEventThrottle={1}
          removeClippedSubviews={true}
          snapToAlignment="start"
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySubtitle}>
            Start swiping to find your perfect match!
          </Text>
        </View>
      )}

      {/* Profile Overlay */}
      {showProfileModal && selectedMatch && (
        <Animated.View style={[
          styles.profileOverlay,
          {
            opacity: modalOpacity,
            transform: [{ scale: modalScale }],
          }
        ]}>
          {/* Close Button */}
          <TouchableOpacity style={styles.profileCloseButton} onPress={closeProfileModal}>
            <MaterialIcons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.profileCard}>
            {/* Floating bar above card */}
            <View style={styles.floatingBar}>
              <TouchableOpacity 
                style={styles.floatingBarContent}
                onPress={handleFloatingBarPress}
                activeOpacity={0.8}
              >
                <View style={styles.floatingBarLeft}>
                  <MaterialIcons name={floatingBarTexts[floatingBarTextIndex].icon} size={16} color="#FFFFFF" />
                  <Text style={styles.floatingBarText}>{floatingBarTexts[floatingBarTextIndex].text}</Text>
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.cardContainer}>
              <View style={styles.card}>
                <View>
                  <TouchableOpacity 
                    onPress={() => {}} // Disabled - use the dedicated photo button instead
                    disabled={true}
                    activeOpacity={1}
                  >
                    {selectedMatch.user.photos && selectedMatch.user.photos.length > 0 ? (
                      <View style={styles.cardImage}>
                        {/* Render all images but only show current one - instant switching */}
                        {selectedMatch.user.photos.map((photoUri, index) => (
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
                                opacity: index === currentPhotoIndex ? 1 : 0,
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
                </View>
                
                {/* Photo navigation tap areas - left and right only */}
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
                
                {/* Bottom tap areas for photo navigation */}
                <TouchableOpacity 
                  style={styles.bottomLeftTapArea} 
                  onPressIn={previousPhoto}
                  activeOpacity={0.8}
                  delayPressIn={0}
                  delayLongPress={200}
                  onLongPress={() => {}} // Ignore long press
                />
                <TouchableOpacity 
                  style={styles.bottomRightTapArea} 
                  onPressIn={nextPhoto}
                  activeOpacity={0.8}
                  delayPressIn={0}
                  delayLongPress={200}
                  onLongPress={() => {}} // Ignore long press
                />
                
                {/* Photo indicator dots */}
                {selectedMatch.user.photos && selectedMatch.user.photos.length > 0 && (
                  <View style={styles.photoIndicator}>
                    {selectedMatch.user.photos.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.photoDot,
                          index === currentPhotoIndex && styles.photoDotActive
                        ]}
                      />
                    ))}
                  </View>
                )}
                
                {/* Profile info overlay - same as ProfileScreen */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)']}
                  locations={[0, 0.3, 0.7, 1]}
                  style={[styles.cardOverlay, { zIndex: 9999 }]} // Very high z-index to stay in front
                >
                  <View 
                    style={[
                      styles.cardInfo,
                      { zIndex: 1000 } // Ensure animated wrapper stays in front
                    ]}
                  >
                    <ScrollView 
                      style={styles.cardInfoScroll}
                      showsVerticalScrollIndicator={true}
                      contentContainerStyle={styles.cardInfoContent}
                      scrollEventThrottle={16}
                      nestedScrollEnabled={true}
                      bounces={true}
                    >
                      <View style={styles.nameAgeContainer}>
                        <View style={styles.nameAgeRow}>
                          <Text style={styles.cardName}>
                            {selectedMatch.user.name}
                          </Text>
                          <Text style={styles.ageSeparator}> </Text>
                          <Text style={styles.cardAge}>
                            {selectedMatch.user.age}
                          </Text>
                        </View>

                        {(() => {
                          const bioText = selectedMatch.user.interests?.join(', ') || '';
                          if (bioText) {
                            return (
                              <Text style={styles.bioSection}>
                                -  {bioText}
                              </Text>
                            );
                          }
                          return null;
                        })()}

                        {/* Festival details with ticket and accommodation info */}
                        <View style={styles.festivalDetailsContainer}>
                          {selectedMatch.user.festival.split(',').map((fest, index) => {
                            const festivalName = fest.trim();
                            
                            // Parse ticket types
                            const ticketTypes = selectedMatch.user.ticketType ? selectedMatch.user.ticketType.split(',').reduce((acc, item) => {
                              const match = item.match(/(.+?):\s*(.+)/);
                              if (match) {
                                acc[match[1].trim()] = match[2].trim();
                              }
                              return acc;
                            }, {} as { [key: string]: string }) : {};
                            
                            // Parse accommodations
                            const accommodations = selectedMatch.user.accommodationType ? selectedMatch.user.accommodationType.split(',').reduce((acc, item) => {
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
                                      <Text style={styles.festivalDetailTextContent}>{ticketType}</Text>
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
                </LinearGradient>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Custom Delete Popup */}
      {showDeletePopup && deleteTargetMatch && (
        <View style={styles.deletePopupOverlay}>
          <View style={styles.deletePopup}>
            <Text style={styles.deletePopupTitle}>Remove Connection?</Text>
            <Text style={styles.deletePopupSubtitle}>
              This will delete all messages with {deleteTargetMatch.user.name}
            </Text>
            <View style={styles.deletePopupButtons}>
              <TouchableOpacity 
                style={styles.deletePopupCancelButton} 
                onPress={cancelDeleteConnection}
              >
                <Text style={styles.deletePopupCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deletePopupDeleteButton} 
                onPress={confirmDeleteConnection}
              >
                <Text style={styles.deletePopupDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  matchHeader: {
    backgroundColor: '#1A1A1A',
    paddingTop: 53,
    paddingBottom: 15,
    paddingHorizontal: 20,
    minHeight: 120, // Ensure minimum height so toggle bar doesn't move when no matches
  },
  matchScrollContainer: {
    paddingVertical: 7,
    gap: 15,
  },
  matchCircleContainer: {
    alignItems: 'center',
  },
     matchCircle: {
     width: 76,
     height: 76,
     borderRadius: 38,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#ff6b6b',
  },
  matchName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'normal',
    marginTop: 2,
    textAlign: 'center',
  },
  matchImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  listContainer: {
    padding: 20,
    paddingTop: 16, // Decreased from 20 to 16 to move chat tiles up 4px
  },
  matchItem: {
    flexDirection: 'row',
    backgroundColor: '#0F0F0F',
    borderRadius: 15,
    padding: 15,
    marginBottom: 13,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
       matchItemImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 15,
  },
  matchInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  matchItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  matchItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  matchTime: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  lastMessage: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff6b6b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Profile Overlay Styles
  profileOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCloseButton: {
    position: 'absolute',
    top: 148,
    right: 20,
    zIndex: 1000,
    backgroundColor: '#000000',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    width: width,
    height: height,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  profileCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  leftTapArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 10,
  },
  rightTapArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 10,
  },
  photoIndicator: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 20,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  photoDotActive: {
    backgroundColor: '#FFFFFF',
  },
  distanceIndicator: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 20,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  locationIcon: {
    marginRight: 4,
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  profileCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 30,
    zIndex: 10,
  },
  profileCardInfoScroll: {
    maxHeight: height * 0.3,
  },
  nameAgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileCardName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 10,
  },
  festivalChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
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
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  festivalRow: {
    width: '100%',
    marginBottom: 5,
  },
  festivalName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
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
    fontSize: 11,
  },
  festivalDetailTextContent: {
    fontSize: 11,
    color: '#CCCCCC',
    fontWeight: '500',
    marginTop: 2,
  },
  festivalDetailTicketText: {
    fontSize: 11,
    color: '#CCCCCC',
    fontWeight: '500',
    marginTop: 1,
  },
  festivalDetailText: {
    fontSize: 11,
    color: '#CCCCCC',
    fontWeight: '500',
    marginTop: 2,
  },
  profileCardBio: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
  },
  bioLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4444',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  bioText: {
    fontWeight: 'normal',
    color: '#fff',
  },
  // Toggle Button Styles
  toggleContainer: {
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    width: '100%',
    position: 'relative',
  },
  toggleBackground: {
    position: 'absolute',
    top: 6,
    left: 10,
    right: 10,
    bottom: 6, // equal spacing top and bottom
    backgroundColor: 'rgba(51, 51, 51, 0.3)',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#333333',
    borderRadius: 16,
    minWidth: 90,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#ff6b6b',
  },
  // Exact SwipeScreen styles for profile modal
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: width * 0.9 + 4,
    height: height * 0.55 + 90,
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
    zIndex: 1,
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
    paddingLeft: 0,
    paddingRight: 20,
    zIndex: 999,
  },
  cardInfo: {
    flex: 1,
    zIndex: 1000,
  },
  cardInfoScroll: {
    flex: 1,
    zIndex: 1001,
  },
  cardInfoContent: {
    paddingTop: 35,
    paddingLeft: 20,
    paddingRight: 60,
  },
  nameAgeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 5,
    marginTop: 10,
  },
  nameAgeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 0,
    marginBottom: 5,
  },
  cardName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  ageSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardAge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
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
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: '600',
    marginTop: -5,
  },
  bioText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 18,
    marginTop: 0,
  },
  leftTapArea: {
    position: 'absolute',
    left: 20,
    top: 0,
    width: (width / 2) - 20,
    height: '100%',
    zIndex: 1002,
  },
  rightTapArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 60,
    height: '100%',
    zIndex: 1002,
  },
  bottomLeftTapArea: {
    position: 'absolute',
    left: 0,
    bottom: -50,
    width: width / 2,
    height: 100,
    zIndex: 1002,
  },
  bottomRightTapArea: {
    position: 'absolute',
    right: 0,
    bottom: -50,
    width: width / 2,
    height: 100,
    zIndex: 1002,
  },
  floatingBar: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: '#000000',
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
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noPhotoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2D2D2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    color: '#999',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  deletePopupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  deletePopup: {
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    padding: 20,
    width: width * 0.8,
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deletePopupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  deletePopupSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  deletePopupButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  deletePopupCancelButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  deletePopupDeleteButton: {
    flex: 1,
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  deletePopupCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deletePopupDeleteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MatchesScreen;