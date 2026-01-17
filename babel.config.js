module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'babel-plugin-react-compiler', // React Compiler plugin - auto-optimizes components
      'react-native-reanimated/plugin', // Must be listed last
    ],
  };
};
