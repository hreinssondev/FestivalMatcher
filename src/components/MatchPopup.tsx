import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { User } from '../types';

const { width, height } = Dimensions.get('window');

interface MatchPopupProps {
  isVisible: boolean;
  matchedUser: User;
  onClose: () => void;
  onSendMessage: () => void;
}

const MatchPopup: React.FC<MatchPopupProps> = ({
  isVisible,
  matchedUser,
  onClose,
  onSendMessage,
}) => {
  console.log('MatchPopup: Component rendered with props:', { isVisible, matchedUserName: matchedUser?.name });
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const heartScaleAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(50)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Start animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Heart animation with delay
      setTimeout(() => {
        Animated.sequence([
          Animated.spring(heartScaleAnim, {
            toValue: 1.2,
            tension: 200,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.spring(heartScaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
        ]).start();
      }, 200);

      // Text slide animation
      setTimeout(() => {
        Animated.spring(textSlideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, 400);

      // Confetti animation
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(confettiAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(confettiAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start();
      }, 600);
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      heartScaleAnim.setValue(0);
      textSlideAnim.setValue(50);
      confettiAnim.setValue(0);
    }
  }, [isVisible]);

  console.log('MatchPopup: isVisible =', isVisible, 'matchedUser =', matchedUser?.name);
  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'transparent', 'transparent']}
          style={styles.gradient}
        >
          {/* Confetti Effect */}
          <Animated.View
            style={[
              styles.confettiContainer,
              {
                opacity: confettiAnim,
              },
            ]}
          >
            <MaterialIcons name="celebration" size={60} color="#FFD700" style={styles.confetti1} />
            <MaterialIcons name="celebration" size={40} color="#FF69B4" style={styles.confetti2} />
            <MaterialIcons name="celebration" size={50} color="#00CED1" style={styles.confetti3} />
          </Animated.View>

          {/* Match Text */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                transform: [{ translateY: textSlideAnim }],
              },
            ]}
          >
            <Text style={styles.matchTitle}>It's a Match!</Text>
          </Animated.View>

          {/* User Photos */}
          <View style={styles.photosContainer}>
            <View style={styles.photoContainer}>
              {matchedUser.photos && matchedUser.photos.length > 0 ? (
                <Image
                  source={{ uri: matchedUser.photos[0] }}
                  style={styles.userPhoto}
                />
              ) : (
                <View style={styles.noPhotoContainer}>
                  <MaterialIcons name="person" size={40} color="#fff" />
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.keepSwipingButton} onPress={onClose}>
              <MaterialIcons name="check" size={24} color="#fff" />
              <Text style={styles.keepSwipingText}>Keep Swiping</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sendMessageButton}
              onPress={onSendMessage}
            >
              <MaterialIcons name="chat" size={24} color="#fff" />
              <Text style={styles.sendMessageText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: width * 0.85,
    maxWidth: 350,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 50,
  },
  gradient: {
    padding: 30,
    alignItems: 'center',
  },
  confettiContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  confetti1: {
    position: 'absolute',
    top: -30,
    left: -20,
  },
  confetti2: {
    position: 'absolute',
    top: -20,
    right: -15,
  },
  confetti3: {
    position: 'absolute',
    top: -40,
    left: 20,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 2,
  },
  matchTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  photosContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 58,
    marginTop: 2,
  },
  photoContainer: {
    width: 115,
    height: 115,
    borderRadius: 57.5,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#888888',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  userPhoto: {
    width: '100%',
    height: '100%',
  },
  noPhotoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  sendMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 28,
    backgroundColor: 'rgba(200, 200, 200, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.6)',
  },
  sendMessageText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
    textAlign: 'center',
  },
  keepSwipingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  keepSwipingText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginLeft: 8,
  },
});

export default MatchPopup;
