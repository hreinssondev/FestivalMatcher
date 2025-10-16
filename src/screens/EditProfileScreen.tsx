import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useProfile } from '../context/ProfileContext';
import { MaterialIcons } from '@expo/vector-icons';

type EditProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditProfile'>;

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const { profileData, updateProfile } = useProfile();
  const [name, setName] = useState(profileData.name);
  const [age, setAge] = useState(profileData.age);
  const [festivalName, setFestivalName] = useState(profileData.festival);
  const [ticketType, setTicketType] = useState(profileData.accommodation || '');
  const [accommodationType, setAccommodationType] = useState(profileData.accommodation || '');

  const handleSave = () => {
    updateProfile({
      name,
      age,
      festival: festivalName,
      accommodation: accommodationType,
    });
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          {profileData.photos && profileData.photos.length > 0 && profileData.photos[0] ? (
            <Image 
              source={{ uri: profileData.photos[0] }} 
              style={styles.profilePhoto} 
            />
          ) : (
            <View style={styles.noPhotoContainer}>
              <MaterialIcons name="person" size={60} color="#666" />
              <Text style={styles.noPhotoText}>No photo</Text>
            </View>
          )}
          <TouchableOpacity 
            style={styles.changePhotoButton}
            onPress={() => navigation.navigate('Onboarding' as any)}
          >
            <Text style={styles.changePhotoText}>Change Photos</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#666666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.textInput}
              value={age.toString()}
              onChangeText={(text) => setAge(parseInt(text) || 0)}
              placeholder="Enter your age"
              placeholderTextColor="#666666"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Festival</Text>
            <TextInput
              style={styles.textInput}
              value={festivalName}
              onChangeText={setFestivalName}
              placeholder="Enter festival name"
              placeholderTextColor="#666666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ticket Type</Text>
            <TextInput
              style={styles.textInput}
              value={ticketType}
              onChangeText={setTicketType}
              placeholder="Enter ticket type"
              placeholderTextColor="#666666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Accommodation Type</Text>
            <TextInput
              style={styles.textInput}
              value={accommodationType}
              onChangeText={setAccommodationType}
              placeholder="Enter accommodation type"
              placeholderTextColor="#666666"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: '#CCCCCC',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
  },
  changePhotoButton: {
    backgroundColor: '#333333',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  changePhotoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  formSection: {
    paddingBottom: 30,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  noPhotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2D2D2D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  noPhotoText: {
    color: '#999',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },

});

export default EditProfileScreen; 