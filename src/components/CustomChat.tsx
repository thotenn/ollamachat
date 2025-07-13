import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MessageRenderer from './MessageRenderer';
import TypingIndicator from './TypingIndicator';
import { COLORS } from '@env';

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
  pending?: boolean;
}

interface CustomChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isTyping?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const CustomChat: React.FC<CustomChatProps> = ({
  messages,
  onSendMessage,
  isTyping = false,
  placeholder = "Escribe un mensaje...",
  disabled = false,
}) => {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
        // Ensure the list is scrolled to show the latest messages
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 150);
      });
      const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
        // Keyboard hidden
      });

      return () => {
        keyboardDidShowListener?.remove();
        keyboardDidHideListener?.remove();
      };
    }
  }, []);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
      // Scroll to top after sending message
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  };

  const handleInputFocus = () => {
    if (Platform.OS === 'android') {
      // On Android, scroll to top when input is focused
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 300);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (!item.text.trim() || item.pending) {
      return null;
    }
    
    return (
      <View style={[
        styles.messageContainer,
        item.isUser ? styles.userMessage : styles.botMessage
      ]}>
        <View style={[
          styles.messageBubble,
          item.isUser ? styles.userBubble : styles.botBubble
        ]}>
          <MessageRenderer text={item.text} isUser={item.isUser} />
          <Text style={[
            styles.timestamp,
            item.isUser ? styles.userTimestamp : styles.botTimestamp
          ]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    
    return (
      <View style={[styles.messageContainer, styles.botMessage]}>
        <View style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
          <TypingIndicator style={styles.typingIndicator} />
        </View>
      </View>
    );
  };

  return (
    <>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView 
          style={styles.container}
          behavior="padding"
          keyboardVerticalOffset={90}
        >
          <ChatContent
            isTyping={isTyping}
            disabled={disabled}
            flatListRef={flatListRef}
            messages={messages}
            renderMessage={renderMessage}
            renderTypingIndicator={renderTypingIndicator}
            inputText={inputText}
            setInputText={setInputText}
            handleSend={handleSend}
            handleInputFocus={handleInputFocus}
            placeholder={placeholder}
          />
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.container, styles.androidContainer]}>
          <ChatContent
            isTyping={isTyping}
            disabled={disabled}
            flatListRef={flatListRef}
            messages={messages}
            renderMessage={renderMessage}
            renderTypingIndicator={renderTypingIndicator}
            inputText={inputText}
            setInputText={setInputText}
            handleSend={handleSend}
            handleInputFocus={handleInputFocus}
            placeholder={placeholder}
          />
        </View>
      )}
    </>
  );
};

const ChatContent: React.FC<{
  isTyping?: boolean;
  disabled: boolean;
  flatListRef: React.RefObject<FlatList | null>;
  messages: ChatMessage[];
  renderMessage: ({ item }: { item: ChatMessage }) => React.ReactElement | null;
  renderTypingIndicator: () => React.ReactElement | null;
  inputText: string;
  setInputText: (text: string) => void;
  handleSend: () => void;
  handleInputFocus: () => void;
  placeholder: string;
}> = ({
  isTyping = false,
  disabled,
  flatListRef,
  messages,
  renderMessage,
  renderTypingIndicator,
  inputText,
  setInputText,
  handleSend,
  handleInputFocus,
  placeholder,
}) => {
  return (
    <>
      {disabled && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning-outline" size={16} color={COLORS.TEXT.SECONDARY} />
          <Text style={styles.warningText}>No conectado al proveedor de IA. Conéctate para enviar mensajes.</Text>
        </View>
      )}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        inverted
        ListHeaderComponent={renderTypingIndicator}
        showsVerticalScrollIndicator={false}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.textInput, disabled && styles.textInputDisabled]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={disabled ? (isTyping ? "Answering..." : "Conecta con un proveedor de IA para enviar mensajes") : placeholder}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSend}
          submitBehavior="newline"
          editable={!disabled}
          onFocus={handleInputFocus}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || disabled) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || disabled}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={(inputText.trim() && !disabled) ? COLORS.PRIMARY : COLORS.BORDER.LIGHT} 
          />
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.LIGHTER,
  },
  androidContainer: {
    flex: 1,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.LIGHT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.DEFAULT,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    flex: 1,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginVertical: 4,
    width: '100%',
    flexDirection: 'row',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  botMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    ...(Platform.OS === 'android' ? {
      maxWidth: '75%',
      width: 'auto',
    } : {
      maxWidth: '85%',
      flexShrink: 1,
    }),
    minWidth: '20%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: COLORS.PRIMARY,
  },
  botBubble: {
    backgroundColor: COLORS.BACKGROUND.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER.DEFAULT,
  },
  typingBubble: {
    backgroundColor: COLORS.BACKGROUND.TYPING,
    paddingVertical: 12,
    minHeight: 'auto',
    maxWidth: '70%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: COLORS.TEXT.WHITE,
  },
  botText: {
    color: COLORS.TEXT.DARK,
  },
  typingText: {
    color: COLORS.TEXT.SECONDARY,
    fontStyle: 'italic',
    fontSize: 14,
  },
  typingIndicator: {
    paddingVertical: 2,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: COLORS.TRANSPARENCY.WHITE_70,
  },
  botTimestamp: {
    color: COLORS.TEXT.TERTIARY,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.BACKGROUND.WHITE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.DEFAULT,
    ...(Platform.OS === 'android' && {
      paddingBottom: 12,
    }),
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.BORDER.DEFAULT,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: COLORS.BACKGROUND.LIGHT,
  },
  textInputDisabled: {
    backgroundColor: COLORS.BACKGROUND.LIGHTER,
    color: COLORS.TEXT.TERTIARY,
    opacity: 0.7,
  },
  sendButton: {
    marginLeft: 12,
    padding: 10,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default CustomChat;