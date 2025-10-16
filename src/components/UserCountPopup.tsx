import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface UserCountPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onPurchase: () => void;
  userCountResults?: {
    totalUsers: number;
    visibleUsers: number;
    totalUserPhotos: string[];
    visibleUserPhotos: string[];
  } | null;
  onUpdateSearch?: () => void;
  isSearching?: boolean;
}

const UserCountPopup: React.FC<UserCountPopupProps> = ({
  isVisible,
  onClose,
  onPurchase,
  userCountResults,
  onUpdateSearch,
  isSearching = false,
}) => {
  const features = [
    { icon: 'people', text: 'See nearby users within 10km' },
    { icon: 'location-on', text: 'Includes users with location off' },
    { icon: 'refresh', text: 'Unlimited usage - check as often as you want' },
    { icon: 'star', text: 'One-time payment - no recurring fees' },
  ];

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        
        <View style={styles.container}>
          <LinearGradient
            colors={['#4CAF50', '#66BB6A', '#4CAF50']}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {!userCountResults ? (
              <>
                {/* Purchase Flow */}
                <View style={styles.header}>
                  <MaterialIcons name="people" size={32} color="#FFFFFF" />
                  <Text style={styles.title} numberOfLines={1}>Show all users near me</Text>
                  <Text style={styles.subtitle}>See how many users are near you!</Text>
                </View>

                {/* Features List */}
                <View style={styles.featuresContainer}>
                  {features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <View style={styles.featureIconContainer}>
                        <MaterialIcons name={feature.icon as any} size={20} color="#FFFFFF" />
                      </View>
                      <Text style={styles.featureText}>{feature.text}</Text>
                    </View>
                  ))}
                </View>

                {/* Price */}
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>One-time payment</Text>
                  <Text style={styles.price}>€5.00</Text>
                  <Text style={styles.pricePeriod}>No recurring fees</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.purchaseButton} onPress={onPurchase}>
                    <LinearGradient
                      colors={['#FFFFFF', '#F5F5F5']}
                      style={styles.purchaseGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <MaterialIcons name="euro" size={20} color="#4CAF50" />
                      <Text style={styles.purchaseButtonText}>Buy for €5.00</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelButtonText}>Maybe Later</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Results Flow */}
                <View style={styles.header}>
                  <MaterialIcons name="people" size={32} color="#FFFFFF" />
                  <Text style={styles.title} numberOfLines={1}>Nearby Users Found!</Text>
                  <Text style={styles.subtitle}>Within 10km radius</Text>
                </View>

                {/* Results */}
                <View style={styles.resultsContainer}>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultNumber}>{userCountResults.totalUsers}</Text>
                    <Text style={styles.resultLabel}>Total Users</Text>
                    <View style={styles.photoGrid}>
                      {userCountResults.totalUserPhotos.slice(0, 8).map((photo, index) => (
                        <View key={index} style={styles.photoItem}>
                          <View style={styles.photoPlaceholder}>
                            <MaterialIcons name="person" size={16} color="#4CAF50" />
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.resultItem}>
                    <Text style={styles.resultNumber}>{userCountResults.visibleUsers}</Text>
                    <Text style={styles.resultLabel}>Visible on Map</Text>
                    <View style={styles.photoGrid}>
                      {userCountResults.visibleUserPhotos.slice(0, 8).map((photo, index) => (
                        <View key={index} style={styles.photoItem}>
                          <View style={styles.photoPlaceholder}>
                            <MaterialIcons name="person" size={16} color="#4CAF50" />
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={styles.purchaseButton} 
                    onPress={onUpdateSearch}
                    disabled={isSearching}
                  >
                    <LinearGradient
                      colors={['#FFFFFF', '#F5F5F5']}
                      style={styles.purchaseGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <MaterialIcons name="refresh" size={20} color="#4CAF50" />
                      <Text style={styles.purchaseButtonText}>
                        {isSearching ? 'Updating...' : 'Update Search'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    width: width * 0.85,
    maxWidth: 370,
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
  gradientBackground: {
    padding: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
    flexShrink: 1,
    width: '100%',
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  pricePeriod: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  purchaseButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  purchaseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  closeButton: {
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
  resultsContainer: {
    width: '100%',
    marginBottom: 24,
    gap: 20,
  },
  resultItem: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  resultNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 12,
    fontWeight: '500',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  photoItem: {
    width: 32,
    height: 32,
  },
  photoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UserCountPopup;
