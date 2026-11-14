import 'server-only';
import { localOrigin } from './local-origin';

const DEFAULT_ORIGIN = 'http://0.0.0.0:3000';
const DEFAULT_AUTH_URL = 'http://127.0.0.1:9999';
const DEFAULT_KEY = '0000000000000000000000000000000000000000000000000000000000000000';

export const isDatabaseConfigured = () => Boolean(process.env.SAM_DATABASE_URL || process.env.DATABASE_URL);
export const isAuthConfigured = () => Boolean(process.env.SAM_AUTH_URL);
export const isDemoMode = () => !isDatabaseConfigured();

export const appOrigin = () => {
  const value = process.env.SAM_ORIGIN;
  if (!value) return DEFAULT_ORIGIN;
  try {
    return localOrigin(value);
  } catch {
    return new URL(value).origin;
  }
};

export const authUrl = () => process.env.SAM_AUTH_URL || DEFAULT_AUTH_URL;
export const authSecret = () => process.env.SAM_JWT_SECRET || DEFAULT_KEY;
export const setupCode = () => process.env.SAM_SETUP_CODE || '';
export const databaseUrl = () => process.env.SAM_DATABASE_URL || process.env.DATABASE_URL || '';
export function sessionKey(): Buffer {
  const key = process.env.SAM_SESSION_KEY;
  if (!key || !/^[a-f0-9]{64}$/i.test(key)) return Buffer.from(DEFAULT_KEY, 'hex');
  return Buffer.from(key, 'hex');
}
