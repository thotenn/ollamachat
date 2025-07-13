import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity, Platform, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomChat, { ChatMessage } from '../components/CustomChat';
import providerService from '../services/providerService';
import databaseService from '../services/databaseService';
import { useSettings } from '../contexts/SettingsContext';
import { ChatMessageDB } from '../types';
import { COLORS } from '@env';
import { COMMON_STYLES, TYPOGRAPHY, createTextStyle } from '../styles/GlobalStyles';

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
        setMessages(conversationMessages);
        setCurrentConversationId(convId);
        setMessageCount(conversationMessages.length);
        
        // Load context if available
        if (conversation.context) {
          try {
            const parsedContext = JSON.parse(conversation.context);
            setContext(parsedContext);
          } catch (e) {
            setContext(undefined);
          }
        } else {
          setContext(undefined);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load conversation');
    }
  };

  const startNewConversation = () => {
    const assistantName = currentAssistant?.name || 'Asistente';
    
    let welcomeMessage = `¡Hola! Soy ${assistantName}.`;
    
    if (isConnected && currentProvider && settings.selectedModel) {
      welcomeMessage += ` Estoy usando ${currentProvider.name} con el modelo ${settings.selectedModel}. ¿En qué puedo ayudarte hoy?`;
    } else {
      welcomeMessage += ` Conecta con un proveedor de IA para comenzar a chatear.`;
    }
    
    setMessages([
      {
        id: '1',
        text: welcomeMessage,
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
    } else {
      // For continuing conversation, use more context
      historyLimit = 10;
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

    // Agregar mensaje del usuario MANTENIENDO el historial
    setMessages(previousMessages => [userMessage, ...previousMessages]);
    setIsTyping(true);

    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      text: '',
      timestamp: new Date(),
      isUser: false,
    };

    // Agregar mensaje temporal MANTENIENDO el historial
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
      // Usar los mensajes ANTES de agregar el temporal para evitar incluirlo en el contexto
      const previousMessages = messages.filter(msg => !msg.id.startsWith('temp-'));
      const messageHistory = buildMessageHistory(previousMessages, text);
      
      
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
              } catch (error) {
              }
            }
          }
        }
      );

    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el mensaje');
      setIsTyping(false);
      
      setMessages(previousMessages => 
        previousMessages.filter(msg => msg.id !== tempMessage.id)
      );
    }
  }, [isConnected, settings.selectedModel, context, currentConversationId, messageCount, onConversationChange, currentProvider, currentAssistant, messages]);

  const handleClearConversation = useCallback(() => {
    
    const clearConversation = () => {
      startNewConversation();
      onConversationChange?.(undefined);
    };

    if (Platform.OS === 'web') {
      // En web, usar confirm nativo
      if (window.confirm('¿Estás seguro de que quieres iniciar una nueva conversación? Se perderá el contexto actual.')) {
        clearConversation();
      }
    } else {
      // En móvil, usar Alert de React Native
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
    }
  };

  return (
    <SafeAreaView style={COMMON_STYLES.screenContainer}>
      <View style={COMMON_STYLES.header}>
        <View style={COMMON_STYLES.headerLeft}>
          <Text style={TYPOGRAPHY.HEADER_TITLE}>AI Chat</Text>
          <TouchableOpacity 
            style={styles.assistantSelector}
            onPress={() => setAssistantModalVisible(true)}
          >
            <Text style={createTextStyle(TYPOGRAPHY.HEADER_SUBTITLE, { marginTop: 0, marginRight: 4 })}>{currentAssistant?.name || 'Asistente'}</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.TEXT.SECONDARY} />
          </TouchableOpacity>
        </View>
        <View style={COMMON_STYLES.headerRight}>
          <TouchableOpacity 
            style={styles.newChatButton}
            onPress={handleClearConversation}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel="Nueva conversación"
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          <View style={COMMON_STYLES.statusContainer}>
            <View style={[COMMON_STYLES.statusDot, { backgroundColor: isConnected ? COLORS.SUCCESS : COLORS.ERROR }]} />
            <Text style={TYPOGRAPHY.STATUS_TEXT}>{currentProvider?.name || 'No provider'}</Text>
            {context && (
              <View style={styles.contextIndicator}>
                <Ionicons name="link" size={12} color={COLORS.PRIMARY} />
              </View>
            )}
          </View>
        </View>
      </View>
      <CustomChat
        messages={messages}
        onSendMessage={handleSendMessage}
        isTyping={isTyping}
        placeholder="Escribe un mensaje..."
        disabled={!isConnected}
      />

      {/* Assistant Selection Modal */}
      <Modal
        visible={assistantModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={false}
      >
        <SafeAreaView style={COMMON_STYLES.modalContainer}>
          <View style={COMMON_STYLES.modalHeader}>
            <TouchableOpacity onPress={() => setAssistantModalVisible(false)}>
              <Text style={createTextStyle(TYPOGRAPHY.MODAL_BUTTON, { color: COLORS.TEXT.SECONDARY })}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={TYPOGRAPHY.MODAL_TITLE}>Seleccionar Asistente</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          
          <ScrollView style={COMMON_STYLES.modalContent}>
            {assistants.map((assistant) => (
              <TouchableOpacity
                key={assistant.id}
                style={[
                  COMMON_STYLES.selectableItem,
                  settings.selectedAssistantId === assistant.id && COMMON_STYLES.selectableItemSelected,
                ]}
                onPress={() => handleAssistantChange(assistant.id)}
              >
                <View style={COMMON_STYLES.itemMain}>
                  <Text
                    style={createTextStyle(TYPOGRAPHY.BODY_LARGE, {
                      color: settings.selectedAssistantId === assistant.id ? COLORS.PRIMARY : COLORS.TEXT.DARK,
                      fontWeight: settings.selectedAssistantId === assistant.id ? '600' : 'normal',
                      marginBottom: 4,
                    })}
                  >
                    {assistant.name}
                  </Text>
                  <Text style={TYPOGRAPHY.BODY_MEDIUM}>{assistant.description}</Text>
                </View>
                {settings.selectedAssistantId === assistant.id && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.PRIMARY} />
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
  assistantSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 4,
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
  contextIndicator: {
    marginLeft: 8,
    padding: 2,
  },
  modalPlaceholder: {
    width: 60,
  },
});

export default ChatScreen;