import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@env';

const CorsWarning: React.FC = () => {
  if (Platform.OS !== 'web') {
    return null; // Solo mostrar en web
  }

  return (
    <View style={styles.container}>
      <Ionicons name="information-circle" size={20} color={COLORS.CORS.WARNING_ICON} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>Información sobre APIs Web</Text>
        <Text style={styles.description}>
          Para usar APIs externas (Anthropic, OpenAI, Gemini) en web durante desarrollo, 
          necesitas configurar un proxy CORS.
        </Text>
        <Text style={styles.instruction}>
          Ejecuta: <Text style={styles.code}>npm run cors-proxy</Text> en otra terminal
        </Text>
        <Text style={styles.note}>
          En aplicaciones móviles (iOS/Android) las APIs funcionan directamente.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.CORS.BACKGROUND,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.CORS.BORDER,
  },
  textContainer: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.CORS.TITLE,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: COLORS.CORS.TEXT,
    marginBottom: 4,
    lineHeight: 16,
  },
  instruction: {
    fontSize: 12,
    color: COLORS.CORS.TEXT,
    marginBottom: 4,
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: COLORS.CORS.CODE_BG,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  note: {
    fontSize: 11,
    color: COLORS.CORS.NOTE,
    fontStyle: 'italic',
  },
});

export default CorsWarning;