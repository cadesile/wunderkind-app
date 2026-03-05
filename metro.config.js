const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Prevent Metro from following package.json `exports` fields on web.
// Without this, react-native-worklets (NativeWind v4 dep) resolves to its
// ESM build which contains `import.meta` — invalid in Metro's web bundler.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });
