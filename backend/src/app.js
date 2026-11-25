
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import adminSetupRoutes from './modules/admin-setup/admin-setup.routes.js';
import vehicleRoutes from './modules/vehicles/vehicles.routes.js';
import dashboardRoutes from './modules/admin-setup/dashboard.routes.js';
import bookingRoutes from './modules/bookings/bookings.routes.js';
import contactRoutes from './modules/contact/contact.routes.js';
import shopRoutes from './modules/shop/shop.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import paymentRoutes from './modules/payments/payments.routes.js';
import driverRoutes from './modules/drivers/drivers.routes.js';
import partnerRoutes from './modules/partners/partners.routes.js';
import salesRoutes from './modules/sales/sales.routes.js';
import contractRoutes from './modules/contracts/contracts.routes.js';
import adminOpsRoutes from './modules/admin-ops/admin-ops.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import { pool } from './db/pool.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb', verify:(req,_res,buffer)=>{req.rawBody=Buffer.from(buffer);} }));
app.use(cookieParser());

app.get(['/api/v1/health', '/api/health'], (_req,res) => res.json({ status:'ok', service:'autolux-api' }));
app.get(['/api/v1/ready', '/api/ready'], async (_req,res) => {
  try { await pool.query('SELECT 1'); res.json({ status:'ready' }); }
  catch { res.status(503).json({ status:'not_ready' }); }
});
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin-setup', adminSetupRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/admin/dashboard', dashboardRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/shop', shopRoutes);
app.use('/api/v1/admin/control', adminRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/partners', partnerRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/admin/operations', adminOpsRoutes);
app.use('/api/v1/notifications', notificationRoutes);

app.use((req,res) => res.status(404).json({ error:{ code:'NOT_FOUND', message:'Resource not found.' } }));
app.use((error,_req,res,_next) => {
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: status >= 500 ? 'An unexpected server error occurred.' : error.message,
      ...(error.details ? { details:error.details } : {})
    }
  });
});
