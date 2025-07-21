import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SimpleTypingIndicator from './SimpleTypingIndicator';
import SimpleMessageRenderer from './SimpleMessageRenderer';
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const flatListRef = useRef<FlatList>(null);

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

  const handleScroll = (event: any) => {
    const scrollOffset = event.nativeEvent.contentOffset.y;
    // Mostrar el botón cuando el usuario se desplace más de 100 píxeles hacia arriba
    setShowScrollButton(scrollOffset > 100);
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setShowScrollButton(false);
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
          <SimpleMessageRenderer text={item.text} isUser={item.isUser} />
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
        <View style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
          <SimpleTypingIndicator style={styles.typingIndicator} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
        onScroll={handleScroll}
        scrollEventThrottle={16}
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

      {/* Botón de scroll to bottom sin animaciones */}
      {showScrollButton && (
        <View style={styles.scrollToBottomButton}>
          <TouchableOpacity 
            style={styles.scrollButtonTouchable}
            onPress={scrollToBottom}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-down" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>
      )}
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
  typingBubble: {
    backgroundColor: COLORS.BACKGROUND.TYPING || COLORS.BACKGROUND.WHITE,
    paddingVertical: 12,
    minHeight: 'auto',
    maxWidth: '70%',
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
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: COLORS.BACKGROUND.WHITE,
    borderRadius: 25,
    elevation: 4,
    shadowColor: COLORS.SHADOW?.DARK || '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: COLORS.BORDER.DEFAULT,
  },
  scrollButtonTouchable: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CustomChatBasic;