import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import CodeBlock from './CodeBlock';
import { COLORS } from '@env';

interface MessageRendererProps {
  text: string;
  isUser: boolean;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ text, isUser }) => {
  // Regex para detectar bloques de código con ```
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  
  // Regex para código inline con `
  const inlineCodeRegex = /`([^`]+)`/g;

  const renderContent = () => {
    const parts = [];
    let lastIndex = 0;
    let match;

    // Buscar bloques de código
    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Agregar texto antes del bloque de código
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText.trim()) {
          parts.push(renderTextWithInlineCode(beforeText, parts.length));
        }
      }

      // Agregar bloque de código
      const language = match[1] || undefined;
      const code = match[2].trim();
      
      if (!isUser) { // Solo mostrar CodeBlock para mensajes del bot
        parts.push(
          <CodeBlock 
            key={`code-${parts.length}`}
            code={code}
            language={language}
          />
        );
      } else {
        // Para usuarios, mostrar como texto normal
        parts.push(
          <Text key={`text-${parts.length}`} style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
            {match[0]}
          </Text>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Agregar texto restante
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText.trim()) {
        parts.push(renderTextWithInlineCode(remainingText, parts.length));
      }
    }

    // Si no hay bloques de código, renderizar todo como texto
    if (parts.length === 0) {
      return renderTextWithInlineCode(text, 0);
    }

    return parts;
  };

  const renderTextWithInlineCode = (textContent: string, key: number) => {
    const parts = [];
    let lastIndex = 0;
    let match;

    // Solo procesar código inline para mensajes del bot
    if (!isUser) {
      const inlineRegex = new RegExp(inlineCodeRegex.source, inlineCodeRegex.flags);
      
      while ((match = inlineRegex.exec(textContent)) !== null) {
        // Agregar texto antes del código inline
        if (match.index > lastIndex) {
          const beforeText = textContent.substring(lastIndex, match.index);
          parts.push(
            <Text key={`text-${key}-${parts.length}`} style={[styles.messageText, styles.botText]}>
              {beforeText}
            </Text>
          );
        }

        // Agregar código inline
        parts.push(
          <Text key={`inline-${key}-${parts.length}`} style={[styles.messageText, styles.inlineCode]}>
            {match[1]}
          </Text>
        );

        lastIndex = match.index + match[0].length;
      }
    }

    // Agregar texto restante
    const remainingText = textContent.substring(lastIndex);
    if (remainingText || parts.length === 0) {
      parts.push(
        <Text key={`text-${key}-${parts.length}`} style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
          {remainingText || textContent}
        </Text>
      );
    }

    return parts.length === 1 ? parts[0] : <View key={key}>{parts}</View>;
  };

  return <View style={styles.container}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    ...(Platform.OS === 'android' ? {
      width: '100%',
      overflow: 'hidden',
    } : {
      flex: 1,
      minHeight: 'auto',
      width: '100%',
    }),
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 0,
    ...(Platform.OS === 'android' ? {
      width: '100%',
    } : {
      flexWrap: 'wrap',
    }),
  },
  userText: {
    color: COLORS.TEXT.WHITE,
  },
  botText: {
    color: COLORS.TEXT.DARK,
  },
  inlineCode: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    color: COLORS.TEXT.DARK,
  },
});

export default MessageRenderer;
