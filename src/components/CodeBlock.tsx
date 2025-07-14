import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '@env';

// Función mejorada para copiar al clipboard
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
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          const result = document.execCommand('copy');
          document.body.removeChild(textArea);
          return result;
        } catch (err) {
          document.body.removeChild(textArea);
          return false;
        }
      }
    } else {
      // Para React Native, usar expo-clipboard
      await Clipboard.setStringAsync(text);
      return true;
    }
  } catch (error) {
    console.warn('Error copying to clipboard:', error);
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
          // En móvil, feedback visual sin alert que puede causar problemas
          setTimeout(() => setCopied(false), 2000);
        }
      } else {
        // En caso de error, mostrar feedback pero sin crash
        console.warn('No se pudo copiar el código');
        if (Platform.OS !== 'web') {
          // Solo mostrar alert en casos específicos y controlados
          Alert.alert('Información', 'No se pudo copiar el código. Inténtalo de nuevo.');
        }
      }
    } catch (error) {
      console.error('Error en handleCopy:', error);
      // No mostrar alert en caso de error para evitar crashes
      // Solo log del error para debugging
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
