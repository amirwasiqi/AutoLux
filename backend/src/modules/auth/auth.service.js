
import argon2 from 'argon2';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { pool } from '../../db/pool.js';
import { env } from '../../config/env.js';
import { hashToken, randomToken, signAccessToken } from '../../utils/tokens.js';
import { sendVerificationEmail, sendPasswordResetEmail, startPhoneVerification, checkPhoneVerification } from '../../services/notifications.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
const publicUser = (row) => ({
  id: row.id, email: row.email, firstName: row.first_name, lastName: row.last_name,
  phone: row.phone_e164, preferredLanguage: row.preferred_language,
  emailVerified: Boolean(row.email_verified_at), phoneVerified: Boolean(row.phone_verified_at),
  roles: row.roles || []
});

async function rolesFor(userId, client = pool) {
  const result = await client.query(
    `SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=$1`, [userId]
  );
  return result.rows.map((row) => row.name);
}

async function issueSession(user, req, res) {
  const refresh = randomToken();
  const refreshId = crypto.randomUUID();
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86400000);
  await pool.query(
    `INSERT INTO refresh_tokens(id,user_id,token_hash,family_id,expires_at,user_agent,ip_address)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [refreshId, user.id, hashToken(refresh), familyId, expiresAt, req.get('user-agent') || null, req.ip]
  );
  const roles = await rolesFor(user.id);
  res.cookie(env.COOKIE_NAME, refresh, {
    httpOnly: true, secure: env.isProduction, sameSite: 'lax',
    path: '/api/v1/auth', domain: env.COOKIE_DOMAIN || undefined,
    maxAge: env.REFRESH_TOKEN_DAYS * 86400000
  });
  return { accessToken: signAccessToken({ ...user, roles }), user: publicUser({ ...user, roles }) };
}

export async function register(input, req, res) {
  const client = await pool.connect();
  const verifyToken = randomToken();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO users(email,password_hash,first_name,last_name,phone_e164,preferred_language)
       VALUES(lower($1),$2,$3,$4,$5,$6)
       RETURNING *`,
      [input.email, await argon2.hash(input.password, { type: argon2.argon2id }), input.firstName,
       input.lastName, input.phoneE164 || null, input.preferredLanguage]
    );
    const user = inserted.rows[0];
    await client.query(`INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='customer'`, [user.id]);
    await client.query(
      `INSERT INTO customer_profiles(user_id,date_of_birth,address_line1,city,state,postal_code)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [user.id,input.dateOfBirth || null,input.addressLine1 || null,input.city || null,input.state || null,input.postalCode || null]
    );
    await client.query(
      `INSERT INTO email_verification_tokens(user_id,token_hash,expires_at)
       VALUES($1,$2,now()+interval '24 hours')`, [user.id, hashToken(verifyToken)]
    );
    await client.query(
      `INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,ip_address,user_agent)
       VALUES($1,'user.registered','user',$1,$2,$3)`,
      [user.id, req.ip, req.get('user-agent') || null]
    );
    await client.query('COMMIT');
    const delivery = await sendVerificationEmail(user.email, verifyToken);
    return { user: publicUser(user), verificationEmailSent: delivery.delivered };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      const conflict = new Error('An account with this email already exists.');
      conflict.status = 409; conflict.code = 'EMAIL_EXISTS'; throw conflict;
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function login(input, req, res) {
  const result = await pool.query(
    `SELECT u.*, COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') roles
     FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id
     WHERE u.email_normalized=lower($1) GROUP BY u.id`, [input.email]
  );
  const user = result.rows[0];
  const valid = user?.password_hash && await argon2.verify(user.password_hash, input.password);
  if (!valid || user.status !== 'active') {
    const error = new Error('Email or password is incorrect, or the account is not active.');
    error.status = 401; error.code = 'INVALID_CREDENTIALS'; throw error;
  }
  await pool.query('UPDATE users SET last_login_at=now() WHERE id=$1', [user.id]);
  const session = await issueSession(user, req, res);
  await pool.query(
    `INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,ip_address,user_agent)
     VALUES($1,'auth.login','user',$1,$2,$3)`,
    [user.id, req.ip, req.get('user-agent') || null]
  );
  return session;
}

export async function verifyEmail(token) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT id,user_id FROM email_verification_tokens
       WHERE token_hash=$1 AND consumed_at IS NULL AND expires_at>now() FOR UPDATE`,
      [hashToken(token)]
    );
    if (!found.rowCount) {
      const error = new Error('Verification link is invalid or expired.'); error.status=400; throw error;
    }
    await client.query(`UPDATE email_verification_tokens SET consumed_at=now() WHERE id=$1`, [found.rows[0].id]);
    await client.query(`UPDATE users SET email_verified_at=now(),status='active',updated_at=now() WHERE id=$1`, [found.rows[0].user_id]);
    await client.query('COMMIT');
    return { verified: true };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function refreshSession(req, res) {
  const raw = req.cookies?.[env.COOKIE_NAME];
  if (!raw) { const e = new Error('Session expired.'); e.status=401; throw e; }
  const tokenHash = hashToken(raw);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT rt.*,u.* FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id
       WHERE rt.token_hash=$1 FOR UPDATE OF rt`, [tokenHash]
    );
    const current = found.rows[0];
    if (!current || current.revoked_at || current.expires_at <= new Date() || current.status !== 'active') {
      if (current?.family_id) await client.query(
        `UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE family_id=$1`, [current.family_id]
      );
      await client.query('COMMIT');
      const e = new Error('Session expired. Please sign in again.'); e.status=401; throw e;
    }
    const nextToken = randomToken();
    const nextId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86400000);
    await client.query(
      `INSERT INTO refresh_tokens(id,user_id,token_hash,family_id,expires_at,user_agent,ip_address)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [nextId,current.user_id,hashToken(nextToken),current.family_id,expiresAt,req.get('user-agent') || null,req.ip]
    );
    await client.query(`UPDATE refresh_tokens SET revoked_at=now(),replaced_by=$2 WHERE id=$1`, [current.id,nextId]);
    await client.query('COMMIT');
    const roles = await rolesFor(current.user_id);
    res.cookie(env.COOKIE_NAME,nextToken,{
      httpOnly:true,secure:env.isProduction,sameSite:'lax',path:'/api/v1/auth',
      domain:env.COOKIE_DOMAIN || undefined,maxAge:env.REFRESH_TOKEN_DAYS*86400000
    });
    return { accessToken: signAccessToken({id:current.user_id,email:current.email,roles}) };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally { client.release(); }
}

export async function logout(req, res) {
  const raw = req.cookies?.[env.COOKIE_NAME];
  if (raw) await pool.query(`UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL`, [hashToken(raw)]);
  res.clearCookie(env.COOKIE_NAME,{
    httpOnly:true,secure:env.isProduction,sameSite:'lax',path:'/api/v1/auth',domain:env.COOKIE_DOMAIN || undefined
  });
  return { loggedOut: true };
}

export async function requestPasswordReset(email) {
  const result = await pool.query('SELECT id,email FROM users WHERE email_normalized=lower($1) AND status <> $2',[email,'deleted']);
  if (!result.rowCount) return { accepted: true };
  const token = randomToken();
  await pool.query(
    `INSERT INTO password_reset_tokens(user_id,token_hash,expires_at)
     VALUES($1,$2,now()+interval '30 minutes')`,[result.rows[0].id,hashToken(token)]
  );
  await sendPasswordResetEmail(result.rows[0].email,token);
  return { accepted: true };
}

export async function resetPassword(token,password) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT id,user_id FROM password_reset_tokens
       WHERE token_hash=$1 AND consumed_at IS NULL AND expires_at>now() FOR UPDATE`,[hashToken(token)]
    );
    if (!found.rowCount) { const e=new Error('Reset token is invalid or expired.'); e.status=400; throw e; }
    const passwordHash = await argon2.hash(password,{type:argon2.argon2id});
    const userId = found.rows[0].user_id;
    await client.query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2',[passwordHash,userId]);
    await client.query('UPDATE password_reset_tokens SET consumed_at=now() WHERE id=$1',[found.rows[0].id]);
    await client.query('UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[userId]);
    await client.query('COMMIT');
    return { passwordReset: true };
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function googleLogin(idToken, req, res) {
  if (!env.GOOGLE_CLIENT_ID) { const e=new Error('Google sign-in is not configured.'); e.status=503; throw e; }
  const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) { const e=new Error('Google account email is not verified.'); e.status=401; throw e; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let result = await client.query('SELECT * FROM users WHERE email_normalized=lower($1) FOR UPDATE',[payload.email]);
    let user = result.rows[0];
    if (!user) {
      result = await client.query(
        `INSERT INTO users(email,first_name,last_name,email_verified_at,status)
         VALUES(lower($1),$2,$3,now(),'active') RETURNING *`,
        [payload.email,payload.given_name || 'AutoLux',payload.family_name || 'Customer']
      );
      user = result.rows[0];
      await client.query(`INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='customer'`,[user.id]);
      await client.query('INSERT INTO customer_profiles(user_id) VALUES($1)',[user.id]);
      await client.query(
        `INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,ip_address)
         VALUES($1,'user.registered.google','user',$1,$2)`,[user.id,req.ip]
      );
    }
    if (user.status !== 'active') { const e=new Error('This account cannot sign in.'); e.status=403; throw e; }
    await client.query('COMMIT');
    const session = await issueSession(user,req,res);
    return session;
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function startSms(phone) {
  return startPhoneVerification(phone);
}


export async function verifySms(userId, phone, code) {
  const result = await checkPhoneVerification(phone, code);
  if (!result.configured) {
    const error = new Error('SMS verification is not configured.');
    error.status = 503;
    throw error;
  }
  if (!result.verified) {
    const error = new Error('The verification code is invalid or expired.');
    error.status = 400;
    throw error;
  }
  await pool.query(
    `UPDATE users SET phone_verified_at=now(), updated_at=now()
     WHERE id=$1 AND phone_e164=$2`,
    [userId, phone]
  );
  return { verified: true };
}
