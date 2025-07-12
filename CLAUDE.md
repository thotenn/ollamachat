# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm start` (Expo development server with QR code)
- **Start with clear cache**: `npx expo start -c` (useful after dependency changes)
- **Platform-specific development**:
  - Web: `npm run web`
  - Android: `npm run android` 
  - iOS: `npm run ios`

## Architecture Overview

This is a React Native Expo app that creates a chat interface for communicating with Ollama AI models. The app uses a tab-based navigation with two main screens: Chat and Settings.

### Core Components

1. **OllamaService** (`src/services/ollamaService.ts`): Singleton service handling all Ollama API communication
   - Manages HTTP requests to Ollama server (`/api/generate`, `/api/tags`)
   - Implements simulated streaming by chunking responses (React Native limitation)
   - Handles conversation context preservation between messages
   - Auto-detects web vs native environment for optimal performance

2. **SettingsContext** (`src/contexts/SettingsContext.tsx`): React Context providing global app configuration
   - Persists settings to AsyncStorage with key `@ollamachat:settings`
   - Manages Ollama server URL and selected model
   - Provides connection status monitoring
   - Auto-configures OllamaService when settings change

3. **CustomChat** (`src/components/CustomChat.tsx`): Custom chat component replacing react-native-gifted-chat
   - Built to avoid dependency conflicts (react-native-keyboard-controller)
   - Handles message rendering, input, and keyboard management
   - Cross-platform compatible (uses KeyboardAvoidingView)

### Platform-Specific Behavior

- **Context preservation**: The app maintains conversation context using Ollama's context tokens
- **Alert dialogs**: Uses `window.confirm()` on web, `Alert.alert()` on mobile
- **Streaming simulation**: Chunks responses word-by-word using `requestAnimationFrame` (web) or `setTimeout` (mobile)
- **Touch handling**: TouchableOpacity with web-specific cursor styles

### State Management

- **Conversation state**: Managed in ChatScreen with context tokens preserved between messages
- **Settings state**: Global via SettingsContext, persisted to AsyncStorage
- **Connection status**: Real-time monitoring with visual indicators

### Dependencies Notes

- **React Native Reanimated**: Pinned to `~3.17.4` for Expo compatibility
- **Axios**: Used for HTTP requests (no fetch to maintain consistency)
- **AsyncStorage**: For settings persistence
- **React Navigation**: Bottom tabs navigation

### Key Implementation Details

- Conversation context is preserved using Ollama's context tokens array
- New conversation button clears context and resets chat history
- Connection status is shown with colored dots in the header
- Settings are validated by testing actual connection to Ollama server
- Platform detection is used throughout for web vs mobile behavior differences

## Ollama Integration

The app expects Ollama server to be running and accessible. For mobile development, configure Ollama with:
```bash
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

The app makes requests to these Ollama endpoints:
- `POST /api/generate` - Generate responses with context
- `GET /api/tags` - List available models