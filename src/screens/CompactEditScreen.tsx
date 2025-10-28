import React, { useState, useRef, useEffect } from 'react';
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
  Keyboard,
  Animated,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useProfile } from '../context/ProfileContext';
import { MaterialIcons } from '@expo/vector-icons';
import { InstagramService } from '../services/instagramService';
import * as ImagePicker from 'expo-image-picker';
import { PhotoService } from '../services/photoService';
import { DeviceAuthService } from '../services/deviceAuthService';
import { FestivalService, Festival } from '../services/festivalService';

const { width, height } = Dimensions.get('window');

type CompactEditScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CompactEdit'>;

const festivals = [
  'Defqon.1',
  'Tomorrowland',
  'Ultra Music Festival',
  'Electric Daisy Carnival',
  'Coachella',
  'Burning Man',
  'Sziget Festival',
  'Lowlands',
  'Glastonbury',
];

const accommodations = [
  'Hotel',
  'Camping',
  'Airbnb',
  'None',
];

const ticketTypes = [
  'Weekend',
  'Weekend Premium/VIP',
  'Saturday',
  'Saturday Premium/VIP',
  'Friday',
  'Friday Premium/VIP',
  'Backstage Pass',
  'Artist Pass',
  'Media Pass',
];

const CompactEditScreen: React.FC = () => {
  const navigation = useNavigation<CompactEditScreenNavigationProp>();
  const { profileData, updateProfile } = useProfile();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Parse existing data from comma-separated strings
  const parseFestivals = (festivalStr: string): string[] => {
    if (!festivalStr) return [];
    return festivalStr.split(',').map(f => f.trim()).filter(f => f.length > 0);
  };

  const parseTicketTypes = (ticketStr: string): { [festival: string]: string } => {
    const result: { [festival: string]: string } = {};
    if (!ticketStr) return result;
    const entries = ticketStr.split(',');
    entries.forEach(entry => {
      const [festival, ticket] = entry.split(':').map(s => s.trim());
      if (festival && ticket) {
        result[festival] = ticket;
      }
    });
    return result;
  };

  const parseAccommodations = (accomStr: string): { [festival: string]: string } => {
    const result: { [festival: string]: string } = {};
    if (!accomStr) return result;
    const entries = accomStr.split(',');
    entries.forEach(entry => {
      const [festival, accommodation] = entry.split(':').map(s => s.trim());
      if (festival && accommodation) {
        result[festival] = accommodation;
      }
    });
    return result;
  };

  const initialFestivals = parseFestivals(profileData.festival);
  const initialTicketTypes = parseTicketTypes(profileData.ticketType || '');
  const initialAccommodations = parseAccommodations(profileData.accommodation || '');
  
  const [name, setName] = useState(profileData.name);
  const [age, setAge] = useState(profileData.age.toString());
  const [festivalList, setFestivalList] = useState<string[]>(initialFestivals.length > 0 ? initialFestivals : ['']);
  const [ticketTypeMap, setTicketTypeMap] = useState<{ [festival: string]: string }>(initialTicketTypes);
  const [accommodationMap, setAccommodationMap] = useState<{ [festival: string]: string }>(initialAccommodations);
  const [bio, setBio] = useState(profileData.interests?.join(', ') || '');
  const [photos, setPhotos] = useState(profileData.photos || []);
  const [instagram, setInstagram] = useState(profileData.instagram || '');
  
  const [showFestivalPicker, setShowFestivalPicker] = useState<number | null>(null);
  const [showTicketTypePicker, setShowTicketTypePicker] = useState<string | null>(null);
  const [showAccommodationPicker, setShowAccommodationPicker] = useState<string | null>(null);
  
  const [showFestivalCustomInput, setShowFestivalCustomInput] = useState<number | null>(null);
  const [showTicketTypeCustomInput, setShowTicketTypeCustomInput] = useState<string | null>(null);
  const [showAccommodationCustomInput, setShowAccommodationCustomInput] = useState<string | null>(null);
  
  const [showFestivalSearch, setShowFestivalSearch] = useState<number | null>(null);
  const [festivalSearchTerm, setFestivalSearchTerm] = useState<string>('');
  const [festivalSearchResults, setFestivalSearchResults] = useState<Festival[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showInstagramInput, setShowInstagramInput] = useState<boolean>(false);
  
  const [animatingItem, setAnimatingItem] = useState<string | null>(null);
  const instagramInputRef = useRef<TextInput>(null);
  
  const festivalCustomInputRef = useRef<TextInput>(null);
  const ticketTypeCustomInputRef = useRef<TextInput>(null);
  const accommodationCustomInputRef = useRef<TextInput>(null);
  const festivalSearchInputRef = useRef<TextInput>(null);
  const festivalSectionRefs = useRef<{ [key: string]: View | null }>({});

  // Focus custom inputs when shown
  useEffect(() => {
    if (showFestivalCustomInput !== null) {
      setTimeout(() => festivalCustomInputRef.current?.focus(), 100);
    }
  }, [showFestivalCustomInput]);

  useEffect(() => {
    if (showTicketTypeCustomInput) {
      setTimeout(() => ticketTypeCustomInputRef.current?.focus(), 100);
    }
  }, [showTicketTypeCustomInput]);

  useEffect(() => {
    if (showAccommodationCustomInput) {
      setTimeout(() => accommodationCustomInputRef.current?.focus(), 100);
    }
  }, [showAccommodationCustomInput]);

  useEffect(() => {
    if (showFestivalSearch !== null) {
      setTimeout(() => festivalSearchInputRef.current?.focus(), 100);
    }
  }, [showFestivalSearch]);

  // Debounced search for festivals
  useEffect(() => {
    if (!showFestivalSearch && showFestivalSearch !== null) {
      setFestivalSearchTerm('');
      setFestivalSearchResults([]);
      return;
    }

    if (festivalSearchTerm.trim().length < 2) {
      setFestivalSearchResults([]);
      setIsSearching(false);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      const result = await FestivalService.searchFestivals(festivalSearchTerm, 20);
      setIsSearching(false);
      
      if (result.error) {
        console.error('Festival search error:', result.error);
        // Fallback to local search if DB fails
        const localResults = festivals
          .filter(f => f.toLowerCase().includes(festivalSearchTerm.toLowerCase()))
          .map(name => ({ id: `local-${name}`, name }));
        setFestivalSearchResults(localResults);
      } else {
        setFestivalSearchResults(result.festivals);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeout);
  }, [festivalSearchTerm, showFestivalSearch]);

  const playSuccessAnimation = (itemId: string, callback: () => void) => {
    setAnimatingItem(itemId);
    // Update state immediately for faster response
    callback();
    // Clear animation after visual feedback (shorter delay)
    setTimeout(() => {
      setAnimatingItem(null);
    }, 150);
  };

  // Check if ticket type contains premium or vip
  const isPremiumOrVIP = (ticketType: string): boolean => {
    if (!ticketType) return false;
    const lower = ticketType.toLowerCase();
    return lower.includes('premium') || lower.includes('vip');
  };

  // Format ticket type to capitalize VIP and Premium
  const formatTicketType = (ticketType: string): string => {
    if (!ticketType) return ticketType;
    // Replace "vip" (case-insensitive) with "VIP"
    let formatted = ticketType.replace(/\bvip\b/gi, 'VIP');
    // Replace "premium" (case-insensitive) with "Premium"
    formatted = formatted.replace(/\bpremium\b/gi, 'Premium');
    return formatted;
  };

  // Close all pickers - ensures only one can be open at a time
  const closeAllPickers = () => {
    setShowFestivalPicker(null);
    setShowTicketTypePicker(null);
    setShowAccommodationPicker(null);
    setShowFestivalSearch(null);
    setShowFestivalCustomInput(null);
    setShowTicketTypeCustomInput(null);
    setShowAccommodationCustomInput(null);
  };

  const handleAddFestival = () => {
    setFestivalList([...festivalList, '']);
    closeAllPickers();
    setShowFestivalPicker(festivalList.length);
  };

  const handleFestivalSelect = (index: number, festival: string) => {
    if (festival && (!festivalList.includes(festival) || festival === festivalList[index])) {
      playSuccessAnimation(`festival-${index}-${festival}`, () => {
        const newList = [...festivalList];
        newList[index] = festival;
        setFestivalList(newList);
        setShowFestivalPicker(null);
      });
    }
  };

  const handleFestivalSearchSelect = async (index: number, festival: Festival) => {
    const festivalName = festival.name;
    if (festivalName && (!festivalList.includes(festivalName) || festivalName === festivalList[index])) {
      // If it's a custom festival (not in DB), try to add it
      if (festival.id.startsWith('custom-')) {
        await FestivalService.addCustomFestival(festivalName);
      }
      
      playSuccessAnimation(`festival-search-${index}-${festivalName}`, () => {
        const oldFestival = festivalList[index];
        const newList = [...festivalList];
        newList[index] = festivalName;
        setFestivalList(newList);
        
        // Update ticket type and accommodation if festival name changed
        if (oldFestival && oldFestival !== festivalName) {
          const newTicketMap = { ...ticketTypeMap };
          const newAccomMap = { ...accommodationMap };
          delete newTicketMap[oldFestival];
          delete newAccomMap[oldFestival];
          setTicketTypeMap(newTicketMap);
          setAccommodationMap(newAccomMap);
        }
        
        setShowFestivalSearch(null);
        setFestivalSearchTerm('');
        setFestivalSearchResults([]);
      });
    }
  };

  const handleFestivalCustomSubmit = (index: number, customFestival: string) => {
    const trimmed = customFestival.trim();
    if (trimmed && (!festivalList.includes(trimmed) || trimmed === festivalList[index])) {
      playSuccessAnimation(`festival-custom-${index}`, () => {
        const oldFestival = festivalList[index];
        const newList = [...festivalList];
        newList[index] = trimmed;
        setFestivalList(newList);
        
        // Update ticket type and accommodation if festival name changed
        if (oldFestival && oldFestival !== trimmed) {
          if (ticketTypeMap[oldFestival]) {
            const newTicketMap = { ...ticketTypeMap };
            delete newTicketMap[oldFestival];
            newTicketMap[trimmed] = ticketTypeMap[oldFestival];
            setTicketTypeMap(newTicketMap);
          }
          if (accommodationMap[oldFestival]) {
            const newAccomMap = { ...accommodationMap };
            delete newAccomMap[oldFestival];
            newAccomMap[trimmed] = accommodationMap[oldFestival];
            setAccommodationMap(newAccomMap);
          }
        }
        
        setShowFestivalCustomInput(null);
        setShowFestivalPicker(null);
        Keyboard.dismiss();
      });
    }
  };

  const handleRemoveFestival = (index: number) => {
    const festival = festivalList[index];
    
    Alert.alert(
      'Delete Festival',
      `Are you sure you want to remove "${festival}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newList = festivalList.filter((_, i) => i !== index);
            setFestivalList(newList);
            
            // Remove associated ticket type and accommodation
            if (festival && ticketTypeMap[festival]) {
              const newTicketMap = { ...ticketTypeMap };
              delete newTicketMap[festival];
              setTicketTypeMap(newTicketMap);
            }
            if (festival && accommodationMap[festival]) {
              const newAccomMap = { ...accommodationMap };
              delete newAccomMap[festival];
              setAccommodationMap(newAccomMap);
            }
          }
        }
      ]
    );
  };

  const handleTicketTypeSelect = (festival: string, ticketType: string) => {
    const formattedTicket = formatTicketType(ticketType);
    playSuccessAnimation(`ticket-${festival}-${ticketType}`, () => {
      setTicketTypeMap({ ...ticketTypeMap, [festival]: formattedTicket });
      setShowTicketTypePicker(null);
    });
  };

  const handleTicketTypeCustomSubmit = (festival: string, customTicket: string) => {
    if (customTicket.trim()) {
      const formattedTicket = formatTicketType(customTicket.trim());
      playSuccessAnimation(`ticket-custom-${festival}`, () => {
        setTicketTypeMap({ ...ticketTypeMap, [festival]: formattedTicket });
        setShowTicketTypeCustomInput(null);
        setShowTicketTypePicker(null);
        Keyboard.dismiss();
      });
    }
  };

  const handleAccommodationSelect = (festival: string, accommodation: string) => {
    playSuccessAnimation(`accom-${festival}-${accommodation}`, () => {
      setAccommodationMap({ ...accommodationMap, [festival]: accommodation });
      setShowAccommodationPicker(null);
    });
  };

  const handleAccommodationCustomSubmit = (festival: string, customAccom: string) => {
    if (customAccom.trim()) {
      playSuccessAnimation(`accom-custom-${festival}`, () => {
        setAccommodationMap({ ...accommodationMap, [festival]: customAccom.trim() });
        setShowAccommodationCustomInput(null);
        setShowAccommodationPicker(null);
        Keyboard.dismiss();
      });
    }
  };

  const handleSave = async () => {
    try {
      // Filter out empty festivals
      const validFestivals = festivalList.filter(f => f.trim().length > 0);
      
      if (validFestivals.length === 0) {
        Alert.alert('Error', 'Please add at least one festival');
        return;
      }

      const festivalStr = validFestivals.join(', ');
      const ticketTypeStr = Object.entries(ticketTypeMap)
        .filter(([fest]) => validFestivals.includes(fest))
        .map(([fest, ticket]) => `${fest}: ${ticket}`)
        .join(', ');
      const accommodationStr = Object.entries(accommodationMap)
        .filter(([fest]) => validFestivals.includes(fest))
        .map(([fest, accom]) => `${fest}: ${accom}`)
        .join(', ');

      console.log('Saving profile with photos:', photos);
      
      // Update local profile
      await updateProfile({
        name,
        age: parseInt(age) || 0,
        festival: festivalStr,
        ticketType: ticketTypeStr,
        accommodation: accommodationStr,
        interests: bio.trim() ? [bio.trim()] : [],
        photos,
        instagram: instagram.trim(),
      });
      
      console.log('Local profile updated, now updating database...');
      
      // Update database
      const updateResult = await DeviceAuthService.updateUserProfile({
        name,
        age: parseInt(age) || 0,
        festival: festivalStr,
        ticket_type: ticketTypeStr,
        accommodation_type: accommodationStr,
        interests: bio.trim() ? [bio.trim()] : [],
        photos,
        instagram: instagram.trim() || null,
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

  const movePhoto = (fromIndex: number, toIndex: number) => {
    const updatedPhotos = [...photos];
    const [movedPhoto] = updatedPhotos.splice(fromIndex, 1);
    updatedPhotos.splice(toIndex, 0, movedPhoto);
    setPhotos(updatedPhotos);
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
        allowsEditing: false,
        quality: 1.0,
        allowsMultipleSelection: true,
        selectionLimit: 6 - photos.length,
      });

      if (!result.canceled && result.assets.length > 0) {
        const deviceUserId = await DeviceAuthService.getDeviceUserId();
        
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
              
              setPhotos(newPhotos);
              
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
            </View>
          </View>
          <View style={styles.photosContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoItemContainer}>
                <View style={styles.photoItem}>
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                  
                  {/* Remove button */}
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <MaterialIcons name="close" size={12} color="#FFFFFF" />
              </TouchableOpacity>
                </View>
                
                {/* Reorder buttons below photo */}
                <View style={styles.reorderButtons}>
                  {index > 0 && (
                    <TouchableOpacity
                      style={styles.reorderButton}
                      onPress={() => movePhoto(index, index - 1)}
                    >
                      <MaterialIcons name="arrow-back" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                  {index < photos.length - 1 && (
                    <TouchableOpacity
                      style={styles.reorderButton}
                      onPress={() => movePhoto(index, index + 1)}
                    >
                      <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            {photos.length < 6 && (
              <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
                <MaterialIcons name="add" size={24} color="#666" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Instagram Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Instagram</Text>
          
          {/* Instagram Display/Input */}
          {!showInstagramInput ? (
            instagram ? (
              <TouchableOpacity
                style={styles.instagramButton}
                onPress={() => {
                  setShowInstagramInput(true);
                  setTimeout(() => instagramInputRef.current?.focus(), 100);
                }}
              >
                <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.instagramText}>@{instagram}</Text>
                <MaterialIcons name="edit" size={18} color="#666" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.instagramConnectButton}
                onPress={() => {
                  setShowInstagramInput(true);
                  setTimeout(() => instagramInputRef.current?.focus(), 100);
                }}
              >
                <MaterialIcons name="add-circle-outline" size={20} color="#FF6B6B" style={{ marginRight: 8 }} />
                <Text style={styles.instagramConnectText}>Add Instagram</Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.instagramInputContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={{ color: '#FFFFFF', marginRight: 8, fontSize: 16 }}>@</Text>
                <TextInput
                  ref={instagramInputRef}
                  style={[styles.fieldInput, { flex: 1 }]}
                  value={instagram}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/@/g, '').replace(/\s/g, '');
                    setInstagram(cleaned);
                  }}
                  placeholder="username"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={() => {
                    if (instagram.trim()) {
                      setShowInstagramInput(false);
                      Keyboard.dismiss();
                    }
                  }}
                />
              </View>
              {instagram && (
                <TouchableOpacity
                  style={{ marginLeft: 8 }}
                  onPress={() => {
                    setShowInstagramInput(false);
                    Keyboard.dismiss();
                  }}
                >
                  <MaterialIcons name="check" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{ marginLeft: 8 }}
                onPress={() => {
                  setInstagram('');
                  setShowInstagramInput(false);
                  Keyboard.dismiss();
                }}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          )}
          </View>

        {/* Bio Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Bio</Text>
          
          <TextInput
            style={[styles.fieldInput, styles.multilineInput]}
            value={bio}
            onChangeText={(text) => {
              if (text.length <= 200) {
                setBio(text);
              } else {
                Alert.alert(
                  'Character Limit Reached',
                  'Bio has a 200 character limit (including spaces).',
                  [{ text: 'OK' }]
                );
              }
            }}
            placeholder="Tell us about yourself..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={styles.characterCount}>
            {bio.length}/200 characters
          </Text>
        </View>

          {/* Festival Picker Section */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Festivals</Text>
            {festivalList.map((festival, index) => {
              // Only render if festival has value, or if picker/custom input/search is open for this index
              if (!festival.trim() && showFestivalPicker !== index && showFestivalCustomInput !== index && showFestivalSearch !== index) {
                return null;
              }
              return (
              <View key={index} style={styles.festivalRow}>
                {festival.trim() && showFestivalPicker !== index && showFestivalCustomInput !== index && showFestivalSearch !== index ? (
                <View style={styles.festivalChip}>
                <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      // Scroll to the festival section below
                      const sectionRef = festivalSectionRefs.current[festival];
                      if (sectionRef && scrollViewRef.current) {
                        sectionRef.measureLayout(
                          scrollViewRef.current as any,
                          (x, y) => {
                            scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
                          },
                          () => {
                            // Fallback: try to scroll using a small delay to allow layout
                            setTimeout(() => {
                              // Simple scroll - this is a fallback
                              // In production, you might want to calculate position differently
                            }, 100);
                          }
                        );
                      }
                    }}
                  >
                    <Text style={styles.festivalChipText}>{festival}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRemoveFestival(index)}>
                    <MaterialIcons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
                ) : (
                  <>
                    {showFestivalPicker === index && showFestivalCustomInput !== index && (
                    <View style={styles.pickerContainer}>
                      <TouchableOpacity
                        style={[styles.pickerOption, styles.collapseOption]}
                        onPress={() => {
                          setShowFestivalPicker(null);
                        }}
                      >
                        <MaterialIcons name="keyboard-arrow-up" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.pickerOption, styles.customInputOptionTop]}
                        onPress={() => {
                          closeAllPickers();
                          setShowFestivalSearch(index);
                        }}
                      >
                        <View style={styles.customInputTextContainer}>
                          <Text style={[styles.pickerOptionText, styles.customInputTextTop]}>Search. . . </Text>
                          <MaterialIcons name="search" size={20} color="#FF6B6B" style={{ marginLeft: 4 }} />
          </View>
                      </TouchableOpacity>
                <TouchableOpacity
                        style={[styles.pickerOption, styles.customInputOptionTop]}
                        onPress={() => {
                          closeAllPickers();
                          setShowFestivalCustomInput(index);
                        }}
                      >
                        <View style={styles.customInputTextContainer}>
                          <Text style={[styles.pickerOptionText, styles.customInputTextTop]}>Write it . . . </Text>
                          <MaterialIcons name="edit" size={20} color="#FF6B6B" style={{ marginLeft: 4 }} />
                        </View>
                      </TouchableOpacity>
                      <View style={styles.orDivider}>
                        <View style={styles.orDividerLine} />
                        <Text style={styles.orDividerText}>or</Text>
                        <View style={styles.orDividerLine} />
                      </View>
                      {festivals
                        .filter(f => !festivalList.includes(f) || f === festival)
                        .map((f) => (
                        <TouchableOpacity
                          key={f}
                  style={[
                            styles.pickerOption,
                            animatingItem === `festival-${index}` && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                            if (!festivalList.includes(f) || f === festival) {
                              handleFestivalSelect(index, f);
                            }
                          }}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            (animatingItem === `festival-${index}-${f}` || 
                             (animatingItem !== null && animatingItem.startsWith(`festival-${index}-`) ? false : (festivalList.includes(f) || festival === f))) && 
                            styles.pickerOptionTextSelected
                          ]}>{f}</Text>
                          {(festivalList.includes(f) || festival === f) && (
                            <MaterialIcons name="check" size={20} color="#FF6B6B" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  
                  {showFestivalSearch === index && (
                    <View>
                      <View style={styles.searchContainer}>
                        <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
                        <TextInput
                          ref={festivalSearchInputRef}
                          style={styles.searchInput}
                          placeholder="Search festivals..."
                          placeholderTextColor="#666"
                          value={festivalSearchTerm}
                          onChangeText={setFestivalSearchTerm}
                          returnKeyType="search"
                          keyboardAppearance="dark"
                          autoCapitalize="words"
                        />
                        {isSearching && (
                          <MaterialIcons name="hourglass-empty" size={20} color="#666" style={styles.searchIcon} />
                        )}
                        {festivalSearchTerm.length > 0 && (
                          <TouchableOpacity
                            onPress={() => {
                              setFestivalSearchTerm('');
                              setFestivalSearchResults([]);
                            }}
                            style={styles.clearButton}
                          >
                            <MaterialIcons name="close" size={20} color="#666" />
                </TouchableOpacity>
                        )}
                      </View>
                      
                      {festivalSearchTerm.length >= 2 && (
                        <View style={styles.searchResultsContainer}>
                          {isSearching ? (
                            <View style={styles.searchResultItem}>
                              <Text style={styles.searchResultText}>Searching...</Text>
                            </View>
                          ) : festivalSearchResults.length > 0 ? (
                            festivalSearchResults.map((resultFestival) => (
                  <TouchableOpacity
                                key={resultFestival.id}
                                style={[
                                  styles.pickerOption,
                                  animatingItem === `festival-search-${index}` && styles.pickerOptionSelected
                                ]}
                                onPress={() => handleFestivalSearchSelect(index, resultFestival)}
                              >
                                <View>
                                  <Text style={[
                                    styles.pickerOptionText,
                                    (animatingItem === `festival-search-${index}-${resultFestival.name}` || 
                                     (animatingItem !== null && animatingItem.startsWith(`festival-search-${index}-`) ? false : festivalList[index] === resultFestival.name)) && 
                                    styles.pickerOptionTextSelected
                                  ]}>{resultFestival.name}</Text>
                                  {resultFestival.location && (
                                    <Text style={styles.searchResultSubtext}>
                                      {resultFestival.location}{resultFestival.country ? `, ${resultFestival.country}` : ''}
                                    </Text>
                                  )}
                                </View>
                                {festivalList[index] === resultFestival.name && (
                                  <MaterialIcons name="check" size={20} color="#FF6B6B" />
                                )}
                  </TouchableOpacity>
                            ))
                          ) : (
                            <View style={styles.searchResultItem}>
                              <Text style={styles.searchResultText}>No festivals found</Text>
                            </View>
                )}
              </View>
                      )}
                      
                      <TouchableOpacity
                        style={styles.backToPickerButton}
                        onPress={() => {
                          setShowFestivalSearch(null);
                          setFestivalSearchTerm('');
                          setFestivalSearchResults([]);
                          setShowFestivalPicker(index);
                        }}
                      >
                        <Text style={styles.backToPickerText}>Back to list</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {showFestivalCustomInput === index && (
                    <View>
                      <TextInput
                        ref={festivalCustomInputRef}
                        style={[
                          styles.fieldInput,
                          animatingItem?.startsWith('festival-custom') && styles.textInputSelected
                        ]}
                        placeholder="Enter festival name"
                        placeholderTextColor="#666"
                        defaultValue={festival}
                        returnKeyType="done"
                        keyboardAppearance="dark"
                        onSubmitEditing={(e) => {
                          handleFestivalCustomSubmit(index, e.nativeEvent.text);
                        }}
                      />
                      <TouchableOpacity
                        style={styles.backToPickerButton}
                        onPress={() => {
                          setShowFestivalCustomInput(null);
                          setShowFestivalPicker(index);
                        }}
                      >
                        <Text style={styles.backToPickerText}>Back to list</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
              );
            })}
          
          <TouchableOpacity
            style={styles.addFestivalButton}
            onPress={handleAddFestival}
          >
            <MaterialIcons name="add" size={20} color="#FF6B6B" />
            <Text style={styles.addFestivalText}>Add another festival</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 16 }} />

        {/* Ticket Type and Accommodation for each festival */}
        {festivalList.filter(f => f.trim().length > 0).map((festival, index) => (
          <View 
            key={index} 
            ref={(ref) => { festivalSectionRefs.current[festival] = ref; }}
            style={styles.festivalSection}
            onLayout={() => {}}
          >
            <Text style={styles.festivalLabel}>{festival}</Text>
            
            {/* Ticket Type Picker */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldSubLabel}>Ticket Type</Text>
              {showTicketTypePicker !== festival && !showTicketTypeCustomInput ? (
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    closeAllPickers();
                    setShowTicketTypePicker(festival);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={[styles.pickerButtonText, ticketTypeMap[festival] ? styles.pickerButtonTextFilled : null]}>
                      {ticketTypeMap[festival] ? formatTicketType(ticketTypeMap[festival]) : 'Select ticket type'}
                    </Text>
                    {ticketTypeMap[festival] && isPremiumOrVIP(ticketTypeMap[festival]) && (
                      <MaterialIcons name="star" size={16} color="#FF6B6B" style={{ marginLeft: 6 }} />
                    )}
                  </View>
                  <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
                </TouchableOpacity>
              ) : null}
              
              {showTicketTypePicker === festival && !showTicketTypeCustomInput && (
                <View style={styles.pickerContainer}>
                    <TouchableOpacity
                      style={[styles.pickerOption, styles.collapseOption]}
                      onPress={() => {
                        setShowTicketTypePicker(null);
                      }}
                    >
                      <MaterialIcons name="keyboard-arrow-up" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  {ticketTypes.map((ticketType, ticketIndex) => (
                    <React.Fragment key={ticketType}>
                      <TouchableOpacity
                        style={[
                          styles.pickerOption,
                          animatingItem === `ticket-${festival}` && styles.pickerOptionSelected
                        ]}
                        onPress={() => handleTicketTypeSelect(festival, ticketType)}
                      >
                        <View style={styles.pickerOptionTextContainer}>
                          <Text style={[
                            styles.pickerOptionText,
                            (animatingItem === `ticket-${festival}-${ticketType}` || 
                             (animatingItem !== null && animatingItem.startsWith(`ticket-${festival}-`) ? false : ticketTypeMap[festival] === ticketType)) && 
                            styles.pickerOptionTextSelected
                          ]}>{ticketType}</Text>
                          {isPremiumOrVIP(ticketType) && (
                            <MaterialIcons name="star" size={16} color="#FF6B6B" style={{ marginLeft: 6 }} />
                          )}
                        </View>
                        {ticketTypeMap[festival] === ticketType && (
                          <MaterialIcons name="check" size={20} color="#FF6B6B" />
                        )}
                      </TouchableOpacity>
                      {ticketType === 'Friday Premium/VIP' && (
                        <View style={styles.orDivider}>
                          <View style={styles.orDividerLine} />
                          <Text style={styles.orDividerText}>or</Text>
                          <View style={styles.orDividerLine} />
                        </View>
                      )}
                    </React.Fragment>
                  ))}
                  <View style={styles.orDivider}>
                    <View style={styles.orDividerLine} />
                    <Text style={styles.orDividerText}>or</Text>
                    <View style={styles.orDividerLine} />
                  </View>
                  <TouchableOpacity
                    style={[styles.pickerOption, styles.customInputOptionTop]}
                    onPress={() => {
                      closeAllPickers();
                      setShowTicketTypeCustomInput(festival);
                    }}
                  >
                    <View style={styles.customInputTextContainer}>
                      <Text style={[styles.pickerOptionText, styles.customInputTextTop]}>Write it . . . </Text>
                      <MaterialIcons name="edit" size={20} color="#FF6B6B" style={{ marginLeft: 4 }} />
                    </View>
              </TouchableOpacity>
                </View>
              )}
              
              {showTicketTypeCustomInput === festival && (
                <View>
                  <TextInput
                    ref={ticketTypeCustomInputRef}
                    style={[
                      styles.fieldInput,
                      animatingItem?.startsWith('ticket-custom') && styles.textInputSelected
                    ]}
                    placeholder="Enter ticket type"
                    placeholderTextColor="#666"
                    defaultValue={ticketTypeMap[festival] || ''}
                    returnKeyType="done"
                    keyboardAppearance="dark"
                    onSubmitEditing={(e) => {
                      handleTicketTypeCustomSubmit(festival, e.nativeEvent.text);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.backToPickerButton}
                    onPress={() => {
                      setShowTicketTypeCustomInput(null);
                      setShowTicketTypePicker(festival);
                    }}
                  >
                    <Text style={styles.backToPickerText}>Back to list</Text>
              </TouchableOpacity>
                </View>
            )}
          </View>

            {/* Accommodation Picker */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldSubLabel}>Accommodation</Text>
              {showAccommodationPicker !== festival && showAccommodationCustomInput !== festival ? (
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    closeAllPickers();
                    setShowAccommodationPicker(festival);
                  }}
                >
                  <Text style={[styles.pickerButtonText, accommodationMap[festival] && accommodationMap[festival] !== 'None' ? styles.pickerButtonTextFilled : null]}>
                    {accommodationMap[festival] && accommodationMap[festival] !== 'None' ? accommodationMap[festival] : 'Select accommodation (optional)'}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
              </TouchableOpacity>
              ) : null}
              
              {showAccommodationPicker === festival && !showAccommodationCustomInput && (
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={[styles.pickerOption, styles.collapseOption]}
                    onPress={() => {
                      setShowAccommodationPicker(null);
                    }}
                  >
                    <MaterialIcons name="keyboard-arrow-up" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  {accommodations
                    .filter(accommodation => accommodation !== 'None')
                    .map((accommodation, accIndex) => (
                    <React.Fragment key={accommodation}>
                      <TouchableOpacity
                        style={[
                          styles.pickerOption,
                          animatingItem === `accom-${festival}` && styles.pickerOptionSelected
                        ]}
                        onPress={() => handleAccommodationSelect(festival, accommodation)}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          (animatingItem === `accom-${festival}-${accommodation}` || 
                           (animatingItem !== null && animatingItem.startsWith(`accom-${festival}-`) ? false : accommodationMap[festival] === accommodation)) && 
                          styles.pickerOptionTextSelected
                        ]}>{accommodation}</Text>
                        {accommodationMap[festival] === accommodation && (
                          <MaterialIcons name="check" size={20} color="#FF6B6B" />
                        )}
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                  <View style={styles.orDivider}>
                    <View style={styles.orDividerLine} />
                    <Text style={styles.orDividerText}>or</Text>
                    <View style={styles.orDividerLine} />
        </View>
                  <TouchableOpacity
                    style={[
                      styles.pickerOption,
                      animatingItem === `accom-${festival}` && styles.pickerOptionSelected
                    ]}
                    onPress={() => handleAccommodationSelect(festival, 'None')}
                  >
                    <View style={styles.pickerOptionTextContainer}>
                      <Text style={[
                        styles.pickerOptionText,
                        (animatingItem === `accom-${festival}-None` || 
                         (animatingItem !== null && animatingItem.startsWith(`accom-${festival}-`) ? false : accommodationMap[festival] === 'None')) && 
                        styles.pickerOptionTextSelected
                      ]}>None - Leave blank</Text>
                      <MaterialIcons name="close" size={18} color="#FF6B6B" style={{ marginLeft: 3 }} />
                    </View>
                    {accommodationMap[festival] === 'None' && (
                      <MaterialIcons name="check" size={20} color="#FF6B6B" />
                    )}
                  </TouchableOpacity>
                  <View style={styles.orDivider}>
                    <View style={styles.orDividerLine} />
                    <Text style={styles.orDividerText}>or</Text>
                    <View style={styles.orDividerLine} />
                  </View>
                  <TouchableOpacity
                    style={[styles.pickerOption, styles.customInputOptionTop]}
                    onPress={() => {
                      closeAllPickers();
                      setShowAccommodationCustomInput(festival);
                    }}
                  >
                    <View style={styles.customInputTextContainer}>
                      <Text style={[styles.pickerOptionText, styles.customInputTextTop]}>Write it . . . </Text>
                      <MaterialIcons name="edit" size={20} color="#FF6B6B" style={{ marginLeft: 4 }} />
                    </View>
                  </TouchableOpacity>
                </View>
              )}
              
              {showAccommodationCustomInput === festival && (
                <View>
                  <TextInput
                    ref={accommodationCustomInputRef}
                    style={[
                      styles.fieldInput,
                      animatingItem?.startsWith('accom-custom') && styles.textInputSelected
                    ]}
                    placeholder="Enter accommodation type"
                    placeholderTextColor="#666"
                    defaultValue={accommodationMap[festival] || ''}
                    returnKeyType="done"
                    keyboardAppearance="dark"
                    onSubmitEditing={(e) => {
                      handleAccommodationCustomSubmit(festival, e.nativeEvent.text);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.backToPickerButton}
                    onPress={() => {
                      setShowAccommodationCustomInput(null);
                      setShowAccommodationPicker(festival);
                    }}
                  >
                    <Text style={styles.backToPickerText}>Back to list</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}

        {/* Name Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.fieldInput}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#666"
          />
        </View>

        {/* Age Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Age</Text>
          <TextInput
            style={styles.fieldInput}
            value={age}
            onChangeText={setAge}
            placeholder="Enter your age"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />
        </View>
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
    paddingBottom: 100,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldSection: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 8,
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
  textInputSelected: {
    borderColor: '#FF6B6B',
    color: '#FF6B6B',
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
  photoItemContainer: {
    position: 'relative',
  },
  photoItem: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#2D2D2D',
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  reorderButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
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
  instagramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  instagramText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  instagramConnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
  },
  instagramConnectText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  instagramInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 12,
  },
  instagramInBio: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  instagramInBioText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  instagramAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
  },
  instagramAddButtonText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  characterCount: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  festivalRow: {
    marginBottom: 12,
  },
  festivalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  festivalChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  festivalSection: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  festivalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  pickerButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#444',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#666',
  },
  pickerButtonTextFilled: {
    color: '#FFFFFF',
  },
  pickerContainer: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pickerOption: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  pickerOptionTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  pickerOptionSelected: {
    // No background change
  },
  pickerOptionTextSelected: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  collapseOption: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapseText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  customInputOptionTop: {
  },
  customInputTextTop: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 17,
  },
  customInputTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  orDividerText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginHorizontal: 12,
    opacity: 0.6,
  },
  customInputOption: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderTopWidth: 2,
    borderTopColor: '#FF6B6B',
    marginTop: 8,
  },
  customInputText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  customInputTextFestival: {
    fontSize: 17,
  },
  backToPickerButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
  },
  backToPickerText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchResultsContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 300,
    overflow: 'hidden',
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  searchResultText: {
    color: '#666',
    fontSize: 14,
  },
  searchResultSubtext: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  addFestivalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addFestivalText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CompactEditScreen;
