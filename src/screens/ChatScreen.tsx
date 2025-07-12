import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomChat, { ChatMessage } from '../components/CustomChat';
import ollamaService from '../services/ollamaService';
import databaseService from '../services/databaseService';
import { useSettings } from '../contexts/SettingsContext';
import { ChatMessageDB } from '../types';

interface ChatScreenProps {
  conversationId?: string;
  onConversationChange?: (conversationId: string) => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ 
  conversationId, 
  onConversationChange 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { settings, isConnected } = useSettings();
  const [context, setContext] = useState<number[] | undefined>();
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        await databaseService.initDatabase();
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };
    initDatabase();
  }, []);

  useEffect(() => {
    if (conversationId && conversationId !== currentConversationId) {
      loadConversation(conversationId);
    } else if (!conversationId) {
      startNewConversation();
    }
  }, [conversationId, settings.selectedModel]);

  const loadConversation = async (convId: string) => {
    try {
      const conversation = await databaseService.getConversationById(convId);
      if (conversation) {
        const conversationMessages = await databaseService.getConversationMessages(convId);
        console.log('Loaded messages:', conversationMessages.length);
        setMessages(conversationMessages);
        setCurrentConversationId(convId);
        setMessageCount(conversationMessages.length);
        
        // Load context if available
        if (conversation.context) {
          try {
            const parsedContext = JSON.parse(conversation.context);
            setContext(parsedContext);
          } catch (e) {
            console.error('Error parsing context:', e);
            setContext(undefined);
          }
        } else {
          setContext(undefined);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      Alert.alert('Error', 'Failed to load conversation');
    }
  };

  const startNewConversation = () => {
    setMessages([
      {
        id: '1',
        text: `¡Hola! Soy tu asistente con ${settings.selectedModel}. ¿En qué puedo ayudarte hoy?`,
        timestamp: new Date(),
        isUser: false,
      },
    ]);
    setCurrentConversationId(undefined);
    setContext(undefined);
    setMessageCount(0);
  };

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
      // Create or get conversation ID
      let conversationId = currentConversationId;
      const isFirstMessage = messageCount === 0;
      
      if (!conversationId && isFirstMessage) {
        // Create new conversation
        const now = new Date().toISOString();
        conversationId = await databaseService.createConversation({
          title: 'New Conversation', // Temporary title
          createdAt: now,
          updatedAt: now,
          model: settings.selectedModel,
        });
        setCurrentConversationId(conversationId);
        onConversationChange?.(conversationId);
      }

      let currentOrder = messageCount;

      // Save user message
      if (conversationId) {
        currentOrder += 1;
        const userMessageDB: ChatMessageDB = {
          id: userMessage.id,
          conversationId,
          text: userMessage.text,
          isUser: true,
          timestamp: userMessage.timestamp.toISOString(),
          order: currentOrder,
        };
        await databaseService.saveMessage(userMessageDB);
        setMessageCount(currentOrder);
      }

      let fullResponse = '';
      
      console.log('Sending message with context:', context ? `${context.length} tokens` : 'no context');
      
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
        async (newContext?: number[]) => {
          setIsTyping(false);
          
          // Update context for next conversation
          if (newContext) {
            console.log('Updating context with', newContext.length, 'tokens');
            setContext(newContext);
          }

          // Save AI response
          if (conversationId && fullResponse) {
            currentOrder += 1;
            const aiMessageDB: ChatMessageDB = {
              id: tempMessage.id,
              conversationId,
              text: fullResponse,
              isUser: false,
              timestamp: tempMessage.timestamp.toISOString(),
              order: currentOrder,
            };
            await databaseService.saveMessage(aiMessageDB);
            setMessageCount(currentOrder);

            // Update conversation with context and timestamp
            await databaseService.updateConversation(conversationId, {
              updatedAt: new Date().toISOString(),
              context: newContext ? JSON.stringify(newContext) : undefined,
            });

            // Generate title for first message
            if (isFirstMessage) {
              try {
                const title = await ollamaService.generateChatTitle(text, settings.selectedModel);
                await databaseService.updateConversation(conversationId, { title });
                console.log('Generated title:', title);
              } catch (error) {
                console.error('Error generating title:', error);
              }
            }
          }
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
  }, [isConnected, settings.selectedModel, context, currentConversationId, messageCount, onConversationChange]);

  const handleClearConversation = useCallback(() => {
    console.log('Clear conversation button pressed, Platform:', Platform.OS);
    
    const clearConversation = () => {
      console.log('Clearing conversation...');
      startNewConversation();
      onConversationChange?.(undefined);
    };

    if (Platform.OS === 'web') {
      // En web, usar confirm nativo
      console.log('Using web confirm dialog');
      if (window.confirm('¿Estás seguro de que quieres iniciar una nueva conversación? Se perderá el contexto actual.')) {
        clearConversation();
      }
    } else {
      // En móvil, usar Alert de React Native
      console.log('Using mobile Alert dialog');
      Alert.alert(
        'Nueva Conversación',
        '¿Estás seguro de que quieres iniciar una nueva conversación? Se perderá el contexto actual.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Confirmar',
            style: 'destructive',
            onPress: clearConversation,
          },
        ]
      );
    }
  }, [onConversationChange]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ollama Chat</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.newChatButton}
            onPress={handleClearConversation}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel="Nueva conversación"
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
            <Text style={styles.statusText}>{settings.selectedModel}</Text>
            {context && (
              <View style={styles.contextIndicator}>
                <Ionicons name="link" size={12} color="#007AFF" />
              </View>
            )}
          </View>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newChatButton: {
    marginRight: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      userSelect: 'none',
    }),
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
  contextIndicator: {
    marginLeft: 8,
    padding: 2,
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