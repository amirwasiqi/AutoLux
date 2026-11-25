import { appendFile, chmod, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db/pool.js';
const privateDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../private-data');
const logFile=path.join(privateDir,'first-signins.jsonl');
// Minimal first-login record only. Never store passwords, tokens, ID documents or payment data.
export async function recordFirstSignIn(userId,method='password'){
 const r=await pool.query(`UPDATE users SET first_login_recorded_at=now() WHERE id=$1 AND first_login_recorded_at IS NULL RETURNING id,email,first_name,last_name,created_at,first_login_recorded_at`,[userId]);
 if(!r.rowCount)return false;const u=r.rows[0];await mkdir(privateDir,{recursive:true,mode:0o700});
 await appendFile(logFile,JSON.stringify({userId:u.id,email:u.email,firstName:u.first_name,lastName:u.last_name,accountCreatedAt:u.created_at,firstSignInAt:u.first_login_recorded_at,method})+'\n',{encoding:'utf8',mode:0o600});await chmod(logFile,0o600);return true;
}
