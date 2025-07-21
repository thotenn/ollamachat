import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@env';

interface SafeCodeBlockProps {
  code: string;
  language?: string;
}

const SafeCodeBlock: React.FC<SafeCodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // TODO: Implementar funcionalidad de copia más tarde
      // Por ahora solo feedback visual
      setCopied(true);
      console.log('Código copiado:', code);
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error en handleCopy:', error);
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
            color={copied ? COLORS.SUCCESS || '#4CAF50' : COLORS.TEXT?.LIGHT || '#a0a0a0'} 
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
    width: '100%',
    alignSelf: 'stretch',
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
    color: COLORS.SUCCESS || '#4CAF50',
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
    width: '100%',
  },
});

export default SafeCodeBlock;