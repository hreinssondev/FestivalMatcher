import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking } from 'react-native';

// Complete the authentication session when WebBrowser completes
WebBrowser.maybeCompleteAuthSession();

export class InstagramService {
  /**
   * Opens Instagram login and attempts to get the user's username
   * Note: This is a simplified approach. For production, you'd need:
   * 1. Instagram Basic Display API setup with Meta Developer Console
   * 2. App ID and App Secret
   * 3. Valid redirect URIs configured
   * 4. Backend to securely handle tokens
   */
  static async connectInstagram(): Promise<string | null> {
    try {
      // For now, we'll open Instagram and let user manually enter their username
      // In production, you'd implement full OAuth flow with Instagram Basic Display API
      
      // Try to open Instagram app first
      const instagramAppUrl = 'instagram://';
      const canOpenApp = await Linking.canOpenURL(instagramAppUrl);
      
      if (canOpenApp) {
        // Open Instagram app - user can see their username there
        await Linking.openURL(instagramAppUrl);
        
        // Show alert asking user to enter their username
        return new Promise((resolve) => {
          // We'll handle the input in the component
          resolve(null); // Return null to indicate manual input needed
        });
      } else {
        // Open Instagram in browser
        const result = await WebBrowser.openBrowserAsync('https://www.instagram.com/accounts/login/', {
          showTitle: true,
          enableBarCollapsing: false,
        });
        
        if (result.type === 'cancel') {
          return null;
        }
        
        // After user logs in, they need to manually enter username
        // In a full implementation, we'd capture the OAuth callback
        return null;
      }
    } catch (error) {
      console.error('Error connecting Instagram:', error);
      Alert.alert('Error', 'Could not open Instagram. Please try again.');
      return null;
    }
  }

  /**
   * Opens the user's Instagram profile
   */
  static async openProfile(username: string): Promise<void> {
    try {
      const instagramAppUrl = `instagram://user?username=${username}`;
      const instagramWebUrl = `https://www.instagram.com/${username}/`;
      
      const canOpen = await Linking.canOpenURL(instagramAppUrl);
      if (canOpen) {
        await Linking.openURL(instagramAppUrl);
      } else {
        await Linking.openURL(instagramWebUrl);
      }
    } catch (error) {
      console.error('Error opening Instagram profile:', error);
      Alert.alert('Error', 'Could not open Instagram profile');
    }
  }
}

