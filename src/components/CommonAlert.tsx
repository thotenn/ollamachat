import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, BackHandler, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommonModal from './CommonModal';
import { COLORS } from '@env';
import { COMMON_STYLES, TYPOGRAPHY, createTextStyle } from '../styles/GlobalStyles';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CommonAlertProps {
  visible: boolean;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  onRequestClose: () => void;
}

const CommonAlert: React.FC<CommonAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  onRequestClose,
}) => {
  useEffect(() => {
    if (!visible) return;

    const backAction = () => {
      // Find cancel button or first button
      const cancelButton = buttons.find(btn => btn.style === 'cancel');
      const buttonToPress = cancelButton || buttons[0];
      
      if (buttonToPress?.onPress) {
        buttonToPress.onPress();
      }
      onRequestClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => {
      backHandler.remove();
    };
  }, [visible, buttons, onRequestClose]);

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onRequestClose();
  };

  const getButtonTextColor = (style?: string) => {
    switch (style) {
      case 'destructive':
        return '#FF3B30';
      case 'cancel':
        return COLORS.TEXT.SECONDARY;
      default:
        return COLORS.PRIMARY;
    }
  };

  if (Platform.OS === 'web') {
    // On web, we still use the native confirm/alert for better UX
    // This component is mainly for mobile
    return null;
  }

  return (
    <CommonModal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          {title && (
            <Text style={styles.title}>{title}</Text>
          )}
          {message && (
            <Text style={styles.message}>{message}</Text>
          )}
          
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  index < buttons.length - 1 && styles.buttonBorder,
                ]}
                onPress={() => handleButtonPress(button)}
              >
                <Text style={[
                  styles.buttonText,
                  { color: getButtonTextColor(button.style) },
                  button.style === 'cancel' && styles.cancelButtonText,
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </CommonModal>
  );
};

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  alertContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    minWidth: 270,
    maxWidth: 320,
    paddingTop: 20,
    paddingBottom: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    ...TYPOGRAPHY.BODY_LARGE,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    marginBottom: 8,
    paddingHorizontal: 20,
    color: '#000000',
  },
  message: {
    ...TYPOGRAPHY.BODY_MEDIUM,
    textAlign: 'center' as const,
    marginBottom: 20,
    paddingHorizontal: 20,
    color: '#333333',
    lineHeight: 22,
  },
  buttonContainer: {
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    minHeight: 44,
    backgroundColor: '#FFFFFF',
  },
  buttonBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  buttonText: {
    ...TYPOGRAPHY.BODY_MEDIUM,
    fontWeight: '500' as const
  },
  cancelButtonText: {
    fontWeight: '600' as const,
  },
};

export default CommonAlert;