// Polyfill for react-native-keyboard-controller when not available
export const KeyboardControllerPolyfill = {
  useKeyboardController: () => ({
    enabled: false,
    height: 0,
    progress: { value: 0 },
    coordinates: {
      start: { screenY: 0 },
      end: { screenY: 0 },
    },
  }),
  KeyboardProvider: ({ children }: { children: React.ReactNode }) => children,
  KeyboardAvoidingView: ({ children }: { children: React.ReactNode }) => children,
};