import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { usePremium } from '../context/PremiumContext';
import PremiumPopup from '../components/PremiumPopup';

const { width } = Dimensions.get('window');

type UserCountResultsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'UserCountResults'>;

interface UserCountResultsScreenProps {
  route: {
    params: {
      userCountResults: {
        totalUsers: number;
        visibleUsers: number;
        totalUserPhotos: string[];
        visibleUserPhotos: string[];
      };
    };
  };
}

const UserCountResultsScreen: React.FC<UserCountResultsScreenProps> = ({ route }) => {
  const navigation = useNavigation<UserCountResultsScreenNavigationProp>();
  const { userCountResults } = route.params;
  const [isSearching, setIsSearching] = useState(false);
  const { isPremium } = usePremium();
  
  // Profile popup state
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{
    name: string;
    photo: string;
    index: number;
    type: 'visible' | 'ghost';
  } | null>(null);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleUpdateSearch = () => {
    setIsSearching(true);
    // Simulate search delay and navigate back to map
    setTimeout(() => {
      setIsSearching(false);
      navigation.goBack();
      // The map screen will handle showing new results
    }, 2000);
  };

  const handleProfileTap = (profile: { name: string; photo: string; index: number; type: 'visible' | 'ghost' }) => {
    setSelectedProfile(profile);
    setShowProfilePopup(true);
  };

  const handleLike = () => {
    setShowProfilePopup(false);
    Alert.alert('Liked!', `You liked ${selectedProfile?.name}!`);
  };

  const handleMessage = () => {
    if (!isPremium) {
      setShowProfilePopup(false);
      setShowPremiumPopup(true);
    } else {
      setShowProfilePopup(false);
      Alert.alert('Message', `Opening chat with ${selectedProfile?.name}...`);
    }
  };

  const handleCloseProfilePopup = () => {
    setShowProfilePopup(false);
    setSelectedProfile(null);
  };

  const handlePremiumUpgrade = () => {
    setShowPremiumPopup(false);
    // Here you would typically handle the premium upgrade
    Alert.alert('Premium Upgrade', 'Premium upgrade functionality would be implemented here.');
  };

  const renderProfileRow = (title: string, count: number, photos: string[], color: string, type: 'visible' | 'ghost') => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={[styles.countBadge, { backgroundColor: color }]}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.profileRow}
      >
        {photos.map((photo, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.profileItem}
            onPress={() => handleProfileTap({
              name: `User ${index + 1}`,
              photo,
              index,
              type
            })}
          >
            <View style={[styles.profileImageContainer, { borderColor: color }]}>
              {photo && photo.startsWith('http') ? (
                <Image 
                  source={{ uri: photo }} 
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <MaterialIcons name="person" size={24} color={color === '#FF4444' ? '#FFFFFF' : color} />
                </View>
              )}
            </View>
            <Text style={styles.profileName}>User {index + 1}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <LinearGradient
      colors={['#1A1A1A', '#2D2D2D', '#1A1A1A']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nearby Users</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialIcons name="location-on" size={32} color="#ff4444" />
            <Text style={styles.summaryTitle}>Users Found</Text>
          </View>
          <Text style={styles.summarySubtitle}>Within 10km radius</Text>
          
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userCountResults.totalUsers}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userCountResults.visibleUsers}</Text>
              <Text style={styles.statLabel}>Visible on Map</Text>
            </View>
          </View>
        </View>

        {/* Profile Rows */}
        {renderProfileRow(
          'Visible on Map',
          userCountResults.visibleUsers,
          userCountResults.visibleUserPhotos,
          '#FF4444',
          'visible'
        )}
        
        {renderProfileRow(
          'Users in ghost mode',
          userCountResults.totalUsers - userCountResults.visibleUsers,
          userCountResults.totalUserPhotos.slice(userCountResults.visibleUsers).length > 0 
            ? userCountResults.totalUserPhotos.slice(userCountResults.visibleUsers)
            : Array.from({ length: Math.min(8, userCountResults.totalUsers - userCountResults.visibleUsers) }, (_, i) => 
                `https://picsum.photos/100/100?random=${i + 200}`
              ),
          '#999999',
          'ghost'
        )}

        {/* Ghost Mode Explanation */}
        <View style={styles.ghostModeExplanation}>
          <Text style={styles.ghostModeText}>
            Users in ghost mode are users that don't want to share their location to other users, it is still possible to message them or like their profile!
          </Text>
        </View>

        {/* Search Again Button */}
        <View style={styles.searchAgainContainer}>
          <Text style={styles.searchAgainLabel}>
            {isSearching ? 'Searching...' : 'Search again'}
          </Text>
          <TouchableOpacity 
            style={styles.searchAgainButton} 
            onPress={handleUpdateSearch}
            disabled={isSearching}
          >
            <LinearGradient
              colors={['#ff4444', '#ff6666']}
              style={styles.searchAgainGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons 
                name="refresh" 
                size={28} 
                color="#FFFFFF" 
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Profile Action Popup */}
      <Modal
        visible={showProfilePopup}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseProfilePopup}
      >
        <View style={styles.popupOverlay}>
          <TouchableOpacity style={styles.popupBackdrop} onPress={handleCloseProfilePopup} activeOpacity={1} />
          
          <View style={styles.profilePopupContainer}>
            <View style={styles.profilePopupGradient}>
              {/* Profile Info */}
              <View style={styles.profilePopupHeader}>
                <View style={styles.profilePopupImageContainer}>
                  <View style={styles.profilePopupImagePlaceholder}>
                    <MaterialIcons name="person" size={40} color="#FFFFFF" />
                  </View>
                </View>
                <Text style={styles.profilePopupName}>{selectedProfile?.name}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.profilePopupActions}>
                <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
                  <View style={styles.likeButtonSolid}>
                    <MaterialIcons name="favorite" size={28} color="#FFFFFF" />
                    <Text style={styles.likeButtonText}>Like</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.messageButton} 
                  onPress={handleMessage}
                >
                  <LinearGradient
                    colors={['#FF4444', '#FF6666']}
                    style={styles.messageGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialIcons name="chat" size={28} color="#FFFFFF" />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

                             {/* Premium Only Text */}
               {!isPremium && (
                 <View style={styles.premiumOnlyContainer}>
                   <Text style={styles.premiumOnlyText}>Premium</Text>
                 </View>
               )}

              {/* Close Button */}
              <TouchableOpacity style={styles.profilePopupCloseButton} onPress={handleCloseProfilePopup}>
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Premium Popup */}
      <PremiumPopup
        isVisible={showPremiumPopup}
        onClose={() => setShowPremiumPopup(false)}
        onUpgrade={handlePremiumUpgrade}
        title="Unlock Messaging"
        message="Upgrade to premium to message any user!"
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 2,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  summarySubtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 13,
    color: '#999',
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileRow: {
    paddingRight: 20,
  },
  profileItem: {
    alignItems: 'center',
    marginRight: 10,
    width: 80,
  },
  profileImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  profileImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profileName: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  searchAgainContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: -5,
    flexDirection: 'column',
  },
  searchAgainButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    marginBottom: 8,
    marginTop: 8,
  },
  searchAgainGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchAgainLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginTop: 1,
  },
  ghostModeExplanation: {
    backgroundColor: 'rgba(102, 102, 102, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    marginHorizontal: 4,
    marginTop: -13,
  },
  ghostModeText: {
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 18,
    textAlign: 'center',
  },
  // Profile Popup Styles
  popupOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  popupBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  profilePopupContainer: {
    width: width * 0.9,
    maxWidth: 380,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  profilePopupGradient: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(45, 45, 45, 0.95)',
    backdropFilter: 'blur(10px)',
  },
  profilePopupHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePopupImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  profilePopupImagePlaceholder: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePopupName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profilePopupType: {
    fontSize: 14,
    color: '#999',
  },
  profilePopupActions: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  likeButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  likeButtonSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    backgroundColor: '#333333',
  },
  likeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  messageButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  messageGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    position: 'relative',
  },
  messageButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  premiumOnlyContainer: {
    alignItems: 'center',
    marginTop: 6.5,
  },
  premiumOnlyText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profilePopupCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UserCountResultsScreen;
