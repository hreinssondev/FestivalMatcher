import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  Animated,
  Modal,
  TextInput,
} from 'react-native';

import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Icon from 'react-native-ico-interaction';

import { useProfile } from '../context/ProfileContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height } = Dimensions.get('window');

// Mock user data for nearby users (not matches) - ordered by distance, closest first
const createMockMapUsers = (profileData: any, userLocation?: any) => {
  // Default coordinates (will be overridden if user location is available)
  const baseLat = userLocation?.coords?.latitude || 37.7749;
  const baseLng = userLocation?.coords?.longitude || -122.4194;
  
  return [
    {
      id: '7',
      name: 'Liam',
      age: 25,
      festival: profileData.festival,
      ticketType: profileData.ticketType,
      accommodationType: profileData.accommodationType,
      coordinate: {
        latitude: baseLat + 0.001, // ~0.1 km north
        longitude: baseLng + 0.001, // ~0.1 km east
      },
      photos: [
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
        'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400'
      ],
      lastSeen: '0.5 km away - 2 minutes ago',
      isPinging: true,
      allowsDirectMessages: true,
    },
    {
      id: '8',
      name: 'Zoe',
      age: 22,
      festival: profileData.festival,
      ticketType: profileData.ticketType,
      accommodationType: profileData.accommodationType,
      coordinate: {
        latitude: baseLat - 0.002, // ~0.2 km south
        longitude: baseLng + 0.002, // ~0.2 km east
      },
      photos: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
        'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400'
      ],
      lastSeen: '1.2 km away - 5 minutes ago',
      isPinging: false,
      allowsDirectMessages: true,
    },
    {
      id: '9',
      name: 'Marcus',
      age: 29,
      festival: profileData.festival,
      ticketType: profileData.ticketType,
      accommodationType: profileData.accommodationType,
      coordinate: {
        latitude: baseLat + 0.003, // ~0.3 km north
        longitude: baseLng - 0.001, // ~0.1 km west
      },
      photos: [
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
        'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
      ],
      lastSeen: '2.1 km away - 8 minutes ago',
      isPinging: true,
      allowsDirectMessages: false,
    },
    {
      id: '10',
      name: 'Isabella',
      age: 24,
      festival: profileData.festival,
      ticketType: profileData.ticketType,
      accommodationType: profileData.accommodationType,
      coordinate: {
        latitude: baseLat - 0.004, // ~0.4 km south
        longitude: baseLng - 0.002, // ~0.2 km west
      },
      photos: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
        'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400'
      ],
      lastSeen: '3.5 km away - 12 minutes ago',
      isPinging: false,
      allowsDirectMessages: true,
    },
    {
      id: '11',
      name: 'Noah',
      age: 26,
      festival: profileData.festival,
      ticketType: profileData.ticketType,
      accommodationType: profileData.accommodationType,
      coordinate: {
        latitude: baseLat + 0.005, // ~0.5 km north
        longitude: baseLng + 0.003, // ~0.3 km east
      },
      photos: [
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'
      ],
      lastSeen: '4.8 km away - 18 minutes ago',
      isPinging: true,
      allowsDirectMessages: true,
    },
  ];
};

const MapScreen: React.FC = () => {
  const { profileData } = useProfile();
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const mockUsers = createMockMapUsers(profileData, location);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
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
  const [pingInterval, setPingInterval] = useState(60); // Default 1 minute
  const [showPingSettings, setShowPingSettings] = useState(false);
  const [pingTarget, setPingTarget] = useState('All'); // 'All' or 'Matches'
  const [isPingControlsCollapsed, setIsPingControlsCollapsed] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const circleAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  
  // Ping interval options
  const pingIntervals = [
    { label: 'Real time', value: 1 },
    { label: '1 min', value: 60 },
    { label: '5 min', value: 300 }
  ];

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

  const handleMarkerPress = (user: any) => {
    setSelectedUser(user);
    setCurrentPhotoIndex(0);
    setShowProfileModal(true);
  };

  const handleCirclePress = (user: any) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: user.coordinate.latitude,
        longitude: user.coordinate.longitude,
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
    Alert.alert('Place Pin', 'Tap on the map to place a meetup location pin');
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
    
    Alert.alert(
      'Meetup Request Sent!', 
      `Sent meetup request to ${selectedUser.name} for ${meetupRequest.date} at ${meetupRequest.time}`
    );
    
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
    
    Alert.alert(
      'Message Sent!', 
      `Your message "${quickMessage}" has been sent to ${selectedUser.name} and will appear in your chat.`
    );
    
    // Reset states
    setShowMessageModal(false);
    setQuickMessage('');
  };

  const cancelMessage = () => {
    setShowMessageModal(false);
    setQuickMessage('');
  };

  const handlePingLocation = () => {
    if (isPinging) {
      // Stop pinging - show confirmation dialog
      Alert.alert(
        'Stop pinging your location',
        'Are you sure you want to stop pinging?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Stop Pinging',
            onPress: () => {
              setIsPinging(false);
              Alert.alert(
                'Pinging Stopped',
                'Your location is no longer being shared with other users.'
              );
            },
            style: 'destructive',
          },
        ]
      );
    } else {
      // Start pinging
      Alert.alert(
        'Ping your location to others',
        `Are you sure?\n\nThis will ping your location to other users even if you have not matched yet. Pings will update every ${pingInterval < 60 ? `${pingInterval} seconds` : pingInterval < 3600 ? `${Math.floor(pingInterval / 60)} minutes` : `${Math.floor(pingInterval / 3600)} hour`}.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Ping Location',
            onPress: () => {
              setIsPinging(true);
              Alert.alert(
                'Location Pinged!',
                `Your location is now visible to other users. Your ping will update automatically every ${pingInterval < 60 ? `${pingInterval} seconds` : pingInterval < 3600 ? `${Math.floor(pingInterval / 60)} minutes` : `${Math.floor(pingInterval / 3600)} hour`}.`
              );
            },
          },
        ]
      );
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
          {mockUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.matchCircleContainer}
              onPress={() => handleCirclePress(user)}
            >
              <View style={styles.matchCircle}>
                <Image 
                  source={{ uri: user.photos[0] }} 
                  style={styles.matchImage}
                />
              </View>
              <Text style={styles.matchName}>{user.name}</Text>
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
        {mockUsers.map((user) => (
          <Marker
            key={user.id}
            coordinate={user.coordinate}
            onPress={() => handleMarkerPress(user)}
          >
            <View style={styles.markerContainer}>
              <View style={styles.markerImageContainer}>
                <Image 
                  source={{ uri: user.photos[0] }} 
                  style={styles.markerImage}
                />
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
            <Image 
              source={{ uri: selectedUser.photos[currentPhotoIndex] }} 
              style={styles.profileImage} 
            />
            
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
                  <View style={styles.festivalContainer}>
                    <Text style={styles.festivalName}>{selectedUser.festival}</Text>
                  </View>

                  <Text style={styles.profileBio}>
                    <Text style={styles.bioLabel}>Ticket: </Text>{selectedUser.ticketType}{'\n'}
                    <Text style={styles.bioLabel}>Accommodation: </Text>{selectedUser.accommodationType}{'\n'}
                    <Text style={styles.bioText}>- Looking for afterparty buddy</Text>
                  </Text>
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

      {/* Ping Controls Collapse Button - shown when pinging and not collapsed */}
      {isPinging && !isPingControlsCollapsed && (
        <TouchableOpacity 
          style={styles.collapseButton}
          onPress={() => setIsPingControlsCollapsed(true)}
        >
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Ping Target Toggle - shown when pinging and not collapsed */}
      {isPinging && !isPingControlsCollapsed && (
        <View style={styles.pingTargetContainer}>
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
              ]}>Matches</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Ping Interval Slider - shown when pinging and not collapsed */}
      {isPinging && !isPingControlsCollapsed && (
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

      {/* Bring Up Button - shown when pinging and collapsed */}
      {isPinging && isPingControlsCollapsed && (
        <TouchableOpacity 
          style={styles.bringUpButton}
          onPress={() => setIsPingControlsCollapsed(false)}
        >
          <MaterialIcons name="keyboard-arrow-up" size={20} color="#FFFFFF" />
        </TouchableOpacity>
            )}

      {/* Ping Location Button - Old Style */}
      <View style={styles.pingLocationButton}>
        {/* Expanding circles */}
        {isPinging && circleAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.rippleCircle,
              {
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
              transform: [{ scale: pulseAnim }],
              backgroundColor: '#333333', // Brighter gray when pinging
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.pingLocationButtonTouch}
            onPress={handlePingLocation}
          >
            <Icon 
              name="placeholder-18" 
              width={22} 
              height={22} 
              color={isPinging ? (pingTarget === 'All' ? '#4CAF50' : '#ff4444') : '#FFFFFF'} 
              strokeWidth={3}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 21,
    left: 155,
    width: 152,
    zIndex: 10000,
    overflow: 'hidden',
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
  profileBio: {
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
    top: -30, // Center circle around button (60px button, so -30 to center)
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    backgroundColor: 'transparent',
    zIndex: 5,
    pointerEvents: 'none', // Allow touches to pass through to button below
  },
  // Ping Location Button - Old Style
  pingLocationButton: {
    position: 'absolute',
    bottom: 90,
    left: '50%',
    marginLeft: -27.5, // Half of width to center (55px)
    width: 55,
    height: 55,
    borderRadius: 27.5,
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
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#333333',
    borderWidth: 0.5,
    borderColor: '#666666',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Higher than ripple circles
  },
  pingLocationButtonTouch: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
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
    bottom: 192, // Above the interval slider (moved up 1px)
    left: '50%',
    marginLeft: -65, // Half of width to center (130px wide)
    width: 130,
    backgroundColor: 'transparent',
    padding: 6,
    zIndex: 12000,
  },

  pingToggleContainer: {
    alignItems: 'center',
  },
  pingToggleTrack: {
    width: 120,
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
    left: 42, // Move red thumb even further to the right
    width: 76, // Adjusted width to fit in moved position
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
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    zIndex: 3,
  },
  pingToggleLabelLeft: {
    left: 14, // Adjusted for shorter green thumb in narrower track
  },
  pingToggleLabelRight: {
    right: 12, // Moved even further right
  },
  pingToggleLabelActive: {
    color: '#FFFFFF',
  },
  // Ping slider styles
  pingSliderContainer: {
    position: 'absolute',
    bottom: 151, // Above the ping button (moved down 1px)
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
    justifyContent: 'space-between',
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

});

export default MapScreen; 