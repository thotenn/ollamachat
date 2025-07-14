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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: 14,
    minWidth: 270,
    maxWidth: 320,
    paddingTop: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    ...TYPOGRAPHY.BODY_LARGE,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
    color: COLORS.TEXT.DARK,
  },
  message: {
    ...TYPOGRAPHY.BODY_MEDIUM,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    color: COLORS.TEXT.DARK,
    lineHeight: 22,
  },
  buttonContainer: {
    borderTopWidth: 0.5,
    borderTopColor: COLORS.BORDER.LIGHT,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  buttonBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.BORDER.LIGHT,
  },
  buttonText: {
    ...TYPOGRAPHY.BODY_MEDIUM,
    fontWeight: '500',
  },
  cancelButtonText: {
    fontWeight: '600',
  },
};

export default CommonAlert;