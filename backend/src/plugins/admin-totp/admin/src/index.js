export default {
  register(app) {
    app.createSettingSection(
      {
        id: 'admin-totp',
        intlLabel: {
          id: 'admin-totp.settings.section',
          defaultMessage: 'Sicherheit',
        },
      },
      [
        {
          intlLabel: {
            id: 'admin-totp.settings.link',
            defaultMessage: 'Zwei-Faktor-Authentifizierung',
          },
          id: 'admin-totp-settings',
          to: 'admin-totp',
          Component: () =>
            import('./pages/SettingsPage').then((mod) => ({
              default: mod.default,
            })),
        },
      ],
    );
  },
  bootstrap() {},
};
