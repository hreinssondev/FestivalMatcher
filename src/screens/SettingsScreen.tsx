import React, { useState } from 'react';
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
import { useSettings } from '../context/SettingsContext';
import { usePremium } from '../context/PremiumContext';
import { useUserCount } from '../context/UserCountContext';
import { DeviceAuthService } from '../services/deviceAuthService';
import { MatchingService } from '../services/matchingService';
import PremiumPopup from '../components/PremiumPopup';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { resetOnboarding } = useOnboarding();
  const { profileData } = useProfile();
  const { settings, updateSetting, resetSettings } = useSettings();
  const { isPremium, activatePremium, deactivatePremium } = usePremium();
  const { hasUserCountFeature, deactivateUserCountFeature } = useUserCount();
  const [showDevOptions, setShowDevOptions] = useState(false);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);

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

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all app settings to their default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetSettings();
            Alert.alert('Settings Reset', 'All settings have been reset to default values.');
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
            await resetSettings();
            // You could add more data clearing here
            Alert.alert('Data Cleared', 'All data has been cleared. Restart the app to start fresh.');
          },
        },
      ]
    );
  };



  const handleBuyPremium = () => {
    setShowPremiumPopup(true);
  };

  const handlePremiumUpgrade = async () => {
    setShowPremiumPopup(false);
    // TODO: Implement actual payment processing
    // For now, activate premium immediately for demo purposes
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month from now
    await activatePremium(expiryDate);
    Alert.alert('Premium Activated!', 'Your premium features are now active for 1 month!');
  };

  const handleDeactivatePremium = () => {
    Alert.alert(
      'Deactivate Premium',
      'Are you sure you want to deactivate premium? This will remove all premium features.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            await deactivatePremium();
            Alert.alert('Premium Deactivated', 'Premium features have been deactivated.');
          },
        },
      ]
    );
  };

  const handleDeactivateUserCount = () => {
    Alert.alert(
      'Deactivate User Count Feature',
      'Are you sure you want to deactivate the user count feature? This will remove access to see nearby users.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            await deactivateUserCountFeature();
            Alert.alert('User Count Feature Deactivated', 'User count feature has been deactivated.');
          },
        },
      ]
    );
  };

  const handleClearSwipes = async () => {
    Alert.alert(
      'Clear All Swipes',
      'This will clear all your swipe history and allow you to see profiles again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Swipes',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await MatchingService.clearAllSwipes();
              if (result.success) {
                Alert.alert('✅ Success', 'All swipes cleared! Go back to Swipe tab to see profiles again.');
              } else {
                Alert.alert('❌ Failed', 'Failed to clear swipes');
              }
            } catch (error) {
              console.error('Error clearing swipes:', error);
              Alert.alert('❌ Error', 'Error clearing swipes');
            }
          },
        },
      ]
    );
  };

  const handleClearMatchesAndDMs = async () => {
    Alert.alert(
      'Clear Matches & DMs',
      'This will clear all matches, direct messages, and swipe history. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await MatchingService.clearAllMatchesAndMessages();
              if (result.success) {
                Alert.alert('✅ Success', 'All matches, messages, and DMs have been cleared!');
              } else {
                Alert.alert('❌ Failed', 'Failed to clear some data. Check console for details.');
              }
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('❌ Error', 'Failed to clear data. Check console for details.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAllUsers = async () => {
    Alert.alert(
      'Delete All Users',
      '⚠️ WARNING: This will permanently delete ALL registered users/profiles from the database. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All Users',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await MatchingService.deleteAllUsers();
              if (result.success) {
                Alert.alert('✅ Success', 'All users deleted! The database is now empty. You can create new test users.');
              } else {
                Alert.alert('❌ Failed', 'Failed to delete users');
              }
            } catch (error) {
              console.error('Error deleting users:', error);
              Alert.alert('❌ Error', 'Error deleting users');
            }
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

        {/* Premium */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium</Text>
          {isPremium ? (
            renderSettingItem(
              'star',
              'Premium Active',
              'Your premium features are active',
              undefined,
              false,
              false,
              undefined,
              undefined,
              false
            )
          ) : (
            renderSettingItem(
              'star',
              'Buy Premium',
              '1 month of premium features',
              handleBuyPremium,
              true,
              false,
              undefined,
              undefined,
              false
            )
          )}
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          {renderSettingItem(
            'notifications',
            'Push Notifications',
            'All notifications',
            () => navigation.navigate('NotificationSettings' as any)
          )}
          {renderSettingItem(
            'location-on',
            'Show me on Map',
            'Pings your latest location when you open the app',
            () => navigation.navigate('MapSettings' as any)
          )}
        </View>



        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
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

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
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

        {/* Development */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Development</Text>
          <TouchableOpacity
            style={styles.devToggleItem}
            onPress={() => setShowDevOptions(!showDevOptions)}
          >
            <View style={styles.settingItemLeft}>
              <MaterialIcons
                name="developer-mode"
                size={24}
                color="#FF6B6B"
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>
                  Developer Options
                </Text>
                <Text style={styles.settingSubtitle}>
                  {showDevOptions ? 'Hide development tools' : 'Show development tools'}
                </Text>
              </View>
            </View>
            <MaterialIcons 
              name={showDevOptions ? "expand-less" : "expand-more"} 
              size={24} 
              color="#FF6B6B" 
            />
          </TouchableOpacity>
          
          {showDevOptions && (
            <View style={styles.devOptionsContainer}>
              {renderSettingItem(
                'refresh',
                'Reset Onboarding',
                'Show onboarding screens again',
                handleResetOnboarding
              )}
              {renderSettingItem(
                'settings-backup-restore',
                'Reset Settings',
                'Reset all app settings to default',
                handleResetSettings
              )}
              {renderSettingItem(
                'delete-sweep',
                'Clear Matches & DMs',
                'Clear all matches, messages and swipes',
                handleClearMatchesAndDMs,
                true,
                false,
                undefined,
                undefined,
                true
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
              {renderSettingItem(
                'bug-report',
                'Supabase Test',
                'Test database connection and schema',
                () => navigation.navigate('SupabaseTest')
              )}
              {renderSettingItem(
                'trash',
                'Clear Device Data',
                'Clear all local device data (for testing)',
                async () => {
                  try {
                    await DeviceAuthService.clearDeviceData();
                    Alert.alert('Success', 'Device data cleared successfully!');
                  } catch (error) {
                    Alert.alert('Error', 'Failed to clear device data');
                  }
                }
              )}
              {renderSettingItem(
                'delete-forever',
                'Delete All Users',
                '⚠️ Permanently delete ALL users from database',
                handleDeleteAllUsers,
                true,
                false,
                undefined,
                undefined,
                true
              )}
              {renderSettingItem(
                'star-outline',
                'Deactivate Premium',
                'Remove premium status (dev only)',
                handleDeactivatePremium,
                true,
                false,
                undefined,
                undefined,
                true
              )}
              {hasUserCountFeature && renderSettingItem(
                'people-outline',
                'Deactivate User Count Feature',
                'Remove access to see nearby users (dev only)',
                handleDeactivateUserCount,
                true,
                false,
                undefined,
                undefined,
                true
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Premium Popup */}
      <PremiumPopup
        isVisible={showPremiumPopup}
        onClose={() => setShowPremiumPopup(false)}
        onUpgrade={handlePremiumUpgrade}
        title="Unlock Premium Features"
        message="Upgrade to premium and unlock exclusive features!"
      />
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
    paddingVertical: 10,
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
  devToggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    marginHorizontal: 20,
    marginBottom: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  devOptionsContainer: {
    marginTop: 5,
  },
});

export default SettingsScreen;