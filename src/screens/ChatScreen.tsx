import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomChat, { ChatMessage } from '../components/CustomChat';
import CustomChatBasic from '../components/CustomChatBasic';
import AssistantModal from '../components/AssistantModal';
import FloatingProvider from '../components/FloatingProvider';
import MessageMenu from '../components/MessageMenu';
import providerService from '../services/providerService';
import databaseService from '../services/databaseService';
import { useSettings } from '../contexts/SettingsContext';
import { ChatMessageDB } from '../types';
import { useCommonAlert } from '../hooks/useCommonAlert';
import { COLORS } from '@env';
import { COMMON_STYLES, TYPOGRAPHY, createTextStyle } from '../styles/GlobalStyles';
// import { setStringAsync } from 'expo-clipboard';

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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [messageMenuVisible, setMessageMenuVisible] = useState(false);
  
  const { showAlert, AlertComponent } = useCommonAlert();

  // Database is initialized in SettingsContext, no need to do it here

  useEffect(() => {
    if (Platform.OS === 'android') {
      const keyboardDidShowListener = Keyboard.addListener(
        'keyboardDidShow',
        () => setKeyboardVisible(true)
      );
      const keyboardDidHideListener = Keyboard.addListener(
        'keyboardDidHide',
        () => setKeyboardVisible(false)
      );

      return () => {
        keyboardDidShowListener.remove();
        keyboardDidHideListener.remove();
      };
    }
  }, []);

  useEffect(() => {
    if (conversationId && conversationId !== currentConversationId) {
      // Cerrar el menú de mensaje cuando cambie la conversación
      setMessageMenuVisible(false);
      setSelectedMessage(null);
      loadConversation(conversationId);
    } else if (!conversationId) {
      // Cerrar el menú de mensaje cuando se inicie una nueva conversación
      setMessageMenuVisible(false);
      setSelectedMessage(null);
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
      showAlert({
        title: 'Error',
        message: 'Failed to load conversation',
        buttons: [{ text: 'OK' }]
      });
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
      // For clear topic changes (greetings, short messages), send NO context
      // For partial topic changes, limit context heavily
      const isCompleteTopicChange = currentPrompt.trim().split(/\s+/).length <= 3 || 
        /^(hi|hello|hey|hola|thanks|gracias|ok|okay|bien|vale|claro)(\s+.*)?$/i.test(currentPrompt.trim());
      
      if (isCompleteTopicChange) {
        historyLimit = 0; // No context at all
      } else {
        historyLimit = 2; // Minimal context
      }
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
    
    const currentLower = currentPrompt.toLowerCase().trim();
    const currentWords = currentLower.split(/\s+/).filter(word => word.length > 0);
    
    // 1. Very short messages (1-3 words) are usually casual/standalone
    if (currentWords.length <= 3) {
      return true;
    }
    
    // 2. Common greeting patterns (language agnostic)
    const greetingPatterns = [
      /^(hi|hello|hey|hola|bonjour|hallo|ciao|salut)/,
      /how\s+(are\s+you|you\s+doing|is\s+it\s+going)/,
      /(como\s+estas|que\s+tal|como\s+va)/,
      /^(good\s+morning|good\s+afternoon|good\s+evening)/,
      /^(buenos?\s+dias?|buenas?\s+tardes?|buenas?\s+noches?)/,
      /^(thanks?|thank\s+you|gracias|merci|danke)/,
      /^(ok|okay|alright|bien|vale|claro|perfect|perfecto)/
    ];
    
    const isGreeting = greetingPatterns.some(pattern => pattern.test(currentLower));
    if (isGreeting) {
      return true;
    }
    
    // 3. Meta questions about the AI
    const metaQuestions = [
      /(what|who|which)\s+(are\s+you|model|version)/,
      /(que|quien|cual)\s+(eres|modelo|version)/,
      /tell\s+me\s+about\s+(yourself|you)/,
      /(dime|cuentame)\s+(sobre|de)\s+(ti|tu)/
    ];
    
    const isMetaQuestion = metaQuestions.some(pattern => pattern.test(currentLower));
    if (isMetaQuestion) {
      return true;
    }
    
    // 4. Explicit topic change indicators
    const topicChangeIndicators = [
      /but\s+(now|let)/,
      /(pero|sin\s+embargo|ahora)/,
      /(by\s+the\s+way|speaking\s+of|anyway)/,
      /(por\s+cierto|a\s+proposito|cambiando\s+de\s+tema)/,
      /(different|another|new)\s+(question|topic|subject)/,
      /(otra|nueva|diferente)\s+(pregunta|tema|cuestion)/
    ];
    
    const hasTopicChangeIndicator = topicChangeIndicators.some(pattern => pattern.test(currentLower));
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
      showAlert({
        title: 'Sin conexión',
        message: 'No se puede conectar con el proveedor de IA',
        buttons: [{ text: 'OK' }]
      });
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
      // Obtener mensajes actuales para evitar stale closure
      let messageHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      setMessages(currentMessages => {
        const previousMessages = currentMessages.filter(msg => !msg.id.startsWith('temp-'));
        messageHistory = buildMessageHistory(previousMessages, text);
        return currentMessages; // No cambiar el estado, solo leer
      });
      
      
      
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
          // Update immediately for real-time streaming
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
          
          // Final update with complete response
          setMessages(previousMessages => {
            return previousMessages.map(message => 
              message.id === tempMessage.id 
                ? { ...message, text: fullResponse }
                : message
            );
          });
          
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
      console.error('Error sending message:', error);
      
      // More specific error handling
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const isMemoryError = errorMessage.toLowerCase().includes('memory') || 
                           errorMessage.toLowerCase().includes('allocation') ||
                           errorMessage.toLowerCase().includes('heap');
      
      showAlert({
        title: 'Error',
        message: isMemoryError 
          ? 'La respuesta es demasiado larga. Intenta con una pregunta más específica.'
          : 'No se pudo enviar el mensaje. Verifica tu conexión.',
        buttons: [{ text: 'OK' }]
      });
      
      setIsTyping(false);
      
      setMessages(previousMessages => 
        previousMessages.filter(msg => msg.id !== tempMessage.id)
      );
    }
  }, [isConnected, settings.selectedModel, context, currentConversationId, messageCount, onConversationChange, currentProvider, currentAssistant]);

  const handleClearConversation = useCallback(() => {
    
    const clearConversation = () => {
      // Cerrar el menú de mensaje antes de limpiar la conversación
      setMessageMenuVisible(false);
      setSelectedMessage(null);
      startNewConversation();
      onConversationChange?.(undefined);
    };

    showAlert({
      title: 'Nueva Conversación',
      message: '¿Estás seguro de que quieres iniciar una nueva conversación? Se perderá el contexto actual.',
      buttons: [
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
    });
  }, [onConversationChange]);

  const handleMessagePress = (message: ChatMessage) => {
    setSelectedMessage(message);
    setMessageMenuVisible(true);
  };

  const handleCopyMessage = async () => {
    if (selectedMessage) {
      // TODO: Implementar funcionalidad de copia más tarde
      console.log('Copia solicitada para:', selectedMessage.text);
    }
    setMessageMenuVisible(false);
    setSelectedMessage(null);
  };

  const handleCloseMessageMenu = () => {
    setMessageMenuVisible(false);
    setSelectedMessage(null);
  };

  const handleAssistantChange = async (assistantId: string) => {
    try {
      await updateSettings({ selectedAssistantId: assistantId });
      setAssistantModalVisible(false);
    } catch (error) {
    }
  };

  return (
    <SafeAreaView 
      style={[COMMON_STYLES.screenContainer, Platform.OS === 'android' && styles.androidContainer]}
      edges={Platform.OS === 'android' && !keyboardVisible ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']}
    >
      <View style={COMMON_STYLES.header}>
        <View style={COMMON_STYLES.headerLeft}>
          <Text style={TYPOGRAPHY.HEADER_TITLE}>AI Chat</Text>
        </View>
        <View style={COMMON_STYLES.headerRight}>
          <TouchableOpacity 
            style={styles.assistantSelector}
            onPress={() => setAssistantModalVisible(true)}
          >
            <Ionicons name="chevron-down" size={16} color={COLORS.TEXT.SECONDARY} />
            <Text style={createTextStyle(TYPOGRAPHY.HEADER_SUBTITLE, { marginTop: 0, marginRight: 4 })}>{currentAssistant?.name || 'Asistente'}</Text>
          </TouchableOpacity>
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
        </View>
      </View>

      {/* Message Menu */}
      {messageMenuVisible && (
        <MessageMenu
          visible={messageMenuVisible}
          onCopy={handleCopyMessage}
          onClose={handleCloseMessageMenu}
        />
      )}

      {/* Floating Status Component */}
      <FloatingProvider
        isConnected={isConnected}
        providerName={currentProvider?.name}
        hasContext={!!context}
      />

      <CustomChatBasic
        messages={messages}
        onSendMessage={handleSendMessage}
        onMessagePress={handleMessagePress}
        isTyping={isTyping}
        placeholder="Escribe un mensaje..."
        disabled={!isConnected || isTyping}
      />

      {/* Assistant Selection Modal */}
      <AssistantModal
        visible={assistantModalVisible}
        assistants={assistants}
        selectedAssistantId={settings.selectedAssistantId}
        onClose={() => setAssistantModalVisible(false)}
        onAssistantChange={handleAssistantChange}
      />
      
      {AlertComponent}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  androidContainer: {
    // For Android: avoid bottom padding but maintain proper layout
    ...(Platform.OS === 'android' && {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND.LIGHTER,
    }),
  },
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
});

export default ChatScreen;