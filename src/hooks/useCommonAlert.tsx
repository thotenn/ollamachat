import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title?: string;
  message?: string;
  buttons?: AlertButton[];
}

interface UseCommonAlertReturn {
  showAlert: (options: AlertOptions) => void;
  AlertComponent: React.ReactElement | null;
}

export const useCommonAlert = (): UseCommonAlertReturn => {
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    buttons?: AlertButton[];
  }>({
    visible: false,
  });

  const showAlert = useCallback((options: AlertOptions) => {
    if (Platform.OS === 'web') {
      // On web, use native confirm/alert
      if (options.buttons && options.buttons.length > 1) {
        const message = options.message || '';
        const title = options.title ? `${options.title}\n\n${message}` : message;
        const confirmed = window.confirm(title);
        
        if (confirmed && options.buttons[1]?.onPress) {
          options.buttons[1].onPress();
        } else if (!confirmed && options.buttons[0]?.onPress) {
          options.buttons[0].onPress();
        }
      } else {
        const message = options.message || '';
        const title = options.title ? `${options.title}\n\n${message}` : message;
        window.alert(title);
        if (options.buttons?.[0]?.onPress) {
          options.buttons[0].onPress();
        }
      }
      return;
    }

    // On mobile, use our custom alert
    setAlertState({
      visible: true,
      title: options.title,
      message: options.message,
      buttons: options.buttons || [{ text: 'OK' }],
    });
  }, []);

  const handleClose = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  // Import CommonAlert dynamically to avoid circular imports
  const CommonAlert = require('../components/CommonAlert').default;

  const AlertComponent = alertState.visible ? (
    <CommonAlert
      visible={alertState.visible}
      title={alertState.title}
      message={alertState.message}
      buttons={alertState.buttons}
      onRequestClose={handleClose}
    />
  ) : null;

  return {
    showAlert,
    AlertComponent,
  };
};