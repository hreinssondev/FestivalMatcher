import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { AuthService } from '../services/authService';

const AuthTestScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { user: newUser, error } = await AuthService.signUp(email, password, {
        name: 'Test User',
        age: 25,
        festival: 'Defqon-1',
        ticket_type: 'Weekend VIP',
        accommodation_type: 'Friends Camp',
        interests: ['Music', 'Dancing'],
        photos: [],
      });

      if (error) {
        Alert.alert('Sign Up Error', error.message);
      } else {
        setUser(newUser);
        Alert.alert('Success', 'Account created successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { user: signedInUser, error } = await AuthService.signIn(email, password);

      if (error) {
        Alert.alert('Sign In Error', error.message);
      } else {
        setUser(signedInUser);
        Alert.alert('Success', 'Signed in successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const { error } = await AuthService.signOut();
      if (error) {
        Alert.alert('Sign Out Error', error.message);
      } else {
        setUser(null);
        Alert.alert('Success', 'Signed out successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentUser = async () => {
    setLoading(true);
    try {
      const { user: currentUser, error } = await AuthService.getCurrentUser();
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setUser(currentUser);
        Alert.alert('Current User', currentUser ? `Logged in as: ${currentUser.email}` : 'No user logged in');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Supabase Auth Test</Text>
      
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.signUpButton]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.signInButton]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.checkButton]}
          onPress={checkCurrentUser}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Check Current User</Text>
        </TouchableOpacity>

        {user && (
          <TouchableOpacity
            style={[styles.button, styles.signOutButton]}
            onPress={handleSignOut}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>

      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.userTitle}>Current User:</Text>
          <Text style={styles.userText}>Email: {user.email}</Text>
          <Text style={styles.userText}>ID: {user.id}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  form: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  signUpButton: {
    backgroundColor: '#4CAF50',
  },
  signInButton: {
    backgroundColor: '#2196F3',
  },
  checkButton: {
    backgroundColor: '#FF9800',
    marginBottom: 15,
  },
  signOutButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  userText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});

export default AuthTestScreen; 