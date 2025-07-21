import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '@env';

interface TypingIndicatorProps {
  style?: any;
  dotColor?: string;
  fontSize?: number;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  style,
  dotColor = COLORS.TEXT.SECONDARY,
  fontSize = 14 
}) => {
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDots = () => {
      const duration = 600;
      const delay = 200;

      const animateSequence = Animated.sequence([
        // Animar punto 1
        Animated.timing(dot1Opacity, {
          toValue: 1,
          duration: duration,
          useNativeDriver: false,
        }),
        
        // Animar punto 2 mientras punto 1 baja
        Animated.parallel([
          Animated.timing(dot1Opacity, {
            toValue: 0.3,
            duration: duration,
            useNativeDriver: false,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 1,
            duration: duration,
            useNativeDriver: false,
          }),
        ]),
        
        // Animar punto 3 mientras punto 2 baja
        Animated.parallel([
          Animated.timing(dot2Opacity, {
            toValue: 0.3,
            duration: duration,
            useNativeDriver: false,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 1,
            duration: duration,
            useNativeDriver: false,
          }),
        ]),
        
        // Resetear punto 3
        Animated.timing(dot3Opacity, {
          toValue: 0.3,
          duration: duration,
          useNativeDriver: false,
        }),
        
        // Pequeña pausa antes de reiniciar
        Animated.delay(delay),
      ]);

      Animated.loop(animateSequence).start();
    };

    animateDots();
  }, [dot1Opacity, dot2Opacity, dot3Opacity]);

  return (
    <View style={[styles.container, style]}>
      <Animated.Text style={[styles.dot, { opacity: dot1Opacity, color: dotColor, fontSize }]}>
        •
      </Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: dot2Opacity, color: dotColor, fontSize }]}>
        •
      </Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: dot3Opacity, color: dotColor, fontSize }]}>
        •
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    marginHorizontal: 2,
    fontWeight: 'bold',
  },
});

export default TypingIndicator;
