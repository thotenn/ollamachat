import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@env';

// Función alternativa para copiar al clipboard sin expo-clipboard
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      // Para web, usar la API nativa del navegador
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback para navegadores más antiguos
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          document.body.removeChild(textArea);
          return true;
        } catch (err) {
          document.body.removeChild(textArea);
          return false;
        }
      }
    } else {
      // Para React Native, intentar usar expo-clipboard si está disponible
      try {
        const Clipboard = require('expo-clipboard');
        await Clipboard.setStringAsync(text);
        return true;
      } catch (e) {
        // Si expo-clipboard no está disponible, usar @react-native-clipboard/clipboard
        try {
          const { Clipboard: RNClipboard } = require('@react-native-clipboard/clipboard');
          RNClipboard.setString(text);
          return true;
        } catch (e2) {
          return false;
        }
      }
    }
  } catch (error) {
    return false;
  }
};

interface CodeBlockProps {
  code: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const success = await copyToClipboard(code);
      
      if (success) {
        setCopied(true);
        
        if (Platform.OS === 'web') {
          // En web, solo feedback visual
          setTimeout(() => setCopied(false), 2000);
        } else {
          // En móvil, mostrar alerta
          Alert.alert('Copiado', 'Código copiado al portapapeles');
          setTimeout(() => setCopied(false), 2000);
        }
      } else {
        Alert.alert('Error', 'No se pudo copiar el código');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo copiar el código');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.language}>{language || 'código'}</Text>
        <TouchableOpacity 
          style={styles.copyButton} 
          onPress={handleCopy}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={copied ? "checkmark" : "copy-outline"} 
            size={16} 
            color={copied ? COLORS.SUCCESS : COLORS.TEXT.LIGHT} 
          />
          <Text style={[styles.copyText, copied && styles.copiedText]}>
            {copied ? 'Copiado' : 'Copiar'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.codeContainer}>
        <Text style={styles.codeText}>{code}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1e1e1e',
    ...(Platform.OS === 'android' ? {
      width: '100%',
      alignSelf: 'stretch',
    } : {
      width: '100%',
      maxWidth: '100%',
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  language: {
    color: '#a0a0a0',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  copyText: {
    color: '#a0a0a0',
    fontSize: 12,
    marginLeft: 4,
  },
  copiedText: {
    color: COLORS.SUCCESS,
  },
  codeContainer: {
    padding: 12,
    paddingBottom: 8,
    width: '100%',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    lineHeight: 20,
    color: '#f8f8f2',
    marginBottom: 0,
    ...(Platform.OS === 'android' ? {
      width: '100%',
    } : {
      flexWrap: 'wrap',
      overflow: 'hidden',
    }),
  },
});

export default CodeBlock;
