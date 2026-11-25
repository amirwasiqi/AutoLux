
import { pool } from '../db/pool.js';

export const requireRole = (...allowed) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' } });
  if (!req.user.roles.some((role) => allowed.includes(role))) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission.' } });
  }
  next();
};


export const requirePermission = (...required) => async (req,res,next) => {
  if(!req.user) return res.status(401).json({error:{code:'UNAUTHENTICATED',message:'Sign in required.'}});
  try {
    if(req.user.roles?.includes('super_admin')) return next();
    const result=await pool.query(`SELECT DISTINCT p.key FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id JOIN user_roles ur ON ur.role_id=rp.role_id WHERE ur.user_id=$1`,[req.user.id]);
    const granted=new Set(result.rows.map(row=>row.key));
    if(!required.every(key=>granted.has(key))) return res.status(403).json({error:{code:'PERMISSION_DENIED',message:'You do not have the required permission.'}});
    next();
  } catch(error) { next(error); }
};
