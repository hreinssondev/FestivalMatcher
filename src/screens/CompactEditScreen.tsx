import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useProfile } from '../context/ProfileContext';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PhotoService } from '../services/photoService';
import { DeviceAuthService } from '../services/deviceAuthService';

const { width, height } = Dimensions.get('window');

type CompactEditScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CompactEdit'>;

const CompactEditScreen: React.FC = () => {
  const navigation = useNavigation<CompactEditScreenNavigationProp>();
  const { profileData, updateProfile } = useProfile();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [name, setName] = useState(profileData.name);
  const [age, setAge] = useState(profileData.age.toString());
  const [festival, setFestival] = useState(profileData.festival);
  const [ticketType, setTicketType] = useState(profileData.ticketType || '');
  const [stay, setStay] = useState(profileData.accommodation || '');
  const [bio, setBio] = useState(profileData.interests?.join(', ') || '');
  const [photos, setPhotos] = useState(profileData.photos || []);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedPhotosForDeletion, setSelectedPhotosForDeletion] = useState<Set<number>>(new Set());

  const handleSave = async () => {
    try {
      console.log('Saving profile with photos:', photos);
      
      // Update local profile
      updateProfile({
        name,
        age: parseInt(age) || 0,
        festival,
        ticketType,
        accommodation: stay,
        interests: bio.trim() ? [bio.trim()] : [],
        photos,
      });
      
      console.log('Local profile updated, now updating database...');
      
      // Update database
      const updateResult = await DeviceAuthService.updateUserProfile({
        name,
        age: parseInt(age) || 0,
        festival,
        ticket_type: ticketType,
        accommodation_type: stay,
        interests: bio.trim() ? [bio.trim()] : [],
        photos,
      });
      
      if (updateResult.error) {
        console.error('Failed to update profile in database:', updateResult.error);
        Alert.alert('⚠️ Profile updated locally but failed to save to cloud. Please try again.');
        return;
      }
      
      console.log('Database updated successfully!');
      console.log('Saved profile:', updateResult.profile);
      
      Alert.alert('Success', 'Profile saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('❌ Failed to save profile. Please try again.');
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedPhotosForDeletion(new Set());
  };

  const togglePhotoSelection = (index: number) => {
    const newSelected = new Set(selectedPhotosForDeletion);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPhotosForDeletion(newSelected);
  };

  const deleteSelectedPhotos = async () => {
    if (selectedPhotosForDeletion.size === 0) return;

    try {
      const newPhotos = [...photos];
      const photosToDelete: string[] = [];
      const indicesToDelete: number[] = [];

      // Collect photos to delete
      selectedPhotosForDeletion.forEach(index => {
        photosToDelete.push(photos[index]);
        indicesToDelete.push(index);
      });

      // Remove from local state (in reverse order to maintain indices)
      indicesToDelete.sort((a, b) => b - a).forEach(index => {
        newPhotos.splice(index, 1);
      });

      setPhotos(newPhotos);
      setIsMultiSelectMode(false);
      setSelectedPhotosForDeletion(new Set());

      // Delete from Supabase Storage
      for (const photoUrl of photosToDelete) {
        if (PhotoService.isSupabaseUrl(photoUrl)) {
          await PhotoService.deletePhoto(photoUrl);
        }
      }
    } catch (error) {
      console.error('Error deleting selected photos:', error);
    }
  };

  const handleTestConnection = async () => {
    try {
      console.log('Testing storage bucket access...');
      const bucketResult = await PhotoService.testBucketAccess();
      
      let message = '';
      if (bucketResult.success) {
        message = '✅ Connection successful!\n✅ profile-photos bucket is accessible!\n\nYou can now upload photos.';
      } else {
        message = '❌ Storage connection failed\n\n';
        message += 'Error: ' + (bucketResult.error?.message || JSON.stringify(bucketResult.error));
        message += '\n\nMake sure:\n1. Bucket "profile-photos" exists\n2. Bucket is set to Public\n3. Storage policies are set up';
      }
      
      Alert.alert('Storage Test', message, [{ text: 'OK' }]);
    } catch (error: any) {
      Alert.alert('Test Failed', error.message || 'Unknown error');
    }
  };

  const handleAddPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photos to add images.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable editing to allow multiple selection
        quality: 1.0, // Full quality now that file size limit is removed
        allowsMultipleSelection: true,
        selectionLimit: 6 - photos.length,
      });

      if (!result.canceled && result.assets.length > 0) {
        // Get user ID
        const deviceUserId = await DeviceAuthService.getDeviceUserId();
        
        // Test bucket access first
        console.log('Testing bucket access before upload...');
        const { success, error: bucketError } = await PhotoService.testBucketAccess();
        if (!success) {
          Alert.alert(
            'Storage Not Configured',
            'The photo storage bucket is not set up. Please configure the "profile-photos" bucket in your Supabase dashboard.\n\nError: ' + (bucketError?.message || 'Bucket not found'),
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Upload photos to Supabase Storage
        const photoUris = result.assets.map(asset => asset.uri);
        const { urls, error } = await PhotoService.uploadPhotos(deviceUserId, photoUris);
        
        if (error) {
          console.error('Photo upload failed:', error);
          Alert.alert(
            'Upload Failed', 
            'Failed to upload photos. Please check your internet connection and try again.\n\nError: ' + (error.message || error),
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Add the new photo URLs to the photos array
        setPhotos([...photos, ...urls]);
        Alert.alert('Success', `${urls.length} photo${urls.length > 1 ? 's' : ''} added successfully!`);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const photoToRemove = photos[index];
              const newPhotos = photos.filter((_, i) => i !== index);
              
              // Update local state first
              setPhotos(newPhotos);
              
              // Clear selection if the selected photo was removed
              if (selectedPhotoIndex === index) {
                setSelectedPhotoIndex(null);
              } else if (selectedPhotoIndex !== null && selectedPhotoIndex > index) {
                // Adjust selection index if a photo before it was removed
                setSelectedPhotoIndex(selectedPhotoIndex - 1);
              }
              
              // Delete from Supabase Storage if it's a Supabase URL
              if (PhotoService.isSupabaseUrl(photoToRemove)) {
                const { error } = await PhotoService.deletePhoto(photoToRemove);
                if (error) {
                  console.error('Failed to delete photo from storage:', error);
                  return;
                }
              }
            } catch (error) {
              console.error('Error removing photo:', error);
              Alert.alert('❌ Failed to remove photo. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handlePhotoPress = (index: number) => {
    if (selectedPhotoIndex === null) {
      // First photo selected
      setSelectedPhotoIndex(index);
    } else if (selectedPhotoIndex === index) {
      // Same photo tapped again - deselect
      setSelectedPhotoIndex(null);
    } else {
      // Second photo selected - swap positions
      const newPhotos = [...photos];
      const temp = newPhotos[selectedPhotoIndex];
      newPhotos[selectedPhotoIndex] = newPhotos[index];
      newPhotos[index] = temp;
      setPhotos(newPhotos);
      setSelectedPhotoIndex(null); // Clear selection after swap
    }
  };

  const renderField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    multiline: boolean = false,
    keyboardType: 'default' | 'numeric' = 'default',
    fieldIndex?: number
  ) => {
    const handleTextChange = (text: string) => {
      if (label === 'Bio' && text.length > 60) {
        Alert.alert(
          'Character Limit Reached',
          'Bio has a 60 character limit (including spaces).',
          [{ text: 'OK' }]
        );
        return;
      }
      onChangeText(text);
    };

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          style={[styles.fieldInput, multiline && styles.multilineInput]}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#666"
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          keyboardType={keyboardType}
          maxLength={label === 'Bio' ? 60 : undefined}
          onFocus={() => {
            // Scroll to show the field above keyboard
            setTimeout(() => {
              if (fieldIndex !== undefined) {
                // Calculate approximate position based on field index
                const estimatedPosition = fieldIndex * 100; // Rough estimate per field
                scrollViewRef.current?.scrollTo({
                  y: Math.max(0, estimatedPosition - 100),
                  animated: true
                });
              }
            }, 200);
          }}
        />
        {label === 'Bio' && (
          <Text style={styles.characterCount}>
            {value.length}/60 characters
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <MaterialIcons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <MaterialIcons name="check" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
      >
        {/* Photos Section */}
        <View style={styles.fieldContainer}>
          <View style={styles.photosHeader}>
            <View>
              <Text style={styles.fieldLabel}>Photos</Text>
              <Text style={styles.photosSubtext}>(Tap to move)</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.testButton} onPress={handleTestConnection}>
                <MaterialIcons name="wifi" size={18} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.editButton} onPress={toggleMultiSelectMode}>
                <MaterialIcons 
                  name={isMultiSelectMode ? "close" : "edit"} 
                  size={20} 
                  color={isMultiSelectMode ? "#FF4444" : "#FF6B6B"} 
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.photosContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <TouchableOpacity
                  style={[
                    styles.photoThumbnail,
                    selectedPhotoIndex === index && !isMultiSelectMode && styles.selectedPhoto,
                    isMultiSelectMode && selectedPhotosForDeletion.has(index) && styles.selectedForDeletion
                  ]}
                  onPress={() => {
                    if (isMultiSelectMode) {
                      togglePhotoSelection(index);
                    } else {
                      handlePhotoPress(index);
                    }
                  }}
                >
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                  {isMultiSelectMode && selectedPhotosForDeletion.has(index) && (
                    <View style={styles.selectionIndicator}>
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                {!isMultiSelectMode && (
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <MaterialIcons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {photos.length < 6 && !isMultiSelectMode && (
              <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
                <MaterialIcons name="add" size={24} color="#666" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}
            {isMultiSelectMode && selectedPhotosForDeletion.size > 0 && (
              <TouchableOpacity style={styles.deleteSelectedButton} onPress={deleteSelectedPhotos}>
                <MaterialIcons name="delete" size={20} color="#FFFFFF" />
                <Text style={styles.deleteSelectedText}>Delete Selected ({selectedPhotosForDeletion.size})</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {renderField('Name', name, setName, 'Enter your name', false, 'default', 0)}
        {renderField('Age', age, setAge, 'Enter your age', false, 'numeric', 1)}
        {renderField('Festival', festival, setFestival, 'Enter festival name', false, 'default', 2)}
                    {renderField('Ticket Type', ticketType, setTicketType, 'Enter ticket type', false, 'default', 3)}
        {renderField('Stay', stay, setStay, 'Enter accommodation type', false, 'default', 4)}
        {renderField('Bio', bio, setBio, 'Tell us about yourself...', true, 'default', 5)}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  contentContainer: {
    paddingBottom: 100, // Extra padding at bottom for keyboard
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 13,
  },
  photosSubtext: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: -4,
  },
  testButton: {
    padding: 8,
    marginTop: 8,
  },
  editButton: {
    padding: 8,
    marginTop: 8,
  },
  fieldInput: {
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#444',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    position: 'relative',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#2D2D2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  selectedPhoto: {
    borderWidth: 3,
    borderColor: '#FF6B6B',
  },
  selectedForDeletion: {
    borderWidth: 3,
    borderColor: '#FF4444',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#2D2D2D',
    borderWidth: 2,
    borderColor: '#444',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  deleteSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  deleteSelectedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  characterCount: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
});

export default CompactEditScreen;
