/**
 * Admin-Anmeldung mit zusätzlichen TOTP-Schritten.
 * Ersetzt die Strapi-Anmeldeseite über einen Vite-Alias.
 */
import * as React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  Main,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useFetchClient } from '@strapi/strapi/admin';

const TOTP_PREFIX = '/admin-totp';

/**
 * Speichert das Zugriffstoken wie Strapis reducer.login:
 * mit rememberMe im localStorage, sonst als Sitzungscookie.
 * getStoredToken() bevorzugt localStorage; ein altes jwtToken würde daher
 * ein neues Sitzungscookie überdecken und die Anmeldung verhindern.
 */
function persistAdminToken(token, rememberMe) {
  try {
    window.sessionStorage.removeItem('jwtToken');
    if (rememberMe) {
      window.localStorage.setItem('jwtToken', JSON.stringify(token));
      document.cookie =
        'jwtToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    } else {
      window.localStorage.removeItem('jwtToken');
      document.cookie = `jwtToken=${encodeURIComponent(token)}; Path=/`;
    }
    window.localStorage.setItem('isLoggedIn', 'true');
  } catch {
    window.localStorage.setItem('jwtToken', JSON.stringify(token));
    window.localStorage.setItem('isLoggedIn', 'true');
  }
}

/** Entfernt alte Zugriffstoken, damit das neue Sitzungscookie verwendet wird. */
function clearStaleAccessToken(rememberMe) {
  try {
    window.sessionStorage.removeItem('jwtToken');
    if (!rememberMe) {
      window.localStorage.removeItem('jwtToken');
    }
  } catch {
    // Die Anmeldung soll auch bei gesperrtem Browserspeicher weiterlaufen.
  }
}

function deviceId() {
  try {
    const key = 'strapi-admin-device-id';
    let id = window.localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function readApiError(error, fallback) {
  return (
    error?.response?.data?.error?.message ||
    error?.message ||
    fallback
  );
}

export const Login = ({ children }) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { search } = useLocation();
  const { post } = useFetchClient();
  const { login } = useAuth('Login', (auth) => auth);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(false);
  const [totpCode, setTotpCode] = React.useState('');
  const [step, setStep] = React.useState('password');
  const [challengeToken, setChallengeToken] = React.useState(null);
  const [qrDataUrl, setQrDataUrl] = React.useState(null);
  const [setupSecret, setSetupSecret] = React.useState(null);
  const [apiError, setApiError] = React.useState(null);
  const [pending, setPending] = React.useState(false);

  const redirectAfterLogin = React.useCallback(() => {
    const query = new URLSearchParams(search);
    const redirectTo = query.get('redirectTo');
    navigate(redirectTo ? decodeURIComponent(redirectTo) : '/');
  }, [navigate, search]);

  /**
   * Übernimmt ein direkt geliefertes Zugriffstoken, etwa nach der TOTP-Einrichtung.
   * Ein vollständiges Neuladen lässt Strapi das gespeicherte Token erneut in Redux übernehmen.
   */
  const finishWithToken = React.useCallback(
    (token) => {
      persistAdminToken(token, rememberMe);
      const query = new URLSearchParams(search);
      const redirectTo = query.get('redirectTo');
      const redirectUrl = redirectTo
        ? `/admin${decodeURIComponent(redirectTo)}`
        : '/admin';
      window.location.assign(redirectUrl);
    },
    [rememberMe, search],
  );

  /**
   * Verwendet Strapis Auth.login, damit Redux und die Token-Speicherung
   * mit und ohne rememberMe übereinstimmen.
   */
  const finishWithStockLogin = React.useCallback(
    async (code) => {
      clearStaleAccessToken(rememberMe);
      const body = {
        email,
        password,
        rememberMe,
      };
      if (code) {
        body.totpCode = code;
      }
      const res = await login(body);
      if (res && 'error' in res) {
        throw new Error(res.error?.message || 'Ungültiger Code');
      }
      redirectAfterLogin();
    },
    [email, password, rememberMe, login, redirectAfterLogin],
  );

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setApiError(null);
    setPending(true);
    try {
      const { data } = await post('/admin/login', {
        email,
        password,
        rememberMe,
        deviceId: deviceId(),
      });
      const payload = data?.data ?? data;

      if (payload?.totpRequired && payload.challengeToken) {
        setChallengeToken(payload.challengeToken);
        setStep('totp');
        return;
      }

      if (payload?.setupRequired && payload.challengeToken) {
        const setupRes = await post(`${TOTP_PREFIX}/totp/setup-challenge`, {
          challengeToken: payload.challengeToken,
        });
        const setup = setupRes?.data?.data ?? setupRes?.data;
        setChallengeToken(setup.challengeToken);
        setQrDataUrl(setup.qrDataUrl);
        setSetupSecret(setup.secret);
        setStep('setup');
        return;
      }

      if (payload?.token || payload?.accessToken) {
        await finishWithStockLogin();
        return;
      }

      setApiError('Unerwartete Login-Antwort');
    } catch (error) {
      setApiError(readApiError(error, 'Login fehlgeschlagen'));
    } finally {
      setPending(false);
    }
  };

  const handleTotpSubmit = async (event) => {
    event.preventDefault();
    setApiError(null);
    setPending(true);
    try {
      // Den TOTP-Code über Strapis Anmeldepfad senden, damit die Sitzung regulär gespeichert wird.
      await finishWithStockLogin(totpCode.trim());
    } catch (error) {
      setApiError(readApiError(error, 'Ungültiger Code'));
    } finally {
      setPending(false);
    }
  };

  const handleSetupSubmit = async (event) => {
    event.preventDefault();
    if (!challengeToken) return;
    setApiError(null);
    setPending(true);
    const code = totpCode.trim();
    try {
      const { data } = await post(`${TOTP_PREFIX}/totp/confirm-challenge`, {
        challengeToken,
        code,
        rememberMe,
        deviceId: deviceId(),
      });
      const payload = data?.data ?? data;
      const token = payload?.token || payload?.accessToken;

      // Nach der TOTP-Einrichtung mit demselben Code die reguläre Anmeldung abschließen.
      try {
        await finishWithStockLogin(code);
        return;
      } catch {
        if (!token) {
          setApiError('Setup fehlgeschlagen');
          return;
        }
        finishWithToken(token);
      }
    } catch (error) {
      setApiError(readApiError(error, 'Ungültiger Code'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Main>
      <Flex direction="column" alignItems="center" gap={6} paddingTop={8}>
        <Typography variant="alpha" tag="h1" textAlign="center">
          {formatMessage({
            id: 'Auth.form.welcome.title',
            defaultMessage: 'Welcome!',
          })}
        </Typography>
        <Typography
          variant="epsilon"
          textColor="neutral600"
          textAlign="center"
        >
          Smartwater Admin — TOTP erforderlich
        </Typography>

        {apiError ? (
          <Typography textColor="danger600" role="alert">
            {apiError}
          </Typography>
        ) : null}

        {step === 'password' ? (
          <Box
            as="form"
            onSubmit={handlePasswordSubmit}
            width="100%"
            maxWidth="320px"
          >
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Field.Root name="email" required>
                <Field.Label>Email</Field.Label>
                <Field.Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field.Root>
              <Field.Root name="password" required>
                <Field.Label>Password</Field.Label>
                <Field.Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field.Root>
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(Boolean(v))}
              >
                Remember me
              </Checkbox>
              <Button fullWidth type="submit" loading={pending} disabled={pending}>
                Weiter
              </Button>
            </Flex>
          </Box>
        ) : null}

        {step === 'totp' ? (
          <Box
            as="form"
            onSubmit={handleTotpSubmit}
            width="100%"
            maxWidth="320px"
          >
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Typography textColor="neutral600">
                Code aus der Authenticator-App
              </Typography>
              <Field.Root name="totp" required>
                <Field.Label>Einmalcode</Field.Label>
                <Field.Input
                  inputMode="numeric"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                />
              </Field.Root>
              <Button fullWidth type="submit" loading={pending} disabled={pending}>
                Anmelden
              </Button>
              <Button
                variant="tertiary"
                type="button"
                onClick={() => {
                  setStep('password');
                  setTotpCode('');
                  setApiError(null);
                }}
              >
                Zurück
              </Button>
            </Flex>
          </Box>
        ) : null}

        {step === 'setup' ? (
          <Box
            as="form"
            onSubmit={handleSetupSubmit}
            width="100%"
            maxWidth="320px"
          >
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Typography textColor="neutral600">
                Authenticator scannen und Code bestätigen
              </Typography>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="TOTP QR"
                  width={200}
                  height={200}
                  style={{ alignSelf: 'center' }}
                />
              ) : null}
              {setupSecret ? (
                <Typography
                  variant="pi"
                  textColor="neutral500"
                  textAlign="center"
                >
                  {setupSecret}
                </Typography>
              ) : null}
              <Field.Root name="totp" required>
                <Field.Label>Einmalcode</Field.Label>
                <Field.Input
                  inputMode="numeric"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                />
              </Field.Root>
              <Button fullWidth type="submit" loading={pending} disabled={pending}>
                2FA aktivieren
              </Button>
              <Button
                variant="tertiary"
                type="button"
                onClick={() => {
                  setStep('password');
                  setTotpCode('');
                  setApiError(null);
                }}
              >
                Zurück
              </Button>
            </Flex>
          </Box>
        ) : null}

        <Box paddingTop={2}>
          <Typography
            as={RouterLink}
            to="/auth/forgot-password"
            textColor="primary600"
            variant="pi"
          >
            Passwort vergessen?
          </Typography>
        </Box>
        {children}
      </Flex>
    </Main>
  );
};

export default Login;
