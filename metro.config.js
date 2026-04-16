const { withNativeWind } = require('nativewind/metro');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// getSentryExpoConfig replaces getDefaultConfig and adds Sentry source map support
const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: './app/globals.css' });