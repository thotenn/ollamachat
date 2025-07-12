const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for web streaming
config.resolver.assetExts.push('cjs');

// Add WASM support for SQL.js
config.resolver.assetExts.push('wasm');

// Configure platform-specific resolvers
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// Block SQL.js on native platforms
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Platform-specific aliases
config.resolver.alias = {
  ...config.resolver.alias,
};

module.exports = config;