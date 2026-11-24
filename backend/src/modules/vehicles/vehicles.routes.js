import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/http.js';

const router = Router();
const fleetRoles = ['super_admin', 'company_admin', 'fleet_manager'];
const vehicleStatus = ['available', 'reserved', 'rented', 'under_maintenance', 'damaged', 'inactive'];
const createSchema = z.object({
  make: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(100),
  model_year: z.coerce.number().int().min(1990).max(2100), category: z.string().trim().min(2).max(60),
  listing_type: z.enum(['rental', 'sale', 'both']).default('both'), description: z.string().max(3000).default(''),
  daily_rental_price_usd: z.coerce.number().min(0).nullable().optional(),
  weekly_rental_price_usd: z.coerce.number().min(0).nullable().optional(),
  monthly_rental_price_usd: z.coerce.number().min(0).nullable().optional(),
  sale_price_usd: z.coerce.number().min(0).nullable().optional(),
  transmission: z.string().max(40).default('Automatic'), fuel_type: z.string().max(40).default('Gasoline'),
  seats: z.coerce.number().int().min(1).max(20).default(5), doors: z.coerce.number().int().min(2).max(6).default(4),
  mileage_limit_per_day: z.coerce.number().int().min(0).nullable().optional(),
  status: z.enum(vehicleStatus).default('available'),
  image_url: z.string().url().nullable().optional(), image_search_query: z.string().max(240).nullable().optional(),
  branch_id: z.string().uuid().nullable().optional(), registration_number: z.string().max(40).nullable().optional(),
  published: z.coerce.boolean().default(false)
});

const slugify = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const publicColumns = `v.id, v.stock_code, v.slug, v.make, v.model, v.model_year, v.category, v.listing_type,
  v.description, v.daily_rental_price_usd, v.weekly_rental_price_usd, v.monthly_rental_price_usd,
  v.sale_price_usd, v.sale_price_basis, v.price_reference_date, v.price_reference_url,
  v.transmission, v.fuel_type, v.seats, v.doors, v.mileage_limit_per_day, v.status,
  v.image_url, v.image_search_query, v.image_source_url, v.image_license, v.image_credit, v.rental_price_reference_url, v.daily_rental_price_basis,
  b.name AS branch_name, b.city AS branch_city, b.state_code AS branch_state`;

router.get('/filters', asyncHandler(async (_req, res) => {
  const [categories, makes] = await Promise.all([
    pool.query(`SELECT DISTINCT category FROM vehicles WHERE published=true AND archived_at IS NULL AND status='available' ORDER BY category`),
    pool.query(`SELECT DISTINCT make FROM vehicles WHERE published=true AND archived_at IS NULL AND status='available' ORDER BY make`)
  ]);
  res.json({ data: { categories: categories.rows.map((r) => r.category), makes: makes.rows.map((r) => r.make) } });
}));

router.get('/manage/all', authenticate, requireRole(...fleetRoles), asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || '').trim();
  const values = [];
  const where = ['v.archived_at IS NULL'];
  if (search) { values.push(`%${search}%`); where.push(`(v.make ILIKE $${values.length} OR v.model ILIKE $${values.length} OR v.stock_code ILIKE $${values.length})`); }
  if (status && vehicleStatus.includes(status)) { values.push(status); where.push(`v.status = $${values.length}`); }
  const result = await pool.query(`SELECT ${publicColumns}, v.published, v.is_demo, v.registration_number, v.branch_id, v.created_at, v.updated_at
    FROM vehicles v LEFT JOIN branches b ON b.id=v.branch_id WHERE ${where.join(' AND ')} ORDER BY v.created_at DESC LIMIT 500`, values);
  res.json({ data: result.rows });
}));

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(48, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 12));
  const values = [];
  const where = ["v.published = true", "v.archived_at IS NULL", "v.status = 'available'"];
  const addFilter = (sql, value) => { values.push(value); where.push(sql.replace('?', `$${values.length}`)); };
  const search = String(req.query.search || '').trim().slice(0, 100);
  const category = String(req.query.category || '').trim();
  const make = String(req.query.make || '').trim();
  const listingType = String(req.query.type || '').trim();
  const minPrice = Number(req.query.minPrice);
  const maxPrice = Number(req.query.maxPrice);
  if (search) addFilter(`(v.make ILIKE ? OR v.model ILIKE ? OR v.category ILIKE ?)`, `%${search}%`);
  // The same search parameter must be bound three times, not interpolated into SQL.
  if (search) {
    const p = values.length;
    values.push(`%${search}%`, `%${search}%`);
    where[where.length - 1] = `(v.make ILIKE $${p} OR v.model ILIKE $${p + 1} OR v.category ILIKE $${p + 2})`;
  }
  if (category) addFilter('v.category = ?', category);
  if (make) addFilter('v.make = ?', make);
  if (['rental','sale'].includes(listingType)) addFilter(`v.listing_type IN (?, 'both')`, listingType);
  if (Number.isFinite(minPrice) && minPrice >= 0) addFilter(`COALESCE(v.daily_rental_price_usd, v.sale_price_usd) >= ?`, minPrice);
  if (Number.isFinite(maxPrice) && maxPrice > 0) addFilter(`COALESCE(v.daily_rental_price_usd, v.sale_price_usd) <= ?`, maxPrice);
  const sortMap = { featured: 'v.created_at DESC', price_low: 'COALESCE(v.daily_rental_price_usd, v.sale_price_usd) ASC', price_high: 'COALESCE(v.daily_rental_price_usd, v.sale_price_usd) DESC', name: 'v.make ASC, v.model ASC' };
  const orderBy = sortMap[String(req.query.sort || 'featured')] || sortMap.featured;
  const whereSql = where.join(' AND ');
  const count = await pool.query(`SELECT count(*)::int AS total FROM vehicles v WHERE ${whereSql}`, values);
  const total = count.rows[0].total;
  const offset = (page - 1) * pageSize;
  const listValues = [...values, pageSize, offset];
  const result = await pool.query(`SELECT ${publicColumns} FROM vehicles v LEFT JOIN branches b ON b.id=v.branch_id
    WHERE ${whereSql} ORDER BY ${orderBy} LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`, listValues);
  res.json({ data: result.rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT ${publicColumns} FROM vehicles v LEFT JOIN branches b ON b.id=v.branch_id
    WHERE v.slug=$1 AND v.published=true AND v.archived_at IS NULL AND v.status='available' LIMIT 1`, [req.params.slug]);
  if (!result.rowCount) return res.status(404).json({ error: { code: 'VEHICLE_NOT_FOUND', message: 'This vehicle is not available.' } });
  const images = await pool.query('SELECT image_url, source_page_url, license_name, creator_credit, alt_text FROM vehicle_images WHERE vehicle_id=$1 ORDER BY sort_order', [result.rows[0].id]);
  res.json({ data: { ...result.rows[0], images: images.rows } });
}));

router.post('/', authenticate, requireRole(...fleetRoles), asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the vehicle details.', details: parsed.error.flatten() } });
  const v = parsed.data;
  const baseSlug = slugify(`${v.make}-${v.model}-${v.model_year}`);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  const stockCode = `ALX-${Date.now().toString().slice(-8)}`;
  const result = await pool.query(`INSERT INTO vehicles
    (stock_code,slug,make,model,model_year,category,listing_type,description,daily_rental_price_usd,weekly_rental_price_usd,monthly_rental_price_usd,sale_price_usd,transmission,fuel_type,seats,doors,mileage_limit_per_day,status,image_url,image_search_query,branch_id,registration_number,published,created_by,updated_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$24) RETURNING id,slug,stock_code`,
    [stockCode,slug,v.make,v.model,v.model_year,v.category,v.listing_type,v.description,v.daily_rental_price_usd ?? null,v.weekly_rental_price_usd ?? null,v.monthly_rental_price_usd ?? null,v.sale_price_usd ?? null,v.transmission,v.fuel_type,v.seats,v.doors,v.mileage_limit_per_day ?? null,v.status,v.image_url ?? null,v.image_search_query ?? null,v.branch_id ?? null,v.registration_number ?? null,v.published,req.user.id]);
  await pool.query(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES ($1,'vehicle.created','vehicle',$2,$3::jsonb)`, [req.user.id,result.rows[0].id,JSON.stringify({stockCode,slug})]);
  res.status(201).json({ data: result.rows[0] });
}));

router.patch('/:id/status', authenticate, requireRole(...fleetRoles), asyncHandler(async (req, res) => {
  const parsed = z.object({ status: z.enum(vehicleStatus), note: z.string().max(500).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose a valid fleet status.' } });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT id,status FROM vehicles WHERE id=$1 AND archived_at IS NULL FOR UPDATE', [req.params.id]);
    if (!current.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found.' } }); }
    await client.query('UPDATE vehicles SET status=$1, updated_by=$2, updated_at=now() WHERE id=$3', [parsed.data.status,req.user.id,req.params.id]);
    await client.query('INSERT INTO vehicle_status_history(vehicle_id,previous_status,new_status,changed_by,note) VALUES ($1,$2,$3,$4,$5)', [req.params.id,current.rows[0].status,parsed.data.status,req.user.id,parsed.data.note || null]);
    await client.query('INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES ($1,$2,\'vehicle\',$3,$4::jsonb)', [req.user.id,'vehicle.status_changed',req.params.id,JSON.stringify({from:current.rows[0].status,to:parsed.data.status})]);
    await client.query('COMMIT');
    res.json({ data: { id: req.params.id, status: parsed.data.status } });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

router.patch('/:id', authenticate, requireRole(...fleetRoles), asyncHandler(async (req, res) => {
  const parsed = createSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the vehicle details.', details: parsed.error.flatten() } });
  const editable = ['make','model','model_year','category','description','daily_rental_price_usd','weekly_rental_price_usd','monthly_rental_price_usd','sale_price_usd','transmission','fuel_type','seats','doors','mileage_limit_per_day','image_url','image_search_query','branch_id','registration_number','published','listing_type'];
  const updates = Object.entries(parsed.data).filter(([key]) => editable.includes(key));
  if (!updates.length) return res.status(400).json({ error: { code: 'NO_CHANGES', message: 'No editable vehicle fields were provided.' } });
  const identity = Object.fromEntries(updates);
  if (identity.make || identity.model || identity.model_year) {
    const current = await pool.query('SELECT make,model,model_year FROM vehicles WHERE id=$1 AND archived_at IS NULL', [req.params.id]);
    if (!current.rowCount) return res.status(404).json({ error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found.' } });
    const next = { ...current.rows[0], ...identity };
    updates.push(['slug', `${slugify(`${next.make}-${next.model}-${next.model_year}`)}-${Math.random().toString(36).slice(2,7)}`]);
  }
  const values = updates.map(([,value]) => value);
  const setSql = updates.map(([key],index) => `${key}=$${index+1}`).join(', ');
  values.push(req.user.id,req.params.id);
  const result = await pool.query(`UPDATE vehicles SET ${setSql}, updated_by=$${values.length-1}, updated_at=now() WHERE id=$${values.length} AND archived_at IS NULL RETURNING id,slug,stock_code`, values);
  if (!result.rowCount) return res.status(404).json({ error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found.' } });
  await pool.query(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES ($1,'vehicle.updated','vehicle',$2,$3::jsonb)`, [req.user.id,req.params.id,JSON.stringify({fields:updates.map(([key])=>key)})]);
  res.json({ data: result.rows[0] });
}));

router.delete('/:id', authenticate, requireRole(...fleetRoles), asyncHandler(async (req, res) => {
  const result = await pool.query(`UPDATE vehicles SET archived_at=now(), status='inactive', published=false, updated_by=$1, updated_at=now()
    WHERE id=$2 AND archived_at IS NULL RETURNING id`, [req.user.id,req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found.' } });
  await pool.query(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id) VALUES ($1,'vehicle.archived','vehicle',$2)`, [req.user.id,req.params.id]);
  res.status(204).end();
}));

export default router;
