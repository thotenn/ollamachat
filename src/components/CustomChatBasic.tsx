import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@env';

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
  pending?: boolean;
}

interface CustomChatBasicProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onMessagePress?: (message: ChatMessage) => void;
  isTyping?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const CustomChatBasic: React.FC<CustomChatBasicProps> = ({
  messages,
  onSendMessage,
  onMessagePress,
  isTyping = false,
  placeholder = "Escribe un mensaje...",
  disabled = false,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (!item.text.trim() || item.pending) {
      return null;
    }
    
    return (
      <TouchableOpacity 
        style={[
          styles.messageContainer,
          item.isUser ? styles.userMessage : styles.botMessage
        ]}
        onPress={() => onMessagePress?.(item)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.messageBubble,
          item.isUser ? styles.userBubble : styles.botBubble
        ]}>
          <Text style={[
            styles.messageText,
            item.isUser ? styles.userText : styles.botText
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.timestamp,
            item.isUser ? styles.userTimestamp : styles.botTimestamp
          ]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    
    return (
      <View style={[styles.messageContainer, styles.botMessage]}>
        <View style={[styles.messageBubble, styles.botBubble]}>
          <Text style={styles.typingText}>Escribiendo...</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
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
          placeholder={disabled ? (isTyping ? "Answering..." : "Conecta con un proveedor de IA") : placeholder}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSend}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.LIGHTER,
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
    maxWidth: '85%',
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
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 0,
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

export default CustomChatBasic;