import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@env';

interface SimpleTypingIndicatorProps {
  style?: any;
  dotColor?: string;
  fontSize?: number;
}

const SimpleTypingIndicator: React.FC<SimpleTypingIndicatorProps> = ({ 
  style,
  dotColor = COLORS.TEXT.SECONDARY,
  fontSize = 14 
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.text, { color: dotColor, fontSize }]}>
        Escribiendo...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  text: {
    fontStyle: 'italic',
  },
});

export default SimpleTypingIndicator;