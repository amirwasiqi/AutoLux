
import { env } from '../config/env.js';

export function setRefreshCookie(res, token) {
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/api/v1/auth',
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
  });
}
export function clearRefreshCookie(res) {
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true, secure: env.isProduction, sameSite: 'lax',
    path: '/api/v1/auth', domain: env.COOKIE_DOMAIN || undefined
  });
}
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
