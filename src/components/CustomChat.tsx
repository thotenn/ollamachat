import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MessageRenderer from './MessageRenderer';
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

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
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

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    
    return (
      <View style={[styles.messageContainer, styles.botMessage]}>
        <View style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
          <Text style={styles.typingText}>Escribiendo...</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
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
          placeholder={disabled ? "Conecta con un proveedor de IA para enviar mensajes" : placeholder}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSend}
          submitBehavior="newline"
          editable={!disabled}
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.LIGHTER,
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