import React, { useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SettingsProvider } from './src/contexts/SettingsContext';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const navigationRef = useRef<any>(null);

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    // Navigate to chat tab
    navigationRef.current?.navigate('Chat');
  };

  const handleConversationChange = (conversationId: string | undefined) => {
    setCurrentConversationId(conversationId);
  };

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
            component={SettingsScreen} 
            options={{ 
              title: 'Settings',
              tabBarLabel: 'Settings'
            }} 
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SettingsProvider>
  );
}