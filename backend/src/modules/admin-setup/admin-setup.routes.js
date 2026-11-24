
import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { env } from '../../config/env.js';

const router = Router();
const schema = z.object({
  setupToken: z.string().min(24),
  email: z.string().email(),
  password: z.string().min(14).max(128),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80)
});
router.post('/first-super-admin', async (req,res,next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: { code:'VALIDATION_ERROR', details:parsed.error.flatten() } });
  if (parsed.data.setupToken !== env.ADMIN_SETUP_TOKEN) {
    return res.status(403).json({ error: { code:'INVALID_SETUP_TOKEN', message:'Setup token is invalid.' } });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE users IN EXCLUSIVE MODE');
    const existing = await client.query(
      `SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.name='super_admin' LIMIT 1`
    );
    if (existing.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: { code:'ADMIN_ALREADY_EXISTS', message:'The first Super Admin has already been created.' } });
    }
    const hash = await argon2.hash(parsed.data.password,{type:argon2.argon2id});
    const inserted = await client.query(
      `INSERT INTO users(email,password_hash,first_name,last_name,email_verified_at,status)
       VALUES(lower($1),$2,$3,$4,now(),'active') RETURNING id`,
      [parsed.data.email,hash,parsed.data.firstName,parsed.data.lastName]
    );
    await client.query(
      `INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='super_admin'`,
      [inserted.rows[0].id]
    );
    await client.query('INSERT INTO customer_profiles(user_id) VALUES($1)',[inserted.rows[0].id]);
    await client.query(
      `INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
       VALUES($1,'admin.first_super_admin_created','user',$1,'{"source":"one-time-setup"}'::jsonb)`,
      [inserted.rows[0].id]
    );
    await client.query('COMMIT');
    res.status(201).json({ data:{ created:true }, message:'First Super Admin created. Remove ADMIN_SETUP_TOKEN from the environment now.' });
  } catch(error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ error:{code:'EMAIL_EXISTS'} });
    next(error);
  } finally { client.release(); }
});
export default router;
