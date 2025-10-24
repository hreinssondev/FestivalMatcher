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
  Modal,
  TextInput,
  Alert,
} from 'react-native';

import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

import { useProfile } from '../context/ProfileContext';
import { LocationService } from '../services/locationService';
import { DeviceAuthService } from '../services/deviceAuthService';
import { MatchingService } from '../services/matchingService';
import { User, Match } from '../types';
import DateTimePicker from '@react-native-community/datetimepicker';
import UserCountPopup from '../components/UserCountPopup';
import { useUserCount } from '../context/UserCountContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

const { width, height } = Dimensions.get('window');

const MapScreen: React.FC = () => {
  const { profileData } = useProfile();
  const { hasUserCountFeature, activateUserCountFeature } = useUserCount();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [directMessages, setDirectMessages] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const infoHeightAnim = useRef(new Animated.Value(200)).current;
  
  // Meetup functionality states
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [meetupPin, setMeetupPin] = useState<any>(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [meetupMessage, setMeetupMessage] = useState('');
  
  // Message functionality states
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [quickMessage, setQuickMessage] = useState('');
  
  // Ping functionality states
  const [isPinging, setIsPinging] = useState(false);
  const [pingInterval, setPingInterval] = useState(3600); // Default 1 hour
  const [showPingSettings, setShowPingSettings] = useState(false);
  const [pingTarget, setPingTarget] = useState('All'); // 'All' or 'Matches'
  const [showPingControls, setShowPingControls] = useState(false);
  const [showUserCountDetails, setShowUserCountDetails] = useState(false);
  const [showUserCountPopup, setShowUserCountPopup] = useState(false);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);
  const [userCountResults, setUserCountResults] = useState<{
    totalUsers: number;
    visibleUsers: number;
    totalUserPhotos: string[];
    visibleUserPhotos: string[];
  } | null>(null);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const circleAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  
  // Ping interval options
  const pingIntervals = [
    { label: 'Real time', value: 1 },
    { label: '1h', value: 3600 }
  ];

  // Load matches and direct messages from Supabase (same as MatchesScreen)
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
        
        // Load direct messages (users who sent messages but aren't matched)
        const dmResult = await MatchingService.getDirectMessages(deviceUserId);
        if (dmResult.error) {
          console.error('Error loading direct messages:', dmResult.error);
          setDirectMessages([]);
        } else {
          setDirectMessages(dmResult.messages);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Auto-hide ping controls after 5 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (showPingControls) {
      timer = setTimeout(() => {
        setShowPingControls(false);
      }, 5000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showPingControls]);

  // Circle ripple and pulse animation effect
  useEffect(() => {
    if (isPinging) {
      // Slow pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );

      // Circle ripple animations - staggered start times
      const circles = circleAnims.map((anim, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 600), // Stagger circles
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        )
      );

      pulse.start();
      circles.forEach(circle => circle.start());

      return () => {
        pulse.stop();
        circles.forEach(circle => circle.stop());
        // Reset animation values immediately when stopping
        pulseAnim.setValue(1);
        circleAnims.forEach(anim => anim.setValue(0));
      };
    } else {
      // Stop all animations and reset values when not pinging
      pulseAnim.stopAnimation(() => {
        pulseAnim.setValue(1);
      });
      circleAnims.forEach(anim => {
        anim.stopAnimation(() => {
          anim.setValue(0);
        });
      });
    }
  }, [isPinging, pulseAnim, circleAnims]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  // Center map on user's location when it becomes available
  // Combine matches and direct messages, showing latest first
  const allMatches = [...matches, ...directMessages].sort((a, b) => {
    if (!a.lastMessage && !b.lastMessage) return 0;
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
  });

  useEffect(() => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 1000);
    }
  }, [location]);

  const handleMarkerPress = (match: Match) => {
    if (!showDeletePopup) {
      setSelectedUser(match.user);
      setCurrentPhotoIndex(0);
      setShowProfileModal(true);
    }
  };

  const handleCirclePress = (match: Match) => {
    if (mapRef.current && match.user.coordinate) {
      mapRef.current.animateToRegion({
        latitude: match.user.coordinate.latitude || 0,
        longitude: match.user.coordinate.longitude || 0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setSelectedUser(null);
  };



  const nextPhoto = () => {
    if (selectedUser && currentPhotoIndex < selectedUser.photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const previousPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  const handleSuggestMeetup = () => {
    setShowProfileModal(false);
    setIsPlacingPin(true);
            console.log('Place Pin: Tap on the map to place a meetup location pin');
  };

  const handleMapPress = (event: any) => {
    if (isPlacingPin) {
      const coordinate = event.nativeEvent.coordinate;
      setMeetupPin(coordinate);
      setIsPlacingPin(false);
      setShowTimeModal(true);
    }
  };

  const handleSendMeetupRequest = () => {
    if (!meetupPin || !selectedUser) return;
    
    const meetupRequest = {
      user: selectedUser.name,
      location: meetupPin,
      date: selectedDate.toDateString(),
      time: selectedTime.toTimeString().substring(0, 5),
      message: meetupMessage
    };
    
    console.log(`Meetup Request Sent! Sent meetup request to ${selectedUser.name} for ${meetupRequest.date} at ${meetupRequest.time}`);
    
    // Reset states
    setShowTimeModal(false);
    setMeetupPin(null);
    setMeetupMessage('');
    setSelectedDate(new Date());
    setSelectedTime(new Date());
  };

  const cancelMeetupRequest = () => {
    setIsPlacingPin(false);
    setShowTimeModal(false);
    setMeetupPin(null);
    setMeetupMessage('');
  };

  const cancelTimeModal = () => {
    setShowTimeModal(false);
    setIsPlacingPin(true);
    setMeetupMessage('');
    // Keep the pin but go back to placement mode
  };

  const handleMessageNow = () => {
    setShowProfileModal(false);
    setShowMessageModal(true);
  };

  const sendQuickMessage = () => {
    if (!quickMessage.trim() || !selectedUser) return;
    
    console.log(`Message Sent! Your message "${quickMessage}" has been sent to ${selectedUser.name} and will appear in your chat.`);
    
    // Reset states
    setShowMessageModal(false);
    setQuickMessage('');
  };

  const cancelMessage = () => {
    setShowMessageModal(false);
    setQuickMessage('');
  };

  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);

  const handleRemoveConnection = async () => {
    console.log('Long press detected! handleRemoveConnection called for MapScreen');
    if (!selectedUser) return;
    
    setDeleteTargetUser(selectedUser);
    setShowDeletePopup(true);
  };

  const confirmDeleteConnection = async () => {
    if (!deleteTargetUser) return;
    
    try {
      const deviceUserId = await DeviceAuthService.getDeviceUserId();
      
      const result = await MatchingService.removeConnection(deviceUserId, deleteTargetUser.id);
      
      if (result.success) {
        closeProfileModal();
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
        
        Alert.alert('Connection Removed', 'The connection has been removed successfully.');
      } else {
        Alert.alert('Error', 'Failed to remove connection. Please try again.');
      }
    } catch (error) {
      console.error('Error removing connection:', error);
      Alert.alert('Error', 'Failed to remove connection. Please try again.');
    }
    
    setShowDeletePopup(false);
    setDeleteTargetUser(null);
  };

  const cancelDeleteConnection = () => {
    setShowDeletePopup(false);
    setDeleteTargetUser(null);
  };

  const handlePressIn = () => {
    console.log('MapScreen: Press in detected');
    const timer = setTimeout(() => {
      console.log('MapScreen: Long press timer triggered!');
      handleRemoveConnection();
    }, 500);
    setLongPressTimer(timer);
  };

  const handlePressOut = () => {
    console.log('MapScreen: Press out detected');
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // User count feature functions
  const searchNearbyUsers = async () => {
    if (!location) {
      Alert.alert('Error', 'Location not available. Please enable location services.');
      return;
    }

    setIsSearchingUsers(true);
    try {
      const deviceUserId = await DeviceAuthService.getDeviceUserId();
      
      // Simulate API call to get nearby users within 10km
      // In a real implementation, this would call your backend API
      const mockResults = {
        totalUsers: Math.floor(Math.random() * 50) + 10, // 10-60 users
        visibleUsers: Math.floor(Math.random() * 30) + 5, // 5-35 users
        totalUserPhotos: Array.from({ length: Math.floor(Math.random() * 20) + 5 }, (_, i) => 
          `https://picsum.photos/100/100?random=${i}`
        ),
        visibleUserPhotos: Array.from({ length: Math.floor(Math.random() * 15) + 3 }, (_, i) => 
          `https://picsum.photos/100/100?random=${i + 100}`
        ),
      };

      setUserCountResults(mockResults);
      navigation.navigate('UserCountResults', { userCountResults: mockResults });
      setShowUserCountDetails(false);
    } catch (error) {
      console.error('Error searching nearby users:', error);
      Alert.alert('Error', 'Failed to search nearby users. Please try again.');
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleUserCountPurchase = () => {
    activateUserCountFeature();
    setShowUserCountPopup(false);
    searchNearbyUsers();
  };

  const handleShowUserCountResults = () => {
    if (userCountResults) {
      navigation.navigate('UserCountResults', { userCountResults });
    } else {
      searchNearbyUsers();
    }
  };

  // Listen for when user returns from results screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // When returning to MapScreen, hide the user count details
      setShowUserCountDetails(false);
      // When returning to MapScreen, ensure we have results to show
      if (hasUserCountFeature && !userCountResults) {
        // If user has feature but no results, trigger a search
        searchNearbyUsers();
      }
    });

    return unsubscribe;
  }, [navigation, hasUserCountFeature, userCountResults]);

  const handleUpdateUserCountSearch = () => {
    searchNearbyUsers();
  };

  const handlePingLocation = () => {
    if (isPinging) {
      // If already pinging, show controls or stop pinging
      if (showPingControls) {
        // Stop pinging
        console.log('Stop pinging your location - Are you sure you want to stop pinging?');
        setIsPinging(false);
        setShowPingControls(false);
        console.log('Pinging Stopped - Your location is no longer being shared with other users.');
      } else {
        // Show controls
        setShowPingControls(true);
      }
    } else {
      // Start pinging
      console.log(`Ping your location to others - Are you sure? This will ping your location to other users even if you have not matched yet. Pings will update every ${pingInterval < 60 ? `${pingInterval} seconds` : pingInterval < 3600 ? `${Math.floor(pingInterval / 60)} minutes` : `${Math.floor(pingInterval / 3600)} hour`}.`);
      setIsPinging(true);
      setShowPingControls(true);
      console.log(`Location Pinged! Your location is now visible to other users. Your ping will update automatically every ${pingInterval < 60 ? `${pingInterval} seconds` : pingInterval < 3600 ? `${Math.floor(pingInterval / 60)} minutes` : `${Math.floor(pingInterval / 3600)} hour`}.`);
    }
  };

  const initialRegion = location ? {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  } : {
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <View style={styles.container}>
      {/* Match circles header */}
      <View style={styles.matchHeader}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.matchScrollContainer}
        >
          {allMatches.map((match) => (
            <TouchableOpacity
              key={match.id}
              style={styles.matchCircleContainer}
              onPress={() => handleCirclePress(match)}
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

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onPress={handleMapPress}
      >
        {allMatches.map((match) => (
          <Marker
            key={match.id}
            coordinate={match.user.coordinate || { latitude: 0, longitude: 0 }}
            onPress={() => handleMarkerPress(match)}
          >
            <View style={styles.markerContainer}>
              <View style={styles.markerImageContainer}>
                {match.user.photos && match.user.photos.length > 0 && match.user.photos[0] ? (
                  <Image 
                    source={{ uri: match.user.photos[0] }} 
                    style={styles.markerImage}
                  />
                ) : (
                  <View style={styles.noPhotoContainer}>
                    <MaterialIcons name="person" size={20} color="#666" />
                  </View>
                )}
              </View>
            </View>
          </Marker>
        ))}
        
        {/* Meetup pin */}
        {meetupPin && (
          <Marker
            coordinate={meetupPin}
            pinColor="red"
            title="Meetup Location"
            description="Suggested meetup spot"
          />
        )}
      </MapView>

      {/* Profile Modal */}
      {showProfileModal && selectedUser && (
        <View style={styles.profileModal}>
          <TouchableOpacity style={styles.modalBackground} onPress={closeProfileModal} />
          <View style={styles.profileCard}>
            <TouchableOpacity 
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.7}
            >
              {selectedUser.photos && selectedUser.photos.length > 0 && selectedUser.photos[currentPhotoIndex] ? (
                <Image 
                  source={{ uri: selectedUser.photos[currentPhotoIndex] }} 
                  style={styles.profileImage} 
                />
              ) : (
                <View style={styles.noPhotoContainer}>
                  <MaterialIcons name="person" size={80} color="#666" />
                  <Text style={styles.noPhotoText}>No photo available</Text>
                </View>
              )}
            </TouchableOpacity>
            
            {/* Photo navigation tap areas */}
            <TouchableOpacity 
              style={styles.leftTapArea} 
              onPress={previousPhoto}
              activeOpacity={0.8}
            />
            <TouchableOpacity 
              style={styles.rightTapArea} 
              onPress={nextPhoto}
              activeOpacity={0.8}
            />
            
            {/* Photo indicator dots */}
            {selectedUser.photos && selectedUser.photos.length > 0 && (
              <View style={styles.photoIndicator}>
                {selectedUser.photos.map((_: any, index: number) => (
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
            
            {/* Distance indicator */}
            <View style={styles.distanceIndicator}>
              <Text style={styles.distanceText}>{selectedUser.lastSeen.split(' - ')[0]}</Text>
              <Text style={styles.timeText}>{selectedUser.lastSeen.split(' - ')[1]}</Text>
            </View>
            
            {/* Profile info overlay - scrollable area */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)']}
              locations={[0, 0.3, 0.7, 1]}
              style={styles.profileOverlay}
            >
              <Animated.View style={[styles.profileInfo, { height: infoHeightAnim }]}>
                <ScrollView 
                  style={styles.profileInfoScroll}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.profileInfoContent}
                >
                  <Text style={styles.profileName}>
                    {selectedUser.name}, {selectedUser.age}
                  </Text>

                  {(() => {
                    const bioText = selectedUser.interests?.join(', ') || '';
                    if (bioText) {
                      return (
                        <Text style={styles.profileBio}>
                          <Text style={styles.bioText}>-  {bioText}</Text>
                        </Text>
                      );
                    }
                    return null;
                  })()}

                  <View style={styles.festivalContainer}>
                    {selectedUser.festival.split(',').map((fest, index) => {
                      const festivalName = fest.trim();
                      
                      // Parse ticket types
                      const ticketTypes = selectedUser.ticketType ? selectedUser.ticketType.split(',').reduce((acc, item) => {
                        const match = item.match(/(.+?):\s*(.+)/);
                        if (match) {
                          acc[match[1].trim()] = match[2].trim();
                        }
                        return acc;
                      }, {} as { [key: string]: string }) : {};
                      
                      // Parse accommodations
                      const accommodations = selectedUser.accommodationType ? selectedUser.accommodationType.split(',').reduce((acc, item) => {
                        const match = item.match(/(.+?):\s*(.+)/);
                        if (match) {
                          acc[match[1].trim()] = match[2].trim();
                        }
                        return acc;
                      }, {} as { [key: string]: string }) : {};
                      
                      const ticketType = ticketTypes[festivalName];
                      const accommodation = accommodations[festivalName];
                      
                      return (
                        <View key={index} style={styles.festivalRow}>
                          <Text style={styles.festivalName}>{festivalName}</Text>
                          <View style={styles.festivalDetails}>
                            {ticketType && (
                              <Text style={styles.festivalDetailText}>
                                🎫 {ticketType}
                              </Text>
                            )}
                            {accommodation && (
                              <Text style={styles.festivalDetailText}>
                                🏠 {accommodation}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </Animated.View>
            </LinearGradient>
            
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={closeProfileModal}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {/* Action buttons below profile */}
          <View style={styles.profileActionButtons}>
            <TouchableOpacity style={styles.profileActionButton} onPress={handleMessageNow}>
              <Text style={styles.profileActionButtonText}>Message now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileActionButton} onPress={handleSuggestMeetup}>
              <Text style={styles.profileActionButtonText}>Suggest meetup</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Time Selection Modal */}
      {showTimeModal && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showTimeModal}
          onRequestClose={cancelTimeModal}
        >
          <View style={styles.timeModalContainer}>
            <View style={styles.timeModalContent}>
              <Text style={styles.timeModalTitle}>Schedule Meetup</Text>
              <Text style={styles.timeModalSubtitle}>When would you like to meet?</Text>
              
              <View style={styles.dateTimeContainer}>
                {/* Quick Date Buttons */}
                <View style={styles.quickDateContainer}>
                  {[0, 1, 2, 3].map((dayOffset) => {
                    const quickDate = new Date();
                    quickDate.setDate(quickDate.getDate() + dayOffset);
                    const isSelected = quickDate.toDateString() === selectedDate.toDateString();
                    const dayLabel = dayOffset === 0 ? 'Today' : 
                                   dayOffset === 1 ? 'Tomorrow' : 
                                   quickDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    
                    return (
                      <TouchableOpacity
                        key={dayOffset}
                        style={[styles.quickDateButton, isSelected && styles.quickDateButtonSelected]}
                        onPress={() => {
                          setSelectedDate(quickDate);
                          setShowDatePicker(false);
                          setShowTimePicker(false);
                        }}
                      >
                        <Text style={[styles.quickDateText, isSelected && styles.quickDateTextSelected]}>
                          {dayLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity 
                  style={styles.dateTimeButton} 
                  onPress={() => {
                    setShowTimePicker(false);
                    setShowDatePicker(!showDatePicker);
                  }}
                >
                  <Text style={styles.dateTimeLabel}>Other Date:</Text>
                  <Text style={styles.dateTimeValue}>{selectedDate.toDateString()}</Text>
                </TouchableOpacity>
                
                {showDatePicker && (
                  <View style={styles.dateTimePickerContainer}>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      minimumDate={new Date()}
                      maximumDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)} // 30 days from now
                      textColor="#FFFFFF"
                      onChange={(event, date) => {
                        if (date) setSelectedDate(date);
                      }}
                      style={styles.dateTimePicker}
                    />
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.dateTimeButton} 
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(!showTimePicker);
                  }}
                >
                  <Text style={styles.dateTimeLabel}>Time:</Text>
                  <Text style={styles.dateTimeValue}>{selectedTime.toTimeString().substring(0, 5)}</Text>
                </TouchableOpacity>

                {showTimePicker && (
                  <View style={styles.dateTimePickerContainer}>
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      display="spinner"
                      textColor="#FFFFFF"
                      minuteInterval={15}
                      onChange={(event, time) => {
                        if (time) setSelectedTime(time);
                      }}
                      style={styles.dateTimePicker}
                    />
                  </View>
                )}
              </View>

              <TextInput
                style={styles.messageInput}
                placeholder="Optional message..."
                placeholderTextColor="#999"
                value={meetupMessage}
                onChangeText={setMeetupMessage}
                multiline
                numberOfLines={3}
              />

              <View style={styles.timeModalButtons}>
                <TouchableOpacity 
                  style={[styles.timeModalButton, styles.cancelButton]} 
                  onPress={cancelTimeModal}
                >
                  <Text style={styles.cancelButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.timeModalButton, styles.sendButton]} 
                  onPress={handleSendMeetupRequest}
                >
                  <Text style={styles.sendButtonText}>Send Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Quick Message Modal */}
      {showMessageModal && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showMessageModal}
          onRequestClose={cancelMessage}
        >
          <View style={styles.messageModalContainer}>
            <View style={styles.messageModalContent}>
              <Text style={styles.messageModalTitle}>Send Message</Text>
              <Text style={styles.messageModalSubtitle}>Send a quick message to {selectedUser?.name}</Text>
              
              <TextInput
                style={styles.quickMessageInput}
                placeholder="Type your message..."
                placeholderTextColor="#999"
                value={quickMessage}
                onChangeText={setQuickMessage}
                multiline
                numberOfLines={4}
                autoFocus
                maxLength={500}
              />

              <View style={styles.messageModalButtons}>
                <TouchableOpacity 
                  style={[styles.messageModalButton, styles.messageCancelButton]} 
                  onPress={cancelMessage}
                >
                  <Text style={styles.messageCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.messageModalButton, styles.messageSendButton]} 
                  onPress={sendQuickMessage}
                >
                  <Text style={styles.messageSendButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Pin placement indicator */}
      {isPlacingPin && (
        <View style={styles.pinPlacementIndicator}>
          <Text style={styles.pinPlacementText}>Tap on the map to place meetup pin</Text>
          <TouchableOpacity style={styles.cancelPinButton} onPress={cancelMeetupRequest}>
            <Text style={styles.cancelPinText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* X button to stop pin placement */}
      {isPlacingPin && (
        <TouchableOpacity style={styles.stopPinPlacementButton} onPress={cancelMeetupRequest}>
          <Text style={styles.stopPinPlacementText}>✕</Text>
        </TouchableOpacity>
      )}

      {/* Ping Settings Modal */}
      {showPingSettings && (
        <View style={styles.pingSettingsModal}>
          <TouchableOpacity style={styles.modalBackground} onPress={() => setShowPingSettings(false)} />
          <View style={styles.pingSettingsContainer}>
            <Text style={styles.pingSettingsTitle}>Ping Interval</Text>
            <Text style={styles.pingSettingsSubtitle}>How often should your location be updated?</Text>
            
            <View style={styles.intervalOptions}>
              {pingIntervals.map((interval, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.intervalOption,
                    pingInterval === interval.value && styles.intervalOptionSelected
                  ]}
                  onPress={() => setPingInterval(interval.value)}
                >
                  <Text style={[
                    styles.intervalOptionText,
                    pingInterval === interval.value && styles.intervalOptionTextSelected
                  ]}>
                    {interval.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.pingSettingsCloseButton}
              onPress={() => setShowPingSettings(false)}
            >
              <Text style={styles.pingSettingsCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Ping Target Toggle - shown when pinging is active and controls are visible */}
      {isPinging && showPingControls && (
        <View style={styles.pingTargetContainer}>
          <Text style={styles.pingTargetTitle}>Who should see your ping?</Text>
          <View style={styles.pingToggleContainer}>
            <TouchableOpacity 
              style={styles.pingToggleTrack}
              onPress={() => setPingTarget(pingTarget === 'All' ? 'Matches' : 'All')}
            >
              <View 
                style={[
                  styles.pingToggleThumb,
                  pingTarget === 'Matches' && styles.pingToggleThumbRight,
                  pingTarget === 'All' && styles.pingToggleThumbGreen,
                  pingTarget === 'Matches' && styles.pingToggleThumbRed
                ]}
              />
              <Text style={[
                styles.pingToggleLabel,
                styles.pingToggleLabelLeft,
                pingTarget === 'All' && styles.pingToggleLabelActive
              ]}>All</Text>
              <Text style={[
                styles.pingToggleLabel,
                styles.pingToggleLabelRight,
                pingTarget === 'Matches' && styles.pingToggleLabelActive
              ]}>Only Matches</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Ping Interval Slider - shown when pinging is active and controls are visible */}
      {isPinging && showPingControls && (
        <View style={styles.pingSliderContainer}>
          <View style={styles.pingSliderOptions}>
            {pingIntervals.map((interval, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pingSliderOption,
                  pingInterval === interval.value && styles.pingSliderOptionSelected,
                  pingInterval === interval.value && {
                    borderColor: pingTarget === 'All' ? '#4CAF50' : '#ff4444'
                  }
                ]}
                onPress={() => setPingInterval(interval.value)}
              >
                <Text style={[
                  styles.pingSliderOptionText,
                  pingInterval === interval.value && styles.pingSliderOptionTextSelected,
                  pingInterval === interval.value && {
                    color: pingTarget === 'All' ? '#4CAF50' : '#ff4444'
                  }
                ]}>
                  {interval.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}



      {/* View Results Button - Only show if user has purchased */}
      {hasUserCountFeature && (
        <View style={styles.userCountButtonAbovePing}>
          <TouchableOpacity 
            style={styles.viewResultsButton}
            onPress={handleShowUserCountResults}
            disabled={isSearchingUsers}
          >
            <Text style={styles.viewResultsButtonText}>
              {isSearchingUsers ? 'Searching...' : 'View Results'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ping Location Button - Centered */}
      <View style={[
        styles.pingLocationButton,
        isPinging && {
          marginLeft: -27.5, // Adjust centering when expanded to 55px
          width: 55,
          height: 55,
          borderRadius: 27.5,
        }
      ]}>
        {/* Expanding circles */}
        {isPinging && circleAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.rippleCircle,
              {
                top: -32.5, // Adjust for 55px button when pinging
                left: -32.5,
                borderColor: pingTarget === 'All' ? '#4CAF50' : '#ff4444',
                transform: [
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 3],
                    }),
                  },
                ],
                opacity: anim.interpolate({
                  inputRange: [0, 0.05, 0.25, 1],
                  outputRange: [0, 0.6, 0.1, 0],
                }),
              },
            ]}
          />
        ))}
        
        <Animated.View 
          style={[
            styles.pingLocationButtonInner,
            isPinging && {
              width: 55,
              height: 55,
              borderRadius: 27.5,
              transform: [{ scale: pulseAnim }],
              backgroundColor: '#333333', // Brighter gray when pinging
            }
          ]}
        >
          <TouchableOpacity 
            style={[
              styles.pingLocationButtonTouch,
              isPinging && {
                width: 55,
                height: 55,
                borderRadius: 27.5,
              }
            ]}
            onPress={handlePingLocation}
          >
            <MaterialIcons 
              name="location-on" 
              size={isPinging ? 24 : 20} 
              color={isPinging ? (pingTarget === 'All' ? '#4CAF50' : '#ff4444') : '#FFFFFF'} 
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Custom Delete Popup */}
      {showDeletePopup && deleteTargetUser && (
        <View style={styles.deletePopupOverlay}>
          <View style={styles.deletePopup}>
            <Text style={styles.deletePopupTitle}>Remove Connection?</Text>
            <Text style={styles.deletePopupSubtitle}>
              This will delete all messages with {deleteTargetUser.name}
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

      {/* User Count Popup */}
      <UserCountPopup
        isVisible={showUserCountPopup}
        onClose={() => setShowUserCountPopup(false)}
        onPurchase={handleUserCountPurchase}
        userCountResults={userCountResults}
        onUpdateSearch={handleUpdateUserCountSearch}
        isSearching={isSearchingUsers}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  matchHeader: {
    backgroundColor: '#1A1A1A',
    paddingTop: 51,
    paddingBottom: 6,
    paddingHorizontal: 20,
  },
  matchScrollContainer: {
    paddingVertical: 9,
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
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  profileCard: {
    position: 'absolute',
    top: '10%',
    left: '5%',
    right: '5%',
    height: '75%',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  leftTapArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: width / 2,
    height: '100%',
    zIndex: 100,
  },
  rightTapArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: width / 2,
    height: '100%',
    zIndex: 100,
  },
  photoIndicator: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 200,
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
  distanceIndicator: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  distanceText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
  },
  profileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingLeft: 20,
    paddingRight: 20,
    zIndex: 300,
  },
  profileInfo: {
    flex: 1,
    zIndex: 400,
  },
  profileInfoScroll: {
    flex: 1,
    zIndex: 500,
  },
  profileInfoContent: {
    paddingTop: 20,
  },
  profileName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  festivalContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    alignItems: 'flex-start',
    justifyContent: 'center',
    position: 'absolute',
    top: 21,
    left: 155,
    width: 152,
    zIndex: 10000,
    overflow: 'hidden',
    flexDirection: 'column',
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
  festivalRow: {
    width: '100%',
    marginBottom: 5,
  },
  festivalName: {
    fontSize: 24,
    color: '#ff4444',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'left',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  festivalDetails: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  festivalDetailText: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  profileBio: {
    fontSize: 14,
    color: '#fff',
    marginTop: 10,
    marginBottom: 15,
    lineHeight: 20,
  },
  bioLabel: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '600',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  bioText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginTop: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileActionButtons: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    zIndex: 1000,
    paddingHorizontal: 8,
  },
  profileActionButton: {
    flex: 1,
    backgroundColor: '#666666',
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileActionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  timeModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  timeModalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  timeModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  timeModalSubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 20,
  },
  dateTimeContainer: {
    marginBottom: 20,
  },
  dateTimeButton: {
    backgroundColor: '#333333',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTimeLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dateTimeValue: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '500',
  },
  messageInput: {
    backgroundColor: '#333333',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  timeModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  timeModalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666666',
  },
  sendButton: {
    backgroundColor: '#ff6b6b',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dateTimePickerContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    marginVertical: 10,
    padding: 10,
    alignItems: 'center',
  },
  dateTimePicker: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
  },
  quickDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 8,
  },
  quickDateButton: {
    flex: 1,
    backgroundColor: '#333333',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444444',
  },
  quickDateButtonSelected: {
    backgroundColor: '#ff6b6b',
    borderColor: '#ff6b6b',
  },
  quickDateText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickDateTextSelected: {
    color: '#FFFFFF',
  },
  pinPlacementIndicator: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: '#ff6b6b',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000,
  },
  pinPlacementText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  cancelPinButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  cancelPinText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
  stopPinPlacementButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  stopPinPlacementText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  messageModalContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingTop: '55%',
  },
  messageModalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 350,
  },
  messageModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  messageModalSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 20,
  },
  quickMessageInput: {
    backgroundColor: '#333333',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    textAlignVertical: 'top',
    minHeight: 100,
    fontSize: 16,
  },
  messageModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  messageModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  messageCancelButton: {
    backgroundColor: '#666666',
  },
  messageSendButton: {
    backgroundColor: '#ff6b6b',
  },
  messageCancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
    messageSendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rippleCircle: {
    position: 'absolute',
    top: -37.5, // Center circle around button (45px button, so -37.5 to center 120px circle)
    left: -37.5,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    backgroundColor: 'transparent',
    zIndex: 5,
    pointerEvents: 'none', // Allow touches to pass through to button below
  },
  // User Count Button Container
  userCountButtonContainer: {
    position: 'absolute',
    bottom: 90,
    left: '50%',
    marginLeft: -69.5, // 42px left from center (-27.5 - 42)
    flexDirection: 'column',
    alignItems: 'flex-start',
    zIndex: 10000,
  },
  userCountTextContainer: {
    marginBottom: 0,
    marginLeft: -110,
    marginTop: 5,
    alignItems: 'flex-start',
    minHeight: 40,
    justifyContent: 'flex-start',
    position: 'relative',
    top: -40,
    width: 600,
  },
  userCountText: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 15,
    maxWidth: 180,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  userCountTextInitial: {
    position: 'absolute',
    bottom: 32,
    left: -3,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'normal',
    textAlign: 'left',
    lineHeight: 19,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {
      width: 1,
      height: 1,
    },
    textShadowRadius: 3,
    maxWidth: 500,
    zIndex: 10000,
  },
  userCountTextContent: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'left',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {
      width: 1,
      height: 1,
    },
    textShadowRadius: 3,
    marginBottom: 4,
    marginTop: 1,
    marginLeft: 0,
    maxWidth: 180,
  },
  userCountTextSecondary: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'normal',
    textAlign: 'left',
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {
      width: 1,
      height: 1,
    },
    textShadowRadius: 3,
    marginBottom: 18,
    marginLeft: 0,
    maxWidth: 180,
  },
  userCountButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginTop: 10,
  },
  showMeButtonContainer: {
    position: 'absolute',
    bottom: -17,
    left: -1,
    zIndex: 10000,
  },
  userCountButtonAbovePing: {
    position: 'absolute',
    bottom: 153,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10000,
  },
  viewResultsButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  viewResultsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  showMeButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  showMeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  textTapArea: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  yesButton: {
    position: 'absolute',
    bottom: -40,
    left: 4.5,
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: '#4CAF50',
    borderWidth: 0.5,
    borderColor: '#45A049',
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
    zIndex: 10000,
  },
  yesButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Ping Location Button - Centered
  pingLocationButton: {
    position: 'absolute',
    bottom: 90,
    left: '50%',
    marginLeft: -22.5, // Half of width to center (45px)
    width: 45,
    height: 45,
    borderRadius: 22.5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10000,
  },
  pingLocationButtonInner: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#333333',
    borderWidth: 0.5,
    borderColor: '#666666',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Higher than ripple circles
  },
  pingLocationButtonTouch: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11, // Highest to ensure touch events work
  },
  // Collapse/Expand button styles
  collapseButton: {
    position: 'absolute',
    bottom: 232, // Above all other controls (moved 12px higher total)
    left: '50%',
    marginLeft: -15, // Center the 30px wide button
    width: 30,
    height: 20,
    backgroundColor: '#333333',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 13000,
  },
  bringUpButton: {
    position: 'absolute',
    bottom: 158, // Above the ping button (moved 38px higher total)
    left: '50%',
    marginLeft: -15, // Center the 30px wide button
    width: 30,
    height: 20,
    backgroundColor: '#333333',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 13000,
  },
  // Ping target toggle styles
  pingTargetContainer: {
    position: 'absolute',
    bottom: 189, // Move "All" and "Only Matches" toggle down 3px
    left: '50%',
    marginLeft: -65, // Half of width to center (130px wide)
    width: 130,
    backgroundColor: 'transparent',
    padding: 6,
    zIndex: 12000,
  },
  pingTargetTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },

  pingToggleContainer: {
    alignItems: 'center',
  },
  pingToggleTrack: {
    width: 151,
    height: 32,
    backgroundColor: '#333333',
    borderRadius: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pingToggleThumb: {
    position: 'absolute',
    left: 2,
    height: 28,
    borderRadius: 14,
    zIndex: 2,
  },
  pingToggleThumbRight: {
    left: 44, // Move 1px more to the left for wider thumb
    width: 105, // Even wider thumb for "Only Matches" text
  },
  pingToggleThumbGreen: {
    backgroundColor: '#4CAF50', // Green for All
    width: 42, // Shorter for "All"
  },
  pingToggleThumbRed: {
    backgroundColor: '#ff4444', // Red for Matches
  },
  pingToggleLabel: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    zIndex: 3,
  },
  pingToggleLabelLeft: {
    left: 14, // Move "All" text 2px to the left
  },
  pingToggleLabelRight: {
    right: 9, // Move "Only Matches" text 1px less to the right
  },
  pingToggleLabelActive: {
    color: '#FFFFFF',
  },
  // Ping slider styles
  pingSliderContainer: {
    position: 'absolute',
    bottom: 146, // Move ping pop-up buttons down 5px
    left: '50%',
    marginLeft: -100, // Half of width to center (200px wide)
    width: 200,
    backgroundColor: 'transparent', // Fully transparent
    borderRadius: 8,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
    zIndex: 12000,
  },

  pingSliderOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  pingSliderOption: {
    width: '31%',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pingSliderOptionSelected: {
    backgroundColor: '#444444',
  },
  pingSliderOptionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  pingSliderOptionTextSelected: {
    color: '#ff4444',
    fontWeight: 'bold',
  },
  pingSettingsModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15000,
  },
  pingSettingsContainer: {
    position: 'absolute',
    bottom: 200,
    left: 20,
    right: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pingSettingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  pingSettingsSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 20,
  },
  intervalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  intervalOption: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#333333',
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  intervalOptionSelected: {
    backgroundColor: '#444444',
    borderColor: '#ff4444',
  },
  intervalOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  intervalOptionTextSelected: {
    color: '#ff4444',
    fontWeight: 'bold',
  },
  pingSettingsCloseButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    padding: 12,
  },
  pingSettingsCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  noPhotoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2D2D2D',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
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

export default MapScreen; 