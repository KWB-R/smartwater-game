/**
 * Einstellungen zum Einrichten und Deaktivieren von TOTP für das Admin-Panel.
 */
import * as React from 'react';
import {
  Box,
  Button,
  Field,
  Flex,
  Typography,
} from '@strapi/design-system';
import { useFetchClient, Layouts } from '@strapi/strapi/admin';

const TOTP_PREFIX = '/admin-totp';

const TotpSettingsPage = () => {
  const { get, post } = useFetchClient();
  const [enabled, setEnabled] = React.useState(false);
  const [required, setRequired] = React.useState(true);
  const [qrDataUrl, setQrDataUrl] = React.useState(null);
  const [secret, setSecret] = React.useState(null);
  const [code, setCode] = React.useState('');
  const [message, setMessage] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [pending, setPending] = React.useState(false);

  const refreshStatus = React.useCallback(async () => {
    const { data } = await get(`${TOTP_PREFIX}/totp/status`);
    const payload = data?.data ?? data;
    setEnabled(payload?.enabled === true);
    setRequired(payload?.required !== false);
  }, [get]);

  React.useEffect(() => {
    refreshStatus().catch(() => {
      setError('Status konnte nicht geladen werden');
    });
  }, [refreshStatus]);

  const startSetup = async () => {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const { data } = await post(`${TOTP_PREFIX}/totp/setup`, {});
      const payload = data?.data ?? data;
      setQrDataUrl(payload.qrDataUrl);
      setSecret(payload.secret);
    } catch (e) {
      setError(e?.message || 'Setup fehlgeschlagen');
    } finally {
      setPending(false);
    }
  };

  const confirmSetup = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      await post(`${TOTP_PREFIX}/totp/confirm`, { code: code.trim() });
      setQrDataUrl(null);
      setSecret(null);
      setCode('');
      setMessage('Zwei-Faktor-Authentifizierung aktiviert');
      await refreshStatus();
    } catch (e) {
      setError(e?.message || 'Ungültiger Code');
    } finally {
      setPending(false);
    }
  };

  const disableTotp = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      await post(`${TOTP_PREFIX}/totp/disable`, { code: code.trim() });
      setCode('');
      setMessage('Zwei-Faktor-Authentifizierung deaktiviert');
      await refreshStatus();
    } catch (e) {
      setError(e?.message || 'Deaktivieren fehlgeschlagen');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Layouts.Header
        title="Zwei-Faktor-Authentifizierung"
        subtitle="TOTP für den Admin-Login (Authenticator-App)"
      />
      <Layouts.Content>
        <Box
          background="neutral0"
          padding={6}
          shadow="filterShadow"
          hasRadius
          maxWidth="480px"
        >
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Typography>
              Status:{' '}
              <strong>{enabled ? 'aktiviert' : 'nicht aktiviert'}</strong>
              {required ? ' (Login erzwingt Enrollment)' : ''}
            </Typography>

            {error ? (
              <Typography textColor="danger600" role="alert">
                {error}
              </Typography>
            ) : null}
            {message ? (
              <Typography textColor="success600">{message}</Typography>
            ) : null}

            {!enabled ? (
              <>
                <Button onClick={startSetup} loading={pending} disabled={pending}>
                  TOTP einrichten
                </Button>
                {qrDataUrl ? (
                  <Box as="form" onSubmit={confirmSetup}>
                    <Flex direction="column" alignItems="stretch" gap={3}>
                      <img
                        src={qrDataUrl}
                        alt="TOTP QR"
                        width={200}
                        height={200}
                      />
                      {secret ? (
                        <Typography variant="pi" textColor="neutral500">
                          {secret}
                        </Typography>
                      ) : null}
                      <Field.Root name="code" required>
                        <Field.Label>Bestätigungscode</Field.Label>
                        <Field.Input
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                        />
                      </Field.Root>
                      <Button type="submit" loading={pending} disabled={pending}>
                        Aktivieren
                      </Button>
                    </Flex>
                  </Box>
                ) : null}
              </>
            ) : (
              <Box as="form" onSubmit={disableTotp}>
                <Flex direction="column" alignItems="stretch" gap={3}>
                  <Field.Root name="code" required>
                    <Field.Label>Code zum Deaktivieren</Field.Label>
                    <Field.Input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </Field.Root>
                  <Button
                    type="submit"
                    variant="danger-light"
                    loading={pending}
                    disabled={pending || required}
                  >
                    Deaktivieren
                  </Button>
                  {required ? (
                    <Typography variant="pi" textColor="neutral500">
                      Deaktivieren ist deaktiviert, solange ADMIN_TOTP_REQUIRED
                      aktiv ist.
                    </Typography>
                  ) : null}
                </Flex>
              </Box>
            )}
          </Flex>
        </Box>
      </Layouts.Content>
    </>
  );
};

export default TotpSettingsPage;
