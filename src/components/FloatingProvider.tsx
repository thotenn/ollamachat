import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@env';
import { COMMON_STYLES, TYPOGRAPHY } from '../styles/GlobalStyles';

interface FloatingProviderProps {
  isConnected: boolean;
  providerName?: string;
  hasContext?: boolean;
}

const FloatingProvider: React.FC<FloatingProviderProps> = ({
  isConnected,
  providerName,
  hasContext = false,
}) => {
  return (
    <View style={styles.floatingStatus}>
      <View style={[COMMON_STYLES.statusDot, { backgroundColor: isConnected ? COLORS.SUCCESS : COLORS.ERROR }]} />
      <Text style={TYPOGRAPHY.STATUS_TEXT}>{providerName || 'No provider'}</Text>
      {hasContext && (
        <View style={styles.contextIndicator}>
          <Ionicons name="link" size={12} color={COLORS.PRIMARY} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  floatingStatus: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 95 : 85, // Adjust based on header height and platform
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Semi-transparent white
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 20,
    shadowColor: COLORS.SHADOW.DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)', // Semi-transparent border
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(10px)', // Blur effect for web
    }),
  },
  contextIndicator: {
    marginLeft: 8,
    padding: 2,
  },
});

export default FloatingProvider;
