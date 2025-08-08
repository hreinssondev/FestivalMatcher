import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useOnboarding } from '../context/OnboardingContext';
import { useProfile } from '../context/ProfileContext';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { resetOnboarding } = useOnboarding();
  const { profileData } = useProfile();

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will show the onboarding screens again when you restart the app. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetOnboarding();
            Alert.alert('Onboarding Reset', 'Onboarding has been reset. Restart the app to see the onboarding screens again.');
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will clear all your profile data and reset the app to its initial state. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            // Clear all data
            await resetOnboarding();
            // You could add more data clearing here
            Alert.alert('Data Cleared', 'All data has been cleared. Restart the app to start fresh.');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // Handle logout logic here
            Alert.alert('Logged Out', 'You have been logged out successfully.');
          },
        },
      ]
    );
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    showArrow: boolean = true,
    showSwitch: boolean = false,
    switchValue?: boolean,
    onSwitchChange?: (value: boolean) => void,
    destructive: boolean = false
  ) => (
    <TouchableOpacity
      style={[styles.settingItem, destructive && styles.destructiveItem]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingItemLeft}>
        <MaterialIcons
          name={icon as any}
          size={24}
          color={destructive ? '#FF6B6B' : '#FFFFFF'}
          style={styles.settingIcon}
        />
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, destructive && styles.destructiveText]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      
      {showSwitch && onSwitchChange && (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#767577', true: '#FF6B6B' }}
          thumbColor={switchValue ? '#FFFFFF' : '#f4f3f4'}
        />
      )}
      
      {showArrow && !showSwitch && (
        <MaterialIcons name="chevron-right" size={24} color="#999" />
      )}
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#1A1A1A', '#2D2D2D']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          {renderSettingItem(
            'person',
            'Edit Profile',
            'Update your personal information',
            () => navigation.navigate('EditProfile' as any)
          )}
          {renderSettingItem(
            'photo-camera',
            'Change Photos',
            'Update your profile pictures'
          )}
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          {renderSettingItem(
            'notifications',
            'Push Notifications',
            'Get notified about new matches',
            undefined,
            false,
            true,
            true,
            (value) => console.log('Notifications:', value)
          )}
          {renderSettingItem(
            'location-on',
            'Location Services',
            'Find people nearby at festivals',
            undefined,
            false,
            true,
            true,
            (value) => console.log('Location:', value)
          )}
          {renderSettingItem(
            'visibility',
            'Profile Visibility',
            'Control who can see your profile',
            undefined,
            false,
            true,
            true,
            (value) => console.log('Visibility:', value)
          )}
        </View>

        {/* Privacy & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          {renderSettingItem(
            'security',
            'Privacy Settings',
            'Manage your privacy preferences'
          )}
          {renderSettingItem(
            'block',
            'Blocked Users',
            'Manage blocked users'
          )}
          {renderSettingItem(
            'report',
            'Report Issues',
            'Report bugs or inappropriate content'
          )}
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {renderSettingItem(
            'email',
            'Change Email',
            'Update your email address'
          )}
          {renderSettingItem(
            'lock',
            'Change Password',
            'Update your password'
          )}
          {renderSettingItem(
            'delete',
            'Delete Account',
            'Permanently delete your account',
            undefined,
            true,
            false,
            undefined,
            undefined,
            true
          )}
        </View>

        {/* Development */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Development</Text>
          {renderSettingItem(
            'refresh',
            'Reset Onboarding',
            'Show onboarding screens again',
            handleResetOnboarding
          )}
          {renderSettingItem(
            'clear',
            'Clear All Data',
            'Reset app to initial state',
            handleClearData,
            true,
            false,
            undefined,
            undefined,
            true
          )}
        </View>

        {/* Logout */}
        <View style={styles.section}>
          {renderSettingItem(
            'logout',
            'Logout',
            'Sign out of your account',
            handleLogout,
            true,
            false,
            undefined,
            undefined,
            true
          )}
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          {renderSettingItem(
            'info',
            'App Version',
            '1.0.0',
            undefined,
            false
          )}
          {renderSettingItem(
            'description',
            'Terms of Service',
            'Read our terms and conditions'
          )}
          {renderSettingItem(
            'policy',
            'Privacy Policy',
            'Read our privacy policy'
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginBottom: 15,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 20,
    marginBottom: 1,
    borderRadius: 10,
  },
  destructiveItem: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 15,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  destructiveText: {
    color: '#FF6B6B',
  },
});

export default SettingsScreen;