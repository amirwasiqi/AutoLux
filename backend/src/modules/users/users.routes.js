
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { pool } from '../../db/pool.js';

const router = Router();
router.get('/me/profile', authenticate, async (req,res,next) => {
  try {
    const result = await pool.query(
      `SELECT u.id,u.email,u.first_name,u.last_name,u.phone_e164,u.preferred_language,
       u.email_verified_at,u.phone_verified_at,u.created_at,
       cp.date_of_birth,cp.address_line1,cp.address_line2,cp.city,cp.state,cp.postal_code,cp.country_code
       FROM users u LEFT JOIN customer_profiles cp ON cp.user_id=u.id WHERE u.id=$1`,[req.user.id]
    );
    res.json({ data: result.rows[0] });
  } catch(error) { next(error); }
});
export default router;
