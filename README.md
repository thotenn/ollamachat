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

### Prerequisites for Building

1. **Create Expo Account**: Sign up at [expo.dev](https://expo.dev) (free)
2. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

### EAS Build Setup (First Time Only)

1. **Login to EAS**:
   ```bash
   eas login
   ```
   Enter your Expo account credentials

2. **Configure Project**:
   ```bash
   eas build:configure
   ```
   This creates the necessary build configuration

### Building APK for Android

#### Option 1: Preview Build (Recommended for Testing)
```bash
# Build APK for internal distribution
eas build --platform android --profile preview
```

#### Option 2: Production Build
```bash
# Build APK for production
eas build --platform android --profile production
```

#### Build Process:
- Build time: **10-15 minutes**
- Monitor progress in terminal or at [expo.dev builds dashboard](https://expo.dev)
- Download link provided upon completion
- APK ready for installation on any Android device

### Building for iOS

#### Development Build
```bash
eas build --platform ios --profile development
```

#### Production Build (App Store)
```bash
eas build --platform ios --profile production
```

**Note**: iOS builds require:
- Apple Developer Account ($99/year)
- Signing certificates and provisioning profiles
- macOS for local testing

### Building for Web

#### Development
```bash
npm run web
```

#### Production Build
```bash
npx expo export:web
```

The web build will be in the `dist/` folder, ready for deployment to any static hosting service.

### Build All Platforms
```bash
# Build for all platforms simultaneously
eas build --platform all
```

### Local Native Build (Advanced)

For developers who want to build locally with Android Studio/Xcode:

```bash
# Generate native code
npx expo prebuild

# Build and run on connected device
npx expo run:android
npx expo run:ios
```

**Requirements**:
- Android Studio with Android SDK (for Android)
- Xcode 12+ (for iOS, macOS only)

### Build Management

#### View Build Status
```bash
# List all builds
eas build:list

# View specific build details
eas build:view [BUILD_ID]

# Cancel a build
eas build:cancel [BUILD_ID]
```

#### Download Builds
- **Automatic**: Download link sent via email and shown in terminal
- **Manual**: Visit [expo.dev builds](https://expo.dev) dashboard
- **CLI**: Use the provided download URL

### Installing APK on Android

1. **Download APK** from the EAS build link
2. **Enable Unknown Sources**:
   - Go to Settings > Security > Unknown Sources
   - Or Settings > Apps > Special Access > Install Unknown Apps
3. **Install APK**:
   - Open the downloaded APK file
   - Follow installation prompts
4. **Launch App**: Find "Ollama Chat" in your app drawer

### Build Configuration

The project includes optimized build configurations in `eas.json`:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Troubleshooting Builds

#### Common Issues:

**Build fails with dependency errors**:
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Android build fails**:
- Ensure all required permissions are in `app.json`
- Check package name is unique
- Verify internet connectivity during build

**iOS build fails**:
- Ensure Apple Developer account is active
- Check provisioning profiles are valid
- Verify bundle identifier is unique

**Web build optimization**:
- Images are automatically optimized
- Bundle size is minimized
- PWA features enabled by default

### Production Deployment

#### Android
- **Google Play Store**: Use AAB format (`"buildType": "aab"` in eas.json)
- **Direct Distribution**: Use APK format (current configuration)
- **Enterprise**: Use internal distribution

#### iOS
- **App Store**: Submit through App Store Connect
- **TestFlight**: Use development builds for beta testing
- **Enterprise**: Use enterprise certificates

#### Web
- **Static Hosting**: Deploy `dist/` folder to Vercel, Netlify, or Firebase
- **Custom Server**: Serve static files with proper MIME types
- **CDN**: Use CloudFront or similar for global distribution

### Build Optimization Tips

1. **Reduce Bundle Size**:
   - Remove unused dependencies
   - Optimize images before building
   - Use vector icons when possible

2. **Performance**:
   - Enable Hermes for Android (configured automatically)
   - Use release builds for testing performance
   - Profile app with production builds

3. **Security**:
   - Never commit signing keys to git
   - Use environment variables for sensitive data
   - Enable proguard for Android release builds

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

### Conversation Persistence
- All conversations are automatically saved to SQLite database
- Chat history with organized conversation list
- Persistent conversation context across sessions
- Automatic conversation backup and restore

### Smart Title Generation
- AI-powered conversation titles based on first 3 questions
- Titles update and refine as conversation develops
- Contextual understanding for better categorization
- Fallback to user message preview if AI generation fails

### Conversation Context
- Maintains conversation history using Ollama's context tokens
- New conversation button to reset context
- Visual indicator when context is active
- Context preservation between app sessions

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


## Version Management

When publishing updates to app stores, you need to properly increment version numbers in two locations:

### 1. User-Visible Version (app.json)
Update the `version` field in `/app.json`:
```json
{
  "expo": {
    "version": "1.0.1"  // Change this for each release
  }
}
```

### 2. Internal Version Code (Android)
Update `versionCode` in `/android/app/build.gradle`:
```gradle
android {
  defaultConfig {
    versionCode 2        // Must increment for each Play Store update
    versionName "1.0.1"  // Should match app.json version
  }
}
```

### Version Update Rules

**For Play Store updates:**
- `versionCode` MUST be higher than previous release
- `versionName` should follow semantic versioning (1.0.0 → 1.0.1 → 1.1.0)
- Both files should be updated before building

**Example version progression:**
```
Release 1: versionCode: 1, version: "1.0.0"
Release 2: versionCode: 2, version: "1.0.1" 
Release 3: versionCode: 3, version: "1.1.0"
```

**Important:** Always increment `versionCode` before running `eas build` for production releases.

# For debugging purposes, you can use the following commands:
# To build and install the Android app locally:
```bash
npx expo prebuild
npx expo run:android
cd android
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-release.apk

notes:
for Production build aab, update eas.json:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```
but, if you want to build an APK, update eas.json to:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```
Then run:
```bash
eas build:configure  # for initial setup
eas build --platform android --profile production
```