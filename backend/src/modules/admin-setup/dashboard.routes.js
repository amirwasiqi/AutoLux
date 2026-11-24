import { Router } from 'express';
import { pool } from '../../db/pool.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/http.js';

const router = Router();
const adminRoles = ['super_admin', 'company_admin', 'fleet_manager'];

router.get('/overview', authenticate, requireRole(...adminRoles), asyncHandler(async (_req, res) => {
  const [totals, statuses, categories, recent, branches] = await Promise.all([
    pool.query(`SELECT count(*) FILTER (WHERE archived_at IS NULL)::int AS total,
      count(*) FILTER (WHERE published AND archived_at IS NULL)::int AS published,
      count(*) FILTER (WHERE listing_type IN ('rental','both') AND archived_at IS NULL)::int AS rental_listings,
      count(*) FILTER (WHERE listing_type IN ('sale','both') AND archived_at IS NULL)::int AS sale_listings,
      count(*) FILTER (WHERE archived_at IS NULL AND is_demo=false)::int AS verified_inventory
      FROM vehicles`),
    pool.query(`SELECT status, count(*)::int AS count FROM vehicles WHERE archived_at IS NULL GROUP BY status ORDER BY status`),
    pool.query(`SELECT category, count(*)::int AS count FROM vehicles WHERE archived_at IS NULL GROUP BY category ORDER BY count DESC LIMIT 7`),
    pool.query(`SELECT h.id, h.previous_status, h.new_status, h.note, h.created_at,
      v.stock_code, v.make, v.model, v.model_year,
      COALESCE(u.first_name || ' ' || u.last_name, 'System') AS actor
      FROM vehicle_status_history h JOIN vehicles v ON v.id=h.vehicle_id
      LEFT JOIN users u ON u.id=h.changed_by ORDER BY h.created_at DESC LIMIT 8`),
    pool.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE is_active)::int AS active FROM branches`)
  ]);
  const statusMap = Object.fromEntries(statuses.rows.map((row) => [row.status, row.count]));
  res.json({ data: {
    totals: totals.rows[0],
    statuses: { available: statusMap.available || 0, reserved: statusMap.reserved || 0, rented: statusMap.rented || 0, under_maintenance: statusMap.under_maintenance || 0, damaged: statusMap.damaged || 0, inactive: statusMap.inactive || 0 },
    categories: categories.rows,
    recentActivity: recent.rows,
    branches: branches.rows[0],
    telemetry: { connected: false, message: 'GPS and live telematics are not connected in Phase 3.' }
  }});
}));

export default router;
