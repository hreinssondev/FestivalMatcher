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
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList, Message, User } from '../types';
import { formatMessageTime } from '../utils/helpers';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

// Mock user data for the chat partner
const mockChatUser: User = {
  id: 'chat-user-1',
  name: 'Sarah',
  age: 24,
  festival: 'Lowlands 2024',
  ticketType: '3-Day Pass',
  accommodationType: 'Hotel',
  photos: [
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
  ],
  interests: ['Music', 'Dancing', 'Photography'],
  lastSeen: '2 km away - 5 minutes ago',
  distance: 2,
};

// Mock messages data
const mockMessages: Message[] = [
  {
    id: '1',
    text: 'Hey! I loved your profile. Want to grab coffee sometime?',
    senderId: 'them',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    isRead: true,
  },
  {
    id: '2',
    text: 'Hi! Thanks for the match. I\'d love to grab coffee!',
    senderId: 'me',
    timestamp: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
    isRead: true,
  },
  {
    id: '3',
    text: 'Great! How about tomorrow at 3 PM?',
    senderId: 'them',
    timestamp: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
    isRead: true,
  },
  {
    id: '4',
    text: 'That works for me! Where would you like to meet?',
    senderId: 'me',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    isRead: false,
  },
  {
    id: '5',
    text: 'How about Blue Bottle Coffee in Hayes Valley?',
    senderId: 'them',
    timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    isRead: false,
  },
];

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);
  
  // Profile modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;

  const { matchId, matchName, matchPhoto } = route.params;

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Profile modal handlers
  const openProfileModal = () => {
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
    if (currentPhotoIndex < mockChatUser.photos.length - 1) {
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

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        text: newMessage.trim(),
        senderId: 'me',
        timestamp: new Date(),
        isRead: false,
      };
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === 'me';
    
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
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.theirMessageTime
          ]}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.profileSection} onPress={openProfileModal}>
          <View style={styles.profileCircle}>
            <Image
              source={{
                uri: matchPhoto || mockChatUser.photos[0]
              }}
              style={styles.profileImage}
            />
          </View>
          <Text style={styles.matchNameText}>{matchName}</Text>
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

          <View style={styles.profileCard}>
            <Image 
              source={{ uri: mockChatUser.photos[currentPhotoIndex] }} 
              style={styles.profileCardImage} 
            />
            
            {/* Photo Navigation Areas */}
            <TouchableOpacity style={styles.leftTapArea} onPress={previousPhoto} />
            <TouchableOpacity style={styles.rightTapArea} onPress={nextPhoto} />
            
            {/* Photo Dots */}
            <View style={styles.photoIndicator}>
              {mockChatUser.photos.map((_, i) => (
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
                <Text style={styles.distanceText}>{mockChatUser.distance} km away</Text>
              </View>
              <Text style={styles.timeText}>5 minutes ago</Text>
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
                    {mockChatUser.name}, {mockChatUser.age}
                  </Text>
                  
                  <View style={styles.festivalContainer}>
                    <Text style={styles.festivalName}>{mockChatUser.festival}</Text>
                  </View>
                </View>

                <Text style={styles.profileCardBio}>
                  <Text style={styles.bioLabel}>Ticket: </Text>
                  <Text style={styles.bioText}>{mockChatUser.ticketType}</Text>
                  {'\n'}
                  <Text style={styles.bioLabel}>Accommodation: </Text>
                  <Text style={styles.bioText}>{mockChatUser.accommodationType}</Text>
                  {'\n'}
                  <Text style={styles.bioText}>- Love music festivals</Text>
                  {'\n'}
                  <Text style={styles.bioText}>- Looking for festival buddies</Text>
                </Text>
              </ScrollView>
            </LinearGradient>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </Modal>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  messagesList: {
    paddingVertical: 10,
  },
  messageContainer: {
    marginBottom: 10,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
    paddingRight: 15,
  },
  theirMessageContainer: {
    alignItems: 'flex-start',
    paddingLeft: 15,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myMessageBubble: {
    backgroundColor: '#ff6b6b',
    borderBottomRightRadius: 5,
  },
  theirMessageBubble: {
    backgroundColor: '#1A1A1A',
    borderBottomLeftRadius: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 5,
  },
  myMessageText: {
    color: '#fff',
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
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ff6b6b',
    marginRight: 12,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  matchNameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
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
  },
  festivalName: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
  profileCardBio: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  bioLabel: {
    fontWeight: '600',
    color: '#CCCCCC',
  },
  bioText: {
    color: '#FFFFFF',
  },
});

export default ChatScreen; 