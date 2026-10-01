import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'admin-totp': {
    enabled: true,
    resolve: './src/plugins/admin-totp',
  },
});

export default config;
