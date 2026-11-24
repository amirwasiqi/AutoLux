
import { env } from '../config/env.js';

export async function sendVerificationEmail(email, token) {
  if (!env.RESEND_API_KEY) {
    console.warn(`Email provider not configured; verification token not delivered for ${email}`);
    return { delivered: false, reason: 'provider_not_configured' };
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject: 'Verify your AutoLux account',
      html: `<p>Use this verification link to activate your account:</p><p><a href="${env.FRONTEND_ORIGIN}/verify-email?token=${encodeURIComponent(token)}">Verify email</a></p>`
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return { delivered: true };
}

export async function sendPasswordResetEmail(email, token) {
  if (!env.RESEND_API_KEY) return { delivered: false, reason: 'provider_not_configured' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM, to: [email], subject: 'Reset your AutoLux password',
      html: `<p><a href="${env.FRONTEND_ORIGIN}/reset-password?token=${encodeURIComponent(token)}">Reset password</a></p>`
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return { delivered: true };
}

export async function startPhoneVerification(phone) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    return { delivered: false, reason: 'provider_not_configured' };
  }
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const body = new URLSearchParams({ To: phone, Channel: 'sms' });
  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`,
    { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body, signal: AbortSignal.timeout(10000) }
  );
  if (!response.ok) throw new Error(`SMS provider returned ${response.status}`);
  return { delivered: true };
}


export async function checkPhoneVerification(phone, code) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    return { verified: false, configured: false };
  }
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const body = new URLSearchParams({ To: phone, Code: code });
  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`,
    { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body, signal: AbortSignal.timeout(10000) }
  );
  if (!response.ok) throw new Error(`SMS verification provider returned ${response.status}`);
  const result = await response.json();
  return { verified: result.status === 'approved', configured: true };
}
