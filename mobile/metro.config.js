const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const { resolveRequest: defaultResolveRequest } = config.resolver;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName.startsWith('react-native/Libraries/') || moduleName.includes('ReactNativePrivateInterface')) {
      return {
        type: 'empty',
      };
    }
    if (moduleName === 'react-native') {
      return context.resolveRequest(context, 'react-native-web', platform);
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
