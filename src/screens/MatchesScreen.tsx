import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList, Match } from '../types';
import { formatTime } from '../utils/helpers';
import { useProfile } from '../context/ProfileContext';

type MatchesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

// Mock matches data - same order as MapScreen (most recent first)
const createMockMatches = (profileData: any): Match[] => [
  {
    id: '2',
    user: {
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
      interests: ['Music', 'Technology', 'Festivals'],
      lastSeen: '2 km away - 8 minutes ago',
    },
    matchedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    lastMessage: {
      id: '2',
      text: 'Thanks for the match! What kind of music do you like?',
      senderId: 'me',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      isRead: true,
    },
  },
  {
    id: '3',
    user: {
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
      interests: ['Art', 'Yoga', 'Festivals'],
      lastSeen: '3 km away - 12 minutes ago',
    },
    matchedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    lastMessage: {
      id: '3',
      text: 'Would love to see your artwork sometime!',
      senderId: '3',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      isRead: false,
    },
  },
  {
    id: '4',
    user: {
      id: '4',
      name: 'Alex',
      age: 26,
      festival: profileData.festival,
      ticketType: profileData.ticketType,
      accommodationType: profileData.accommodationType,
      photos: [
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
        'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400'
      ],
      interests: ['Adventure', 'Food', 'Travel', 'Fitness'],
      lastSeen: '4 km away - 15 minutes ago',
    },
    matchedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    lastMessage: {
      id: '4',
      text: 'Love your adventure spirit! Want to go hiking?',
      senderId: '4',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      isRead: true,
    },
  },
  {
    id: '5',
    user: {
      id: '5',
      name: 'Sophia',
      age: 24,
      festival: profileData.festival,
      ticketType: profileData.ticketType,
      accommodationType: profileData.accommodationType,
      photos: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
        'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400'
      ],
      interests: ['Music', 'Art', 'Poetry', 'Nature'],
      lastSeen: '5 km away - 20 minutes ago',
    },
    matchedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    lastMessage: {
      id: '5',
      text: 'Your poetry is beautiful! Would love to hear more.',
      senderId: 'me',
      timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
      isRead: false,
    },
  },
  {
    id: '6',
    user: {
      id: '6',
      name: 'David',
      age: 27,
      festival: profileData.festival,
      ticketType: profileData.ticketType,
      accommodationType: profileData.accommodationType,
      photos: [
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'
      ],
      interests: ['Photography', 'Coffee', 'Books', 'Travel'],
      lastSeen: '6 km away - 25 minutes ago',
    },
    matchedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    lastMessage: {
      id: '6',
      text: 'Great taste in coffee! Any recommendations?',
      senderId: '6',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      isRead: true,
    },
  },
];

const { width, height } = Dimensions.get('window');

const MatchesScreen: React.FC = () => {
  const navigation = useNavigation<MatchesScreenNavigationProp>();
  const { profileData } = useProfile();
  const mockMatches = createMockMatches(profileData);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [toggleValue, setToggleValue] = useState(0); // 0: All, 1: DM, 2: Matches
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;

  const handleMatchPress = (match: Match) => {
    navigation.navigate('Chat', {
      matchId: match.id,
      matchName: match.user.name,
      matchPhoto: match.user.photos[0],
    });
  };

  const handleCirclePress = (match: Match) => {
    // Show profile popup instead of navigating to chat
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
  };

  const closeProfileModal = () => {
    // Animate out slower
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 600, // Slower exit animation (600ms instead of default)
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 0.8,
        duration: 600,
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

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchItem}
      onPress={() => handleMatchPress(item)}
    >
      <Image source={{ uri: item.user.photos[0] }} style={styles.matchItemImage} />
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
          {mockMatches.map((match) => (
            <TouchableOpacity
              key={match.id}
              style={styles.matchCircleContainer}
              onPress={() => handleCirclePress(match)}
            >
              <View style={styles.matchCircle}>
                <Image 
                  source={{ uri: match.user.photos[0] }} 
                  style={styles.matchImage}
                />
              </View>
              <Text style={styles.matchName}>{match.user.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Toggle Buttons */}
      <View style={styles.toggleContainer}>
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
      
      {mockMatches.length > 0 ? (
        <FlatList
          data={mockMatches}
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

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={closeProfileModal}
      >
        <PanGestureHandler
          onGestureEvent={onSwipeGesture}
          onHandlerStateChange={onSwipeGesture}
          activeOffsetY={10}
          failOffsetX={[-100, 100]}
        >
          <Animated.View style={[
            styles.profileModalContainer,
            {
              opacity: modalOpacity,
              transform: [{ scale: modalScale }],
            }
          ]}>
            {/* Close Button */}
            <TouchableOpacity style={styles.profileCloseButton} onPress={closeProfileModal}>
              <MaterialIcons name="close" size={30} color="#FFFFFF" />
            </TouchableOpacity>

            {selectedMatch && (
              <View style={styles.profileCard}>
              <Image 
                source={{ uri: selectedMatch.user.photos[currentPhotoIndex] }} 
                style={styles.profileCardImage} 
              />
              
              {/* Photo Navigation Areas */}
              <TouchableOpacity style={styles.leftTapArea} onPress={previousPhoto} />
              <TouchableOpacity style={styles.rightTapArea} onPress={nextPhoto} />
              
              {/* Photo Dots */}
              <View style={styles.photoIndicator}>
                {selectedMatch.user.photos.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.photoDot,
                      i === currentPhotoIndex ? styles.photoDotActive : null,
                    ]}
                  />
                ))}
              </View>

              {/* Distance Indicator */}
              <View style={styles.distanceIndicator}>
                <View style={styles.distanceRow}>
                  <MaterialIcons name="location-on" size={20} color="#FFFFFF" style={styles.locationIcon} />
                  <Text style={styles.distanceText}>1 km away</Text>
                </View>
                <Text style={styles.timeText}>6 minutes ago</Text>
              </View>
              
              {/* Profile Info Overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
                style={styles.profileCardOverlay}
              >
                <ScrollView
                  style={styles.profileCardInfoScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.nameAgeContainer}>
                    <Text style={styles.profileCardName}>
                      {selectedMatch.user.name}, {selectedMatch.user.age}
                    </Text>
                    
                    <View style={styles.festivalContainer}>
                      <Text style={styles.festivalName}>{selectedMatch.user.festival}</Text>
                    </View>
                  </View>

                  <Text style={styles.profileCardBio}>
                    <Text style={styles.bioLabel}>Ticket: </Text>
                    <Text style={styles.bioText}>{selectedMatch.user.ticketType}</Text>
                    {'\n'}
                    <Text style={styles.bioLabel}>Accommodation: </Text>
                    <Text style={styles.bioText}>{selectedMatch.user.accommodationType}</Text>
                    {'\n'}
                    <Text style={styles.bioText}>- Looking for afterparty buddy</Text>
                  </Text>
                </ScrollView>
              </LinearGradient>
            </View>
                      )}
          </Animated.View>
        </PanGestureHandler>
      </Modal>
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
  // Profile Modal Styles
  profileModalContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    width: width * 0.9,
    height: height * 0.75,
    borderRadius: 20,
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
  festivalContainer: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  festivalName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  profileCardBio: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
  },
  bioLabel: {
    fontWeight: '600',
    color: '#fff',
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
  toggleButtonText: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default MatchesScreen;