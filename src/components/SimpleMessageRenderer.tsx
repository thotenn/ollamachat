import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@env';

interface SimpleMessageRendererProps {
  text: string;
  isUser: boolean;
}

const SimpleMessageRenderer: React.FC<SimpleMessageRendererProps> = ({ text, isUser }) => {
  // Por ahora renderizamos solo texto plano, sin markdown ni bloques de código
  // Esto evita las APIs del DOM problemáticas
  
  const renderContent = () => {
    // Detectar si hay bloques de código y mostrarlos como texto simple
    const hasCodeBlocks = text.includes('```');
    
    if (hasCodeBlocks) {
      // Reemplazar bloques de código con texto plano
      const processedText = text
        .replace(/```(\w+)?\n?([\s\S]*?)```/g, '\n[CÓDIGO]\n$2\n[/CÓDIGO]\n')
        .replace(/`([^`]+)`/g, '[$1]'); // Código inline
      
      return (
        <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
          {processedText}
        </Text>
      );
    }

    return (
      <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
        {text}
      </Text>
    );
  };

  return <View style={styles.container}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 'auto',
    width: '100%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 0,
    flexWrap: 'wrap',
  },
  userText: {
    color: COLORS.TEXT.WHITE,
  },
  botText: {
    color: COLORS.TEXT.DARK,
  },
});

export default SimpleMessageRenderer;