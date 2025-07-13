const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for web streaming
config.resolver.assetExts.push('cjs');

// Add WASM support for SQL.js
config.resolver.assetExts.push('wasm');

module.exports = config;