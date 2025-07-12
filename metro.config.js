const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for web streaming
config.resolver.assetExts.push('cjs');

module.exports = config;