import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/http.js';
import { createPresignedUrl, verifyObjectExists } from '../../services/private-storage.js';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';

const router = Router();
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
  COALESCE((SELECT vi.image_url FROM vehicle_images vi WHERE vi.vehicle_id=v.id AND vi.review_status='verified' ORDER BY vi.sort_order,vi.created_at LIMIT 1),v.image_url) AS image_url, v.image_search_query, v.image_source_url, v.image_license, v.image_credit, v.rental_price_reference_url, v.daily_rental_price_basis, v.is_demo, v.inventory_source, v.inventory_verification_status, v.rental_enabled, v.sale_enabled,
  b.name AS branch_name, b.city AS branch_city, b.state_code AS branch_state`;

const commonsImageCache = new Map();
router.get('/:slug/photo', asyncHandler(async (req, res) => {
  const cached = commonsImageCache.get(req.params.slug);
  if (cached && cached.expiresAt > Date.now()) return res.redirect(302, cached.url);
  const vehicle = await pool.query(`SELECT make, model, model_year, category, image_search_query FROM vehicles WHERE slug=$1 AND archived_at IS NULL LIMIT 1`, [req.params.slug]);
  if (!vehicle.rowCount) return res.status(404).end();
  const v = vehicle.rows[0];
  const search = String(v.image_search_query || `${v.model_year} ${v.make} ${v.model} automobile`).slice(0, 180);
  try {
    const endpoint = new URL('https://commons.wikimedia.org/w/api.php');
    endpoint.search = new URLSearchParams({ action:'query', generator:'search', gsrsearch:`filetype:bitmap ${search}`, gsrnamespace:'6', gsrlimit:'10', prop:'imageinfo', iiprop:'url|extmetadata', iiurlwidth:'1600', format:'json', origin:'*' }).toString();
    const response = await fetch(endpoint, { headers:{ 'User-Agent':'AutoLuxVehicleCatalogue/1.0 (vehicle photo lookup)' }, signal:AbortSignal.timeout(9000) });
    if (!response.ok) throw new Error('Commons image search failed');
    const payload = await response.json();
    const pages = Object.values(payload.query?.pages || {});
    const match = pages.find((page) => {
      const info = page.imageinfo?.[0];
      const url = info?.thumburl || info?.url || '';
      return /\.(jpe?g|png|webp)(\?|$)/i.test(url) && !/logo|icon|flag|diagram/i.test(page.title || '');
    });
    const info = match?.imageinfo?.[0];
    const imageUrl = info?.thumburl || info?.url;
    if (!imageUrl) return res.status(404).end();
    commonsImageCache.set(req.params.slug, { url:imageUrl, expiresAt:Date.now()+6*60*60*1000 });
    return res.redirect(302, imageUrl);
  } catch (error) {
    req.log?.warn?.({ err:error }, 'Vehicle image lookup failed');
    return res.status(502).end();
  }
}));

router.get('/filters', asyncHandler(async (_req, res) => {
  const [categories, makes] = await Promise.all([
    pool.query(`SELECT DISTINCT category FROM vehicles WHERE published=true AND archived_at IS NULL AND status='available' ORDER BY category`),
    pool.query(`SELECT DISTINCT make FROM vehicles WHERE published=true AND archived_at IS NULL AND status='available' ORDER BY make`)
  ]);
  res.json({ data: { categories: categories.rows.map((r) => r.category), makes: makes.rows.map((r) => r.make) } });
}));

router.get('/manage/all', authenticate, requirePermission('fleet.read'), asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || '').trim();
  const values = [];
  const where = ['v.archived_at IS NULL'];
  if (search) { values.push(`%${search}%`); where.push(`(v.make ILIKE $${values.length} OR v.model ILIKE $${values.length} OR v.stock_code ILIKE $${values.length})`); }
  if (status && vehicleStatus.includes(status)) { values.push(status); where.push(`v.status = $${values.length}`); }
  const result = await pool.query(`SELECT ${publicColumns}, v.published, v.is_demo, v.registration_number, v.branch_id, v.created_at, v.updated_at, (SELECT count(*)::int FROM vehicle_images vi WHERE vi.vehicle_id=v.id AND vi.review_status='verified') AS verified_photo_count, (SELECT count(*)::int FROM vehicle_documents vd WHERE vd.vehicle_id=v.id AND vd.document_type='registration' AND vd.status='verified') AS verified_registration_document_count, (SELECT count(*)::int FROM vehicle_documents vd WHERE vd.vehicle_id=v.id AND vd.document_type='ownership' AND vd.status='verified') AS verified_ownership_document_count
    FROM vehicles v LEFT JOIN branches b ON b.id=v.branch_id WHERE ${where.join(' AND ')} ORDER BY v.created_at DESC LIMIT 500`, values);
  res.json({ data: result.rows });
}));

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(48, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 12));
  const values = [];
  const where = ["v.published = true", "v.archived_at IS NULL", "v.status = 'available'", "(v.is_demo = true OR v.inventory_verification_status = 'verified')"];
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
  if (listingType === 'rental') where.push(`v.listing_type IN ('rental','both') AND v.is_demo=false AND v.inventory_verification_status='verified' AND v.rental_enabled=true`);
  if (listingType === 'sale') where.push(`v.listing_type IN ('sale','both') AND v.sale_enabled=true AND v.inventory_verification_status='verified'`);
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
  const images = await pool.query(`SELECT image_url, source_page_url, license_name, creator_credit, alt_text FROM vehicle_images WHERE vehicle_id=$1 AND review_status='verified' ORDER BY sort_order`, [result.rows[0].id]);
  res.json({ data: { ...result.rows[0], images: images.rows } });
}));

router.post('/', authenticate, requirePermission('fleet.manage'), asyncHandler(async (req, res) => {
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




router.get('/:id/documents',authenticate,requirePermission('fleet.read'),asyncHandler(async(req,res)=>{const r=await pool.query(`SELECT id,document_type,storage_key,original_filename,mime_type,file_size_bytes,status,review_note,reviewed_at,created_at FROM vehicle_documents WHERE vehicle_id=$1 ORDER BY created_at DESC`,[req.params.id]);res.json({data:r.rows.map(({storage_key,...doc})=>({...doc,downloadUrl:storage_key?createPresignedUrl('GET',storage_key):null}))});}));
router.post('/:id/documents/presign',authenticate,requirePermission('fleet.manage'),asyncHandler(async(req,res)=>{
 const p=z.object({documentType:z.enum(['registration','ownership','insurance','inspection']),filename:z.string().min(1).max(180),mimeType:z.enum(['image/jpeg','image/png','application/pdf']),fileSizeBytes:z.number().int().positive().max(10*1024*1024)}).safeParse(req.body);if(!p.success)return res.status(422).json({error:{message:'Upload a JPG, PNG, or PDF file up to 10 MB.'}});
 const vehicle=await pool.query('SELECT id,is_demo FROM vehicles WHERE id=$1 AND archived_at IS NULL',[req.params.id]);if(!vehicle.rowCount)return res.status(404).json({error:{message:'Vehicle not found.'}});if(vehicle.rows[0].is_demo)return res.status(409).json({error:{message:'Demonstration vehicles cannot have ownership documents.'}});
 const ext={'image/jpeg':'jpg','image/png':'png','application/pdf':'pdf'}[p.data.mimeType];const key=`vehicle-documents/${req.params.id}/${crypto.randomUUID()}.${ext}`;const uploadUrl=createPresignedUrl('PUT',key,p.data.mimeType);const row=await pool.query(`INSERT INTO vehicle_documents(vehicle_id,document_type,storage_key,original_filename,mime_type,file_size_bytes,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[req.params.id,p.data.documentType,key,p.data.filename,p.data.mimeType,p.data.fileSizeBytes,req.user.id]);res.status(201).json({data:{documentId:row.rows[0].id,uploadUrl,expiresInSeconds:600,requiredHeaders:{'Content-Type':p.data.mimeType}}});
}));
router.post('/:id/documents/:documentId/complete',authenticate,requirePermission('fleet.manage'),asyncHandler(async(req,res)=>{const r=await pool.query(`SELECT id,storage_key,file_size_bytes FROM vehicle_documents WHERE id=$1 AND vehicle_id=$2 AND uploaded_by=$3 AND status='pending'`,[req.params.documentId,req.params.id,req.user.id]);if(!r.rowCount)return res.status(404).json({error:{message:'Pending vehicle document not found.'}});if(!await verifyObjectExists(r.rows[0].storage_key,r.rows[0].file_size_bytes))return res.status(409).json({error:{message:'Uploaded document could not be verified in private storage.'}});await pool.query(`UPDATE vehicle_documents SET status='under_review' WHERE id=$1`,[req.params.documentId]);res.json({data:{id:req.params.documentId,status:'under_review'}});}));
router.patch('/:id/documents/:documentId/review',authenticate,requirePermission('fleet.manage'),asyncHandler(async(req,res)=>{const p=z.object({status:z.enum(['verified','rejected']),note:z.string().min(5).max(500)}).safeParse(req.body);if(!p.success)return res.status(422).json({error:{message:'Provide a review decision and note.'}});const r=await pool.query(`UPDATE vehicle_documents SET status=$3,reviewed_by=$4,reviewed_at=now(),review_note=$5 WHERE id=$1 AND vehicle_id=$2 AND status IN ('pending','under_review') RETURNING id,document_type,status`,[req.params.documentId,req.params.id,p.data.status,req.user.id,p.data.note]);if(!r.rowCount)return res.status(404).json({error:{message:'Reviewable vehicle document not found.'}});await pool.query(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,'fleet.vehicle_document.reviewed','vehicle_document',$2,$3::jsonb)`,[req.user.id,req.params.documentId,JSON.stringify(p.data)]);res.json({data:r.rows[0]});}));

router.get('/:id/images',authenticate,requirePermission('fleet.read'),asyncHandler(async(req,res)=>{const r=await pool.query(`SELECT id,image_url,alt_text,review_status,reviewed_at,creator_credit FROM vehicle_images WHERE vehicle_id=$1 ORDER BY sort_order,created_at`,[req.params.id]);res.json({data:r.rows});}));
router.post('/:id/images/presign',authenticate,requirePermission('fleet.manage'),asyncHandler(async(req,res)=>{
 const p=z.object({filename:z.string().min(1).max(180),mimeType:z.enum(['image/jpeg','image/png','image/webp']),fileSizeBytes:z.number().int().positive().max(15*1024*1024),altText:z.string().min(5).max(240)}).safeParse(req.body);
 if(!p.success)return res.status(422).json({error:{message:'Provide a JPG, PNG, or WebP photo up to 15 MB with descriptive alt text.'}});
 const vehicle=await pool.query('SELECT id,is_demo FROM vehicles WHERE id=$1 AND archived_at IS NULL',[req.params.id]);if(!vehicle.rowCount)return res.status(404).json({error:{message:'Vehicle not found.'}});if(vehicle.rows[0].is_demo)return res.status(409).json({error:{message:'Real fleet photographs cannot be attached to a demonstration catalogue record.'}});
 if(!env.PUBLIC_ASSET_BASE_URL){const e=new Error('Public asset CDN URL is pending configuration.');e.status=503;throw e;}const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[p.data.mimeType];const key=`vehicle-images/${req.params.id}/${crypto.randomUUID()}.${ext}`;const uploadUrl=createPresignedUrl('PUT',key,p.data.mimeType);
 res.status(201).json({data:{uploadUrl,storageKey:key,publicUrl:`${env.PUBLIC_ASSET_BASE_URL.replace(/\/$/,'')}/${key}`,expiresInSeconds:600,requiredHeaders:{'Content-Type':p.data.mimeType},altText:p.data.altText}});
}));
router.post('/:id/images/complete',authenticate,requirePermission('fleet.manage'),asyncHandler(async(req,res)=>{
 const p=z.object({storageKey:z.string().min(10).max(500),publicUrl:z.string().url(),altText:z.string().min(5).max(240),fileSizeBytes:z.number().int().positive().max(15*1024*1024)}).safeParse(req.body);if(!p.success)return res.status(422).json({error:{message:'Invalid uploaded image details.'}});
 if(!env.PUBLIC_ASSET_BASE_URL){const e=new Error('Public asset CDN URL is pending configuration.');e.status=503;throw e;}const assetBase=new URL(env.PUBLIC_ASSET_BASE_URL);const imageUrl=new URL(p.data.publicUrl);if(!p.data.storageKey.startsWith(`vehicle-images/${req.params.id}/`)||imageUrl.origin!==assetBase.origin||!imageUrl.pathname.startsWith(`${assetBase.pathname.replace(/\/$/,'')}/`)){return res.status(400).json({error:{message:'Image storage path does not match this vehicle.'}});}
 const vehicle=await pool.query('SELECT id,is_demo FROM vehicles WHERE id=$1 AND archived_at IS NULL',[req.params.id]);if(!vehicle.rowCount||vehicle.rows[0].is_demo)return res.status(404).json({error:{message:'Real fleet vehicle not found.'}});
 if(!await verifyObjectExists(p.data.storageKey,p.data.fileSizeBytes))return res.status(409).json({error:{message:'Uploaded image could not be verified or its size does not match the declared upload.'}});
 const r=await pool.query(`INSERT INTO vehicle_images(vehicle_id,image_url,source_page_url,license_name,creator_credit,alt_text,storage_key,review_status,file_size_bytes) VALUES($1,$2,$2,'AutoLux-owned uploaded photograph',$3,$4,$5,'pending',$6) RETURNING id,review_status,created_at`,[req.params.id,p.data.publicUrl,req.user.email,p.data.altText,p.data.storageKey,p.data.fileSizeBytes]);res.status(201).json({data:r.rows[0],message:'Photograph uploaded and queued for individual staff verification.'});
}));
router.patch('/:id/images/:imageId/review',authenticate,requirePermission('fleet.manage'),asyncHandler(async(req,res)=>{
 const p=z.object({status:z.enum(['verified','rejected']),note:z.string().min(5).max(500)}).safeParse(req.body);if(!p.success)return res.status(422).json({error:{message:'Provide a photo review decision and note.'}});
 const r=await pool.query(`UPDATE vehicle_images SET review_status=$3,reviewed_by=$4,reviewed_at=now() WHERE id=$1 AND vehicle_id=$2 RETURNING id,review_status`,[req.params.imageId,req.params.id,p.data.status,req.user.id]);if(!r.rowCount)return res.status(404).json({error:{message:'Vehicle photograph not found.'}});await pool.query(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,'fleet.vehicle_photo.reviewed','vehicle_image',$2,$3::jsonb)`,[req.user.id,req.params.imageId,JSON.stringify(p.data)]);res.json({data:r.rows[0]});
}));

router.patch('/:id/verification', authenticate, requirePermission('fleet.manage'), asyncHandler(async(req,res)=>{
 const parsed=z.object({status:z.enum(['verified','rejected']),note:z.string().trim().min(5).max(1000)}).safeParse(req.body);
 if(!parsed.success)return res.status(422).json({error:{message:'Provide a verification decision and a review note.'}});
 const client=await pool.connect();
 try{await client.query('BEGIN');
  const current=await client.query(`SELECT id,is_demo,inventory_source,registration_number,listing_type FROM vehicles WHERE id=$1 AND archived_at IS NULL FOR UPDATE`,[req.params.id]);
  if(!current.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:{message:'Vehicle not found.'}});}
  if(current.rows[0].is_demo||current.rows[0].inventory_source==='demo'){await client.query('ROLLBACK');return res.status(409).json({error:{message:'Demonstration catalogue records cannot be verified as real AutoLux inventory.'}});}
  if(parsed.data.status==='verified'){
   if(current.rows[0].inventory_source==='partner'){await client.query('ROLLBACK');return res.status(409).json({error:{message:'Partner inventory must pass the dealership listing approval workflow.'}});}
   if(!current.rows[0].registration_number){await client.query('ROLLBACK');return res.status(409).json({error:{message:'A verified registration record is required before fleet approval.'}});}
   const documents=await client.query(`SELECT count(*) FILTER(WHERE document_type='registration' AND status='verified')::int registration,count(*) FILTER(WHERE document_type='ownership' AND status='verified')::int ownership FROM vehicle_documents WHERE vehicle_id=$1`,[req.params.id]);
   if(!documents.rows[0].registration||!documents.rows[0].ownership){await client.query('ROLLBACK');return res.status(409).json({error:{message:'Verified registration and ownership documents are required before fleet approval.'}});}
   const images=await client.query(`SELECT count(*)::int total FROM vehicle_images WHERE vehicle_id=$1 AND review_status='verified'`,[req.params.id]);
   if(images.rows[0].total<1){await client.query('ROLLBACK');return res.status(409).json({error:{message:'At least one individually reviewed and approved vehicle photograph is required before approval.'}});}
  }
  await client.query(`UPDATE vehicles SET inventory_verification_status=$1,rental_enabled=($1='verified' AND listing_type IN ('rental','both')),sale_enabled=($1='verified' AND listing_type IN ('sale','both')),updated_by=$2,updated_at=now() WHERE id=$3`,[parsed.data.status,req.user.id,req.params.id]);
  await client.query(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,'fleet.inventory.verification_changed','vehicle',$2,$3::jsonb)`,[req.user.id,req.params.id,JSON.stringify(parsed.data)]);
  await client.query('COMMIT');res.json({data:{id:req.params.id,verificationStatus:parsed.data.status}});
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}));

router.patch('/:id/status', authenticate, requirePermission('fleet.manage'), asyncHandler(async (req, res) => {
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

router.patch('/:id', authenticate, requirePermission('fleet.manage'), asyncHandler(async (req, res) => {
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

router.delete('/:id', authenticate, requirePermission('fleet.manage'), asyncHandler(async (req, res) => {
  const result = await pool.query(`UPDATE vehicles SET archived_at=now(), status='inactive', published=false, updated_by=$1, updated_at=now()
    WHERE id=$2 AND archived_at IS NULL RETURNING id`, [req.user.id,req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found.' } });
  await pool.query(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id) VALUES ($1,'vehicle.archived','vehicle',$2)`, [req.user.id,req.params.id]);
  res.status(204).end();
}));

export default router;
