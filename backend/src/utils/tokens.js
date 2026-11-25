
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const randomToken = () => crypto.randomBytes(32).toString('base64url');
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
export const signAccessToken = (user) => jwt.sign(
  { sub: user.id, email: user.email, roles: user.roles || [] },
  env.JWT_ACCESS_SECRET,
  { expiresIn: env.JWT_ACCESS_TTL, issuer: 'autolux-api', audience: 'autolux-web' }
);
export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET, {
  issuer: 'autolux-api', audience: 'autolux-web'
});

export const signMfaChallenge = (userId) => jwt.sign(
  { sub:userId, purpose:'mfa_challenge' }, env.JWT_ACCESS_SECRET,
  { expiresIn:'5m', issuer:'autolux-api', audience:'autolux-mfa' }
);
export const verifyMfaChallenge = (token) => {
  const claims=jwt.verify(token,env.JWT_ACCESS_SECRET,{issuer:'autolux-api',audience:'autolux-mfa'});
  if(claims.purpose!=='mfa_challenge') throw new Error('Invalid MFA challenge.');
  return claims;
};
