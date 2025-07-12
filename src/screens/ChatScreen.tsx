import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomChat, { ChatMessage } from '../components/CustomChat';
import ollamaService from '../services/ollamaService';
import { useSettings } from '../contexts/SettingsContext';

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { settings, isConnected } = useSettings();
  const [context, setContext] = useState<number[] | undefined>();

  useEffect(() => {
    setMessages([
      {
        id: '1',
        text: `¡Hola! Soy tu asistente con ${settings.selectedModel}. ¿En qué puedo ayudarte hoy?`,
        timestamp: new Date(),
        isUser: false,
      },
    ]);
  }, [settings.selectedModel]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!isConnected) {
      Alert.alert('Sin conexión', 'No se puede conectar con el servidor Ollama');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      timestamp: new Date(),
      isUser: true,
    };

    setMessages(previousMessages => [userMessage, ...previousMessages]);
    setIsTyping(true);

    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      text: '',
      timestamp: new Date(),
      isUser: false,
    };

    setMessages(previousMessages => [tempMessage, ...previousMessages]);

    try {
      let fullResponse = '';
      
      await ollamaService.streamResponse(
        {
          model: settings.selectedModel,
          prompt: text,
          context: context,
        },
        (chunk: string) => {
          fullResponse += chunk;
          setMessages(previousMessages => {
            return previousMessages.map(message => 
              message.id === tempMessage.id 
                ? { ...message, text: fullResponse }
                : message
            );
          });
        },
        () => {
          setIsTyping(false);
        }
      );

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
      setIsTyping(false);
      
      setMessages(previousMessages => 
        previousMessages.filter(msg => msg.id !== tempMessage.id)
      );
    }
  }, [isConnected, settings.selectedModel, context]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ollama Chat</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>{settings.selectedModel}</Text>
        </View>
      </View>
      {!isConnected ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="warning-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>No conectado al servidor Ollama</Text>
          <Text style={styles.emptySubtext}>Verifica la configuración</Text>
        </View>
      ) : (
        <CustomChat
          messages={messages}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
          placeholder="Escribe un mensaje..."
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

export default ChatScreen;