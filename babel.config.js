module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@env': './src/envs',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};