import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  ScrollView,
  Animated,
  Alert,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList, Message, User } from '../types';
import { formatMessageTime } from '../utils/helpers';
import { ChatService } from '../services/chatService';
import { DeviceAuthService } from '../services/deviceAuthService';
import { MatchingService } from '../services/matchingService';

const { width, height } = Dimensions.get('window');

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatUser, setChatUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  
  // Profile modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const [floatingBarTextIndex, setFloatingBarTextIndex] = useState(0); // Start with distance

  // Floating bar texts for profile overlay
  const floatingBarTexts = [
    { icon: "location-on" as const, text: `${chatUser?.distance || 0} km away` },
    { icon: "location-on" as const, text: `Show on Map ?` }
  ];

  // Handle floating bar press for profile overlay
  const handleFloatingBarPress = () => {
    if (floatingBarTextIndex === 0) {
      // First tap: show "Show on Map ?" text
      setFloatingBarTextIndex(1);
    } else {
      // Second tap: close modal and navigate to Map tab
      closeProfileModal();
      setTimeout(() => {
        navigation.navigate('Main', { screen: 'Map' });
      }, 300); // Wait for modal close animation
    }
  };

  // Reset text index when chat user changes
  useEffect(() => {
    if (chatUser) {
      setFloatingBarTextIndex(0); // Reset to distance text
    }
  }, [chatUser]);

  const { matchId, matchName, matchPhoto, openKeyboard } = route.params;

  // Load chat data from Supabase
  useEffect(() => {
    const loadChatData = async () => {
      try {
        setIsLoading(true);
        
        // Get current user ID
        const deviceUserId = await DeviceAuthService.getDeviceUserId();
        setCurrentUserId(deviceUserId);
        
        // Load messages (same for both regular and direct messages)
        const messagesResult = await ChatService.getMessages(matchId);
        if (messagesResult.error) {
          console.log('No existing messages, starting fresh');
          setMessages([]);
        } else {
          setMessages(messagesResult.messages);
        }
        
        // Create chat partner user object
        const chatPartnerUser: User = {
          id: matchId, // Using matchId as user ID for now
          name: matchName,
          age: 25, // Default age - you might want to get this from the match data
          festival: 'Unknown Festival', // Default - you might want to get this from the match data
          ticketType: 'Unknown', // Default - you might want to get this from the match data
          accommodationType: 'Unknown', // Default - you might want to get this from the match data
          photos: [matchPhoto], // Use the photo from route params
          interests: [], // Default empty array
          lastSeen: new Date().toISOString(),
        };
        setChatUser(chatPartnerUser);
        
      } catch (error) {
        console.error('Error loading chat data:', error);
        Alert.alert('Error', 'Failed to load chat data');
      } finally {
        setIsLoading(false);
      }
    };

    loadChatData();
  }, [matchId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Focus text input when component mounts to show keyboard
  useEffect(() => {
    if (!isLoading && chatUser && openKeyboard) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
  }, [isLoading, chatUser, openKeyboard]);

  // Profile modal handlers
  const openProfileModal = () => {
    // Dismiss keyboard when opening profile
    Keyboard.dismiss();
    
    setShowProfileModal(true);
    setCurrentPhotoIndex(0);
    modalOpacity.setValue(0);
    modalScale.setValue(0.8);
    
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeProfileModal = () => {
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowProfileModal(false);
    });
  };

  const nextPhoto = () => {
    if (currentPhotoIndex < (chatUser?.photos?.length || 0) - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const previousPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  const onSwipeGesture = (event: any) => {
    const { translationY, state } = event.nativeEvent;
    if (state === State.END && translationY > 100) {
      closeProfileModal();
    }
  };

  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);

  const handleRemoveConnection = async () => {
    console.log('Long press detected! handleRemoveConnection called');
    if (chatUser) {
      setDeleteTargetUser(chatUser);
      setShowDeletePopup(true);
    }
  };

  const confirmDeleteConnection = async () => {
    if (!deleteTargetUser) return;
    
    try {
      const deviceUserId = await DeviceAuthService.getDeviceUserId();
      const otherUserId = deleteTargetUser.id;
      
      const result = await MatchingService.removeConnection(deviceUserId, otherUserId);
      
      if (result.success) {
        Alert.alert('Connection Removed', 'The connection has been removed successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
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
    console.log('Press in detected');
    const timer = setTimeout(() => {
      console.log('Long press timer triggered!');
      handleRemoveConnection();
    }, 500);
    setLongPressTimer(timer);
  };

  const handlePressOut = () => {
    console.log('Press out detected');
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleProfilePress = () => {
    // Only open profile modal if no delete popup is active
    if (!showDeletePopup) {
      openProfileModal();
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim()) {
      try {
        const deviceUserId = await DeviceAuthService.getDeviceUserId();
        
        // Send message (same for both regular and direct messages)
        const sendResult = await ChatService.sendMessage(matchId, deviceUserId, newMessage);
        
        if (sendResult.error) {
          Alert.alert('Error', 'Failed to send message');
          return;
        }
        
        setNewMessage('');
        
        // Reload messages after sending
        const updatedMessagesResult = await ChatService.getMessages(matchId);
        
        if (updatedMessagesResult.error) {
          setMessages([]);
        } else {
          setMessages(updatedMessagesResult.messages);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to send message');
      }
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === currentUserId;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.theirMessageText
          ]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading || !chatUser) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.centerSection}
          onPress={handleProfilePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
        >
          <View style={styles.nameContainer}>
            <View style={styles.profileSection}>
              <View style={styles.profileCircle}>
                <Image
                  source={{
                    uri: matchPhoto || chatUser.photos[0]
                  }}
                  style={styles.profileImage}
                />
              </View>
            </View>
            <Text style={styles.matchNameText}>{matchName}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.mapButton} 
          onPress={() => navigation.navigate('Main', { screen: 'Map' })}
          activeOpacity={0.7}
        >
          <MaterialIcons name="place" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesList}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          ref={textInputRef}
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#AAAAAA"
          multiline
          maxLength={500}
          keyboardAppearance="dark"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            newMessage.trim() ? styles.sendButtonActive : styles.sendButtonInactive
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>

    {/* Profile Overlay */}
    {showProfileModal && chatUser && (
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
                  {chatUser.photos && chatUser.photos.length > 0 && chatUser.photos[currentPhotoIndex] ? (
                    <Image 
                      source={{ uri: chatUser.photos[currentPhotoIndex] }} 
                      style={styles.cardImage}
                    />
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
                onPress={previousPhoto}
                activeOpacity={0.8}
                delayPressIn={50}
                delayLongPress={200}
                onLongPress={() => {}} // Ignore long press
              />
              <TouchableOpacity 
                style={styles.rightTapArea} 
                onPress={nextPhoto}
                activeOpacity={0.8}
                delayPressIn={50}
                delayLongPress={200}
                onLongPress={() => {}} // Ignore long press
              />
              
              {/* Bottom tap areas for photo navigation */}
              <TouchableOpacity 
                style={styles.bottomLeftTapArea} 
                onPress={previousPhoto}
                activeOpacity={0.8}
                delayPressIn={50}
                delayLongPress={200}
                onLongPress={() => {}} // Ignore long press
              />
              <TouchableOpacity 
                style={styles.bottomRightTapArea} 
                onPress={nextPhoto}
                activeOpacity={0.8}
                delayPressIn={50}
                delayLongPress={200}
                onLongPress={() => {}} // Ignore long press
              />
              
              {/* Photo indicator dots */}
              {chatUser.photos && chatUser.photos.length > 0 && (
                <View style={styles.photoIndicator}>
                  {chatUser.photos.map((_, index) => (
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
                          {chatUser.name}
                        </Text>
                        <Text style={styles.ageSeparator}>, </Text>
                        <Text style={styles.cardAge}>
                          {chatUser.age}
                        </Text>
                      </View>

                      {(() => {
                        const bioText = chatUser.interests?.join(', ') || '';
                        if (bioText) {
                          return (
                            <Text style={styles.bioSection}>
                              -  {bioText}
                            </Text>
                          );
                        }
                        return null;
                      })()}

                      <View style={styles.festivalContainer}>
                        {chatUser.festival.split(',').map((fest, index) => {
                          const festivalName = fest.trim();
                          
                          // Parse ticket types
                          const ticketTypes = chatUser.ticketType ? chatUser.ticketType.split(',').reduce((acc, item) => {
                            const match = item.match(/(.+?):\s*(.+)/);
                            if (match) {
                              acc[match[1].trim()] = match[2].trim();
                            }
                            return acc;
                          }, {} as { [key: string]: string }) : {};
                          
                          // Parse accommodations
                          const accommodations = chatUser.accommodationType ? chatUser.accommodationType.split(',').reduce((acc, item) => {
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

  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  messagesList: {
    paddingVertical: 10,
  },
  messageContainer: {
    marginVertical: 2,
    marginHorizontal: 15,
    flexDirection: 'row',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: '#333333',
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: '#333333',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirMessageTime: {
    color: '#CCCCCC',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#000000',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#333333',
    color: '#FFFFFF',
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#ff6b6b',
  },
  sendButtonInactive: {
    backgroundColor: '#333333',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Top bar styles
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },

  profileSection: {
    alignItems: 'center',
    marginRight: 10,
  },
  profileCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 50,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  matchNameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginLeft: -7,
    marginTop: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  // Profile modal styles
  profileModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    width: '90%',
    height: '80%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
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
    bottom: 100,
    width: '50%',
    zIndex: 5,
  },
  rightTapArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 100,
    width: '50%',
    zIndex: 5,
  },
  photoIndicator: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 6,
  },
  photoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  photoDotActive: {
    backgroundColor: '#FFFFFF',
  },
  distanceIndicator: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 6,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 4,
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  timeText: {
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 2,
  },
  profileCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  profileCardInfoScroll: {
    flex: 1,
  },
  nameAgeContainer: {
    marginBottom: 15,
  },
  profileCardName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  festivalContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    flexDirection: 'column',
  },
  festivalRow: {
    width: '100%',
    marginBottom: 5,
  },
  festivalName: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
  festivalDetails: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  festivalDetailText: {
    fontSize: 12,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  profileCardBio: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  bioLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4444',
    marginTop: 3,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  bioText: {
    color: '#FFFFFF',
  },
  // Profile overlay styles (same as MatchesScreen)
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
    top: 145,
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

export default ChatScreen; 