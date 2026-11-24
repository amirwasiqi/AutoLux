
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false });
router.post('/register', authLimiter, controller.register);
router.post('/login', authLimiter, controller.login);
router.post('/google', authLimiter, controller.googleLogin);
router.post('/verify-email', authLimiter, controller.verifyEmail);
router.post('/forgot-password', authLimiter, controller.forgotPassword);
router.post('/reset-password', authLimiter, controller.resetPassword);
router.post('/sms/start', authLimiter, controller.startSms);
router.post('/sms/check', authLimiter, authenticate, controller.verifySms);
router.post('/refresh', authLimiter, controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', authenticate, (req,res) => res.json({ data: { user: req.user } }));
export default router;
