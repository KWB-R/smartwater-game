import { mergeConfig, type UserConfig } from 'vite';

export default (config: UserConfig) => {
  // Die angepasste Konfiguration zurückgeben.
  return mergeConfig(config, {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  });
};
