import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { DeviceAuthService } from '../services/deviceAuthService';

const DeviceAuthTestScreen: React.FC = () => {
  const [deviceUserId, setDeviceUserId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    try {
      const userId = await DeviceAuthService.getDeviceUserId();
      setDeviceUserId(userId);
      
      const userResult = await DeviceAuthService.getCurrentUser();
      if (userResult.user) {
        setCurrentUser(userResult.user);
      }
    } catch (error) {
      console.error('Error loading device info:', error);
    }
  };

  const testSignIn = async () => {
    setLoading(true);
    try {
      const result = await DeviceAuthService.signInWithDevice();
      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else {
        setCurrentUser(result.user);
        Alert.alert('Success', 'Device sign in successful!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in with device');
    } finally {
      setLoading(false);
    }
  };

  const testUpdateProfile = async () => {
    setLoading(true);
    try {
      console.log('Testing profile update...');
      const result = await DeviceAuthService.updateUserProfile({
        name: 'Test User',
        age: 25,
        gender: 'Male',
        festival: 'Test Festival',
        ticket_type: 'VIP',
        accommodation_type: 'Hotel',
        interests: ['Music', 'Dancing'],
        photos: ['https://example.com/photo.jpg'],
      });
      
      if (result.error) {
        console.error('Profile update error:', result.error);
        Alert.alert('Error', `Profile update failed: ${result.error.message}`);
      } else {
        console.log('Profile update success:', result.profile);
        setCurrentUser(result.profile);
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (error) {
      console.error('Profile update exception:', error);
      Alert.alert('Error', `Failed to update profile: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clearData = async () => {
    try {
      const result = await DeviceAuthService.clearDeviceData();
      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else {
        setDeviceUserId('');
        setCurrentUser(null);
        Alert.alert('Success', 'Device data cleared!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to clear device data');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device Authentication Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device User ID:</Text>
        <Text style={styles.value}>{deviceUserId || 'Loading...'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current User:</Text>
        {currentUser ? (
          <View>
            <Text style={styles.value}>Name: {currentUser.name || 'Not set'}</Text>
            <Text style={styles.value}>Age: {currentUser.age || 'Not set'}</Text>
            <Text style={styles.value}>Gender: {currentUser.gender || 'Not set'}</Text>
            <Text style={styles.value}>Festival: {currentUser.festival || 'Not set'}</Text>
          </View>
        ) : (
          <Text style={styles.value}>No user found</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={testSignIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Test Sign In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={testUpdateProfile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Test Update Profile'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearData}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Clear Device Data</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1A1A1A',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#2D2D2D',
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  value: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 5,
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#FF4444',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DeviceAuthTestScreen;
