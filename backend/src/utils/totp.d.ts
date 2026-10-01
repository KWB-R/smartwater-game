declare const totp: {
  CHALLENGE_TTL_SEC: number;
  encryptSecret(plaintext: string): string;
  decryptSecret(payload: string): string;
  issueChallengeToken(
    audience: 'analytics' | 'admin',
    userId: string | number,
    intent: 'totp_verify' | 'totp_setup',
  ): string;
  verifyChallengeToken(
    audience: 'analytics' | 'admin',
    token: string,
    expectedIntent?: 'totp_verify' | 'totp_setup',
  ): { userId: string; intent: string };
  createTotpSecret(): string;
  buildOtpauthUrl(
    secret: string,
    label: string,
    issuer?: string,
  ): string;
  buildQrDataUrl(otpauthUrl: string): Promise<string>;
  verifyTotpCode(secret: string, code: string): Promise<boolean>;
  assertTotpRateLimit(ipOrKey: string, userId: string): void;
  isRateLimited(key: string): boolean;
};

export = totp;
