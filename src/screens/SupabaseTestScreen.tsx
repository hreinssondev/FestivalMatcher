import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../utils/supabase';
import { DeviceAuthService } from '../services/deviceAuthService';

const SupabaseTestScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testConnection = async () => {
    setLoading(true);
    addResult('Testing Supabase connection...');
    
    try {
      // Test basic connection
      const { data, error } = await supabase.from('users').select('count').limit(1);
      
      if (error) {
        addResult(`❌ Connection failed: ${error.message}`);
        if (error.code === 'PGRST116') {
          addResult('ℹ️ Table exists but is empty (this is normal)');
        } else if (error.message.includes('relation "users" does not exist')) {
          addResult('❌ Users table does not exist - run supabase-setup.sql');
        } else if (error.message.includes('permission denied')) {
          addResult('❌ Permission denied - check RLS policies');
        }
      } else {
        addResult('✅ Supabase connection successful');
      }
    } catch (error) {
      addResult(`❌ Connection error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testTableSchema = async () => {
    setLoading(true);
    addResult('Testing table schema...');
    
    try {
      // Test if we can insert a test record
      const testData = {
        id: `test_${Date.now()}`,
        name: 'Test User',
        age: 25,
        gender: 'Male',
        festival: 'Test Festival',
        ticket_type: 'VIP',
        accommodation_type: 'Hotel',
        interests: ['Music'],
        photos: [],
        last_active: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('users')
        .insert(testData)
        .select()
        .single();

      if (error) {
        addResult(`❌ Schema error: ${error.message}`);
        if (error.message.includes('column "gender" does not exist')) {
          addResult('❌ Gender column missing - update database schema');
        } else if (error.message.includes('violates not-null constraint')) {
          addResult('❌ Missing required fields - check schema');
        }
      } else {
        addResult('✅ Schema test successful');
        
        // Clean up test data
        await supabase.from('users').delete().eq('id', testData.id);
        addResult('✅ Test data cleaned up');
      }
    } catch (error) {
      addResult(`❌ Schema test error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testDeviceAuth = async () => {
    setLoading(true);
    addResult('Testing device authentication...');
    try {
      const deviceUserId = await DeviceAuthService.getDeviceUserId();
      addResult(`✅ Device ID: ${deviceUserId}`);
      
      // Check if it's a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(deviceUserId)) {
        addResult('✅ Device ID is a valid UUID');
      } else {
        addResult('❌ Device ID is NOT a valid UUID - clearing old data');
        await DeviceAuthService.clearDeviceData();
        const newDeviceUserId = await DeviceAuthService.getDeviceUserId();
        addResult(`✅ New Device ID: ${newDeviceUserId}`);
      }
          } catch (error) {
        addResult(`❌ Device auth error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
      setLoading(false);
    }
  };

  const clearDeviceData = async () => {
    setLoading(true);
    addResult('Clearing device data...');
    try {
      await DeviceAuthService.clearDeviceData();
      addResult('✅ Device data cleared successfully');
    } catch (error) {
      addResult(`❌ Error clearing device data: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const forceRecreateUser = async () => {
    setLoading(true);
    addResult('Force recreating user...');
    try {
      const result = await DeviceAuthService.forceRecreateUser();
      if (result.error) {
        addResult(`❌ Force recreate failed: ${result.error instanceof Error ? result.error.message : String(result.error)}`);
      } else {
        addResult('✅ User force recreated successfully');
      }
    } catch (error) {
      addResult(`❌ Force recreate error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const testProfileUpdate = async () => {
    setLoading(true);
    addResult('Testing profile update...');
    
    try {
      const updateResult = await DeviceAuthService.updateUserProfile({
        name: 'Test User',
        age: 25,
        gender: 'Male',
        festival: 'Test Festival',
        ticket_type: 'VIP',
        accommodation_type: 'Hotel',
        interests: ['Music'],
        photos: [],
      });
      
      if (updateResult.error) {
        addResult(`❌ Profile update failed: ${updateResult.error instanceof Error ? updateResult.error.message : String(updateResult.error)}`);
      } else {
        addResult('✅ Profile update successful');
      }
    } catch (error) {
      addResult(`❌ Profile update error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Diagnostic Tool</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={testConnection}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Testing...' : 'Test Connection'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={testTableSchema}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Testing...' : 'Test Schema'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={testDeviceAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Testing...' : 'Test Device Auth'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={testProfileUpdate}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Testing...' : 'Test Profile Update'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={clearDeviceData}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Clearing...' : 'Clear Device Data'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={forceRecreateUser}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Recreating...' : 'Force Recreate User'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>{result}</Text>
        ))}
        {results.length === 0 && (
          <Text style={styles.noResults}>No test results yet. Run a test to see diagnostics.</Text>
        )}
      </ScrollView>
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
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#2D2D2D',
    borderRadius: 10,
    padding: 15,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  noResults: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default SupabaseTestScreen;
