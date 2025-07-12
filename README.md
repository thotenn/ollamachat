# Ollama Chat App

A React Native Expo mobile application for chatting with Ollama AI models on your local or remote server.

## Features

- 💬 Intuitive chat interface with conversation context
- 🔧 Flexible Ollama server configuration
- 🤖 Support for multiple AI models
- 💾 Persistent configuration storage
- 🔄 Real-time streaming responses
- 📱 Cross-platform: iOS, Android, and Web
- 🔄 Conversation context preservation
- 🆕 New conversation functionality

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Running Ollama server (local or remote)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd ollamachat
npm install
```

### 2. Configure Ollama Server

For mobile device access, configure Ollama to accept external connections:

```bash
# Start Ollama server accessible from network
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

### 3. Download a Model

```bash
# Download a model (if not already done)
ollama pull llama2
# or
ollama pull codellama
```

## Development

### Start Development Server

```bash
# Start Expo development server
npm start

# Start with cache cleared (after dependency changes)
npx expo start -c
```

### Platform-Specific Development

```bash
# Web development
npm run web

# iOS Simulator (macOS only)
npm run ios

# Android Emulator
npm run android
```

### Using Expo Go (Recommended)

1. Install Expo Go on your mobile device
2. Run `npm start`
3. Scan the QR code with Expo Go (Android) or Camera app (iOS)

## Building for Production

### Expo Application Services (EAS) Build

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Configure EAS (first time only):
   ```bash
   eas login
   eas build:configure
   ```

3. Build for platforms:
   ```bash
   # Build for both platforms
   eas build --platform all
   
   # Build for specific platform
   eas build --platform android
   eas build --platform ios
   ```

### Local Native Build (Advanced)

```bash
# Generate native code
npx expo prebuild

# Build with native tools
npx expo run:android
npx expo run:ios
```

## Configuration

### First Time Setup

1. **Open Settings Tab**: Navigate to configuration screen
2. **Set Server URL**: Enter your Ollama server URL
   - Local: `http://localhost:11434`
   - Network: `http://YOUR_COMPUTER_IP:11434`
3. **Test Connection**: Verify server accessibility
4. **Select Model**: Choose from available models
5. **Save Settings**: Persist configuration

### Network Configuration

For physical devices, use your computer's IP address:

```bash
# Find your IP address
# macOS/Linux:
ifconfig | grep "inet "
# Windows:
ipconfig
```

Then use: `http://192.168.1.100:11434` (replace with your IP)

## Project Architecture

```
ollamachat/
├── src/
│   ├── components/         # Reusable UI components
│   │   └── CustomChat.tsx  # Custom chat implementation
│   ├── contexts/           # React Context providers
│   │   └── SettingsContext.tsx
│   ├── screens/            # Main application screens
│   │   ├── ChatScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/           # External service integrations
│   │   └── ollamaService.ts
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── App.tsx                 # Application entry point
├── babel.config.js         # Babel configuration
├── metro.config.js         # Metro bundler configuration
└── package.json           # Dependencies and scripts
```

## Key Features

### Conversation Context
- Maintains conversation history using Ollama's context tokens
- New conversation button to reset context
- Visual indicator when context is active

### Cross-Platform Compatibility
- Web: Uses native browser dialogs and optimized rendering
- Mobile: Native React Native components and alerts
- Shared codebase with platform-specific optimizations

### Real-time Communication
- Simulated streaming responses for smooth UX
- Connection status monitoring
- Automatic reconnection handling

## Troubleshooting

### Connection Issues

**Cannot connect to Ollama server:**
- Verify Ollama is running: `ollama list`
- Check server URL configuration
- Ensure OLLAMA_HOST is set for network access
- Verify firewall settings allow port 11434

**Models not appearing:**
- Download at least one model: `ollama pull llama2`
- Check Ollama server logs for errors
- Verify server is accessible from your device

### Development Issues

**Metro bundler errors:**
```bash
# Clear cache and restart
npx expo start -c
```

**Dependency conflicts:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Platform-specific issues:**
- iOS: Ensure Xcode is installed and up to date
- Android: Verify Android Studio and SDK are configured
- Web: Clear browser cache and disable extensions

## Performance Tips

- Use Wi-Fi for best performance with streaming responses
- Close other network-intensive applications
- Ensure Ollama server has adequate system resources
- Use smaller models for faster responses on resource-constrained devices

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple platforms
5. Submit a pull request

## License

This project is licensed under the MIT License.