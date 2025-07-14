import React, { useState, useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BackHandler, Alert, Platform, ToastAndroid } from 'react-native';
import { SettingsProvider } from './src/contexts/SettingsContext';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const navigationRef = useRef<any>(null);
  
  // Back button handler state
  const [backButtonPressCount, setBackButtonPressCount] = useState(0);
  const backButtonTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    // Navigate to chat tab
    navigationRef.current?.navigate('Chat');
  };

  const handleConversationChange = (conversationId: string | undefined) => {
    setCurrentConversationId(conversationId);
  };

  // Back button handler
  useEffect(() => {
    const backAction = () => {
      // Handle double-tap to exit
      if (backButtonPressCount === 0) {
        setBackButtonPressCount(1);
        
        // Show toast message
        if (Platform.OS === 'android') {
          ToastAndroid.show('Presiona nuevamente para salir', ToastAndroid.SHORT);
        } else {
          // For iOS, you might want to use a different notification method
          Alert.alert('', 'Presiona nuevamente para salir');
        }

        // Reset counter after 2 seconds
        backButtonTimeout.current = setTimeout(() => {
          setBackButtonPressCount(0);
        }, 2000);

        return true; // Prevent default back behavior
      } else {
        // Second press - exit the app
        if (backButtonTimeout.current) {
          clearTimeout(backButtonTimeout.current);
        }
        return false; // Allow default back behavior (exit app)
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => {
      backHandler.remove();
      if (backButtonTimeout.current) {
        clearTimeout(backButtonTimeout.current);
      }
    };
  }, [backButtonPressCount]);

  return (
    <SettingsProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="auto" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap;

              if (route.name === 'Chat') {
                iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              } else if (route.name === 'History') {
                iconName = focused ? 'time' : 'time-outline';
              } else if (route.name === 'Settings') {
                iconName = focused ? 'settings' : 'settings-outline';
              } else {
                iconName = 'alert-circle';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: 'gray',
            headerShown: false,
          })}
        >
          <Tab.Screen 
            name="Chat"
            options={{ 
              title: 'Chat',
              tabBarLabel: 'Chat'
            }}
          >
            {() => (
              <ChatScreen 
                conversationId={currentConversationId}
                onConversationChange={handleConversationChange}
              />
            )}
          </Tab.Screen>
          <Tab.Screen 
            name="History"
            options={{ 
              title: 'History',
              tabBarLabel: 'History'
            }}
          >
            {() => (
              <HistoryScreen 
                onSelectConversation={handleSelectConversation}
              />
            )}
          </Tab.Screen>
          <Tab.Screen 
            name="Settings"
            options={{ 
              title: 'Settings',
              tabBarLabel: 'Settings'
            }}
          >
            {() => <SettingsScreen />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SettingsProvider>
  );
}