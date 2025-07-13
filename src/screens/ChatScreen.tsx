import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity, Platform, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomChat, { ChatMessage } from '../components/CustomChat';
import providerService from '../services/providerService';
import databaseService from '../services/databaseService';
import { useSettings } from '../contexts/SettingsContext';
import { ChatMessageDB } from '../types';

interface ChatScreenProps {
  conversationId?: string;
  onConversationChange?: (conversationId: string | undefined) => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ 
  conversationId, 
  onConversationChange 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { 
    settings, 
    isConnected, 
    assistants, 
    currentProvider, 
    currentAssistant,
    updateSettings 
  } = useSettings();
  const [context, setContext] = useState<number[] | undefined>();
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);
  const [messageCount, setMessageCount] = useState(0);
  const [assistantModalVisible, setAssistantModalVisible] = useState(false);

  // Database is initialized in SettingsContext, no need to do it here

  useEffect(() => {
    if (conversationId && conversationId !== currentConversationId) {
      loadConversation(conversationId);
    } else if (!conversationId) {
      startNewConversation();
    }
  }, [conversationId, settings.selectedModel, currentProvider, currentAssistant]);

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
    const assistantName = currentAssistant?.name || 'Asistente';
    const providerName = currentProvider?.name || 'IA';
    
    setMessages([
      {
        id: '1',
        text: `¡Hola! Soy ${assistantName} usando ${providerName} con el modelo ${settings.selectedModel}. ¿En qué puedo ayudarte hoy?`,
        timestamp: new Date(),
        isUser: false,
      },
    ]);
    setCurrentConversationId(undefined);
    setContext(undefined);
    setMessageCount(0);
  };

  // Helper function to build message history for context-aware providers
  const buildMessageHistory = (messages: ChatMessage[], currentPrompt: string): Array<{ role: 'user' | 'assistant'; content: string }> => {
    // Skip the welcome message and current temp message
    const conversationMessages = messages.filter(msg => 
      !msg.text.includes('¡Hola! Soy') && !msg.id.startsWith('temp-') && msg.text.trim() !== ''
    );

    // Detect if this is a topic change or continuation
    const isTopicChange = detectTopicChange(currentPrompt, conversationMessages);
    
    let historyLimit = 10; // Default
    
    if (isTopicChange) {
      // For topic changes, limit context to avoid confusion
      historyLimit = 4; // Only last 2 exchanges (4 messages)
      console.log('Topic change detected, limiting context to recent messages');
    } else {
      // For continuing conversation, use more context
      historyLimit = 10;
      console.log('Continuing topic, using full context');
    }

    // Convert to the format expected by APIs like Anthropic
    // Reverse to get chronological order (oldest first)
    const history = conversationMessages
      .slice(0, historyLimit)
      .reverse()
      .map(msg => ({
        role: msg.isUser ? 'user' : 'assistant' as 'user' | 'assistant',
        content: msg.text
      }));

    console.log(`Built message history with ${history.length} messages for context`);
    return history;
  };

  // Detect if the current prompt is changing topic
  const detectTopicChange = (currentPrompt: string, messages: ChatMessage[]): boolean => {
    if (messages.length === 0) return false;
    
    // Get last few user messages
    const recentUserMessages = messages
      .filter(msg => msg.isUser && msg.text.trim() !== '')
      .slice(0, 3)
      .map(msg => msg.text.toLowerCase());
    
    const currentLower = currentPrompt.toLowerCase();
    
    // Keywords that indicate topic change
    const topicChangeIndicators = [
      'pero', 'sin embargo', 'ahora', 'cambiando de tema', 'otra pregunta',
      'ya se que', 'aparte', 'por cierto', 'a propósito', 'hablando de otra cosa',
      'que modelo', 'eres claude', 'que version', 'quien eres', 'dime sobre ti'
    ];
    
    // Check if current prompt contains topic change indicators
    const hasTopicChangeIndicator = topicChangeIndicators.some(indicator => 
      currentLower.includes(indicator)
    );
    
    if (hasTopicChangeIndicator) {
      return true;
    }
    
    // Simple keyword overlap check
    if (recentUserMessages.length > 0) {
      const recentKeywords = recentUserMessages.join(' ').split(' ')
        .filter(word => word.length > 3)
        .slice(0, 10);
      
      const currentKeywords = currentLower.split(' ')
        .filter(word => word.length > 3);
      
      const overlap = currentKeywords.filter(word => 
        recentKeywords.some(recent => recent.includes(word) || word.includes(recent))
      ).length;
      
      // If very low keyword overlap, might be a topic change
      if (currentKeywords.length > 2 && overlap === 0) {
        return true;
      }
    }
    
    return false;
  };

  const handleSendMessage = useCallback(async (text: string) => {
    if (!isConnected || !currentProvider) {
      Alert.alert('Sin conexión', 'No se puede conectar con el proveedor de IA');
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
          providerId: currentProvider.id,
          assistantId: currentAssistant?.id || 'default-assistant',
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
      
      // Build message history for context-aware providers (like Anthropic)
      const messageHistory = buildMessageHistory(messages, text);
      
      console.log('Sending message with context:', context ? `${context.length} tokens` : 'no context');
      console.log('Message history length:', messageHistory.length);
      
      await providerService.streamResponse(
        currentProvider.id,
        {
          model: settings.selectedModel,
          prompt: text,
          context: context, // For Ollama
          messageHistory: messageHistory, // For Anthropic and others
          instructions: currentAssistant?.instructions,
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

            // Generate/update title for first 3 messages
            const userMessageCount = Math.floor((currentOrder + 1) / 2); // Each user message followed by AI response
            if (userMessageCount <= 3) {
              try {
                // Get the user messages so far (up to 3)
                const userMessages = await databaseService.getUserMessages(conversationId, 3);
                const conversationContext = userMessages.join(' ');
                
                const title = await providerService.generateChatTitle(currentProvider.id, conversationContext, settings.selectedModel);
                await databaseService.updateConversation(conversationId, { title });
                console.log(`Generated title (message ${userMessageCount}/3):`, title);
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
  }, [isConnected, settings.selectedModel, context, currentConversationId, messageCount, onConversationChange, currentProvider, currentAssistant]);

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

  const handleAssistantChange = async (assistantId: string) => {
    try {
      await updateSettings({ selectedAssistantId: assistantId });
      setAssistantModalVisible(false);
    } catch (error) {
      console.error('Error changing assistant:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>AI Chat</Text>
          <TouchableOpacity 
            style={styles.assistantSelector}
            onPress={() => setAssistantModalVisible(true)}
          >
            <Text style={styles.assistantName}>{currentAssistant?.name || 'Asistente'}</Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
        </View>
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
            <Text style={styles.statusText}>{currentProvider?.name || 'No provider'}</Text>
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
          <Text style={styles.emptyText}>No conectado al proveedor de IA</Text>
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

      {/* Assistant Selection Modal */}
      <Modal
        visible={assistantModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={false}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAssistantModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Seleccionar Asistente</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {assistants.map((assistant) => (
              <TouchableOpacity
                key={assistant.id}
                style={[
                  styles.assistantOption,
                  settings.selectedAssistantId === assistant.id && styles.assistantOptionSelected,
                ]}
                onPress={() => handleAssistantChange(assistant.id)}
              >
                <View style={styles.assistantOptionMain}>
                  <Text
                    style={[
                      styles.assistantOptionName,
                      settings.selectedAssistantId === assistant.id && styles.assistantOptionNameSelected,
                    ]}
                  >
                    {assistant.name}
                  </Text>
                  <Text style={styles.assistantOptionDescription}>{assistant.description}</Text>
                </View>
                {settings.selectedAssistantId === assistant.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  assistantSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 4,
  },
  assistantName: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCancel: {
    fontSize: 16,
    color: '#666',
  },
  modalPlaceholder: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  assistantOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  assistantOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  assistantOptionMain: {
    flex: 1,
  },
  assistantOptionName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  assistantOptionNameSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  assistantOptionDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default ChatScreen;