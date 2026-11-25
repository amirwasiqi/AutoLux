
import { verifyAccessToken } from '../utils/tokens.js';
import { pool } from '../db/pool.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' } });
    const claims = verifyAccessToken(token);
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.status, u.mfa_enabled, u.mfa_email_recovery_enabled,
        COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
       FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id
       LEFT JOIN roles r ON r.id=ur.role_id WHERE u.id=$1
       GROUP BY u.id`, [claims.sub]
    );
    const user = result.rows[0];
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: { code: 'INVALID_SESSION', message: 'Session is no longer valid.' } });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Your session has expired.' } });
  }
}
