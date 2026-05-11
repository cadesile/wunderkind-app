const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Prevent Metro from following package.json `exports` fields on web.
// Without this, react-native-worklets (NativeWind v4 dep) resolves to its
// ESM build which contains `import.meta` — invalid in Metro's web bundler.
config.resolver.unstable_enablePackageExports = false;

// expo-sqlite requires WASM files and a web worker that are not available on
// web. This app is native-only — redirect all expo-sqlite imports on web to
// a no-op stub so the bundler and runtime never attempt to load WebAssembly.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'expo-sqlite') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/db/expo-sqlite-web-stub.js'),
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
