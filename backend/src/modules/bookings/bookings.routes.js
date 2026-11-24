import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/http.js';

const router = Router();
const staffRoles = ['super_admin', 'company_admin', 'fleet_manager'];
const bookingSchema = z.object({
  vehicleId:z.string().uuid(), pickupLocation:z.string().trim().min(2).max(180),
  dropoffLocation:z.string().trim().min(2).max(180), pickupAt:z.string().datetime({offset:true}),
  returnAt:z.string().datetime({offset:true}), pickupMethod:z.enum(['branch','delivery']).default('branch'), dropoffMethod:z.enum(['branch','delivery']).default('branch'), note:z.string().max(1000).optional().default('')
});
const transitions = {
  pending:['confirmed','rejected','cancelled'],
  confirmed:['active','cancelled'],
  active:['completed'], rejected:[], cancelled:[], completed:[]
};

router.get('/availability', asyncHandler(async (req,res) => {
  const parsed=z.object({vehicleId:z.string().uuid(),pickupAt:z.string().datetime({offset:true}),returnAt:z.string().datetime({offset:true})}).safeParse(req.query);
  if(!parsed.success)return res.status(400).json({error:{code:'INVALID_AVAILABILITY_QUERY',message:'Provide a vehicle and valid pickup and return dates.'}});
  const {vehicleId,pickupAt,returnAt}=parsed.data;
  if(new Date(returnAt)<=new Date(pickupAt))return res.status(400).json({error:{code:'INVALID_DATE_RANGE',message:'Return must be after pickup.'}});
  const result=await pool.query(`SELECT v.id,v.status,v.daily_rental_price_usd,NOT EXISTS(SELECT 1 FROM rental_bookings rb WHERE rb.vehicle_id=v.id AND rb.status IN ('pending','confirmed','active') AND rb.pickup_at < $3::timestamptz AND rb.return_at > $2::timestamptz) AS available FROM vehicles v WHERE v.id=$1 AND v.published=true AND v.archived_at IS NULL`,[vehicleId,pickupAt,returnAt]);
  if(!result.rowCount)return res.status(404).json({error:{code:'VEHICLE_NOT_FOUND',message:'Vehicle not found.'}});
  const row=result.rows[0]; res.json({data:{...row,available:Boolean(row.available)&&row.status==='available'}});
}));

router.post('/',authenticate,asyncHandler(async(req,res)=>{
  const parsed=bookingSchema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Check the reservation details.',details:parsed.error.flatten()}});
  const v=parsed.data,pickup=new Date(v.pickupAt),dropoff=new Date(v.returnAt);
  if(dropoff<=pickup||pickup<new Date(Date.now()-60000))return res.status(400).json({error:{code:'INVALID_DATE_RANGE',message:'Choose a future pickup and a later return date.'}});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const vehicle=await client.query(`SELECT id,daily_rental_price_usd,status FROM vehicles WHERE id=$1 AND published=true AND archived_at IS NULL FOR UPDATE`,[v.vehicleId]);
    if(!vehicle.rowCount||vehicle.rows[0].status!=='available'||vehicle.rows[0].daily_rental_price_usd==null){await client.query('ROLLBACK');return res.status(409).json({error:{code:'VEHICLE_NOT_BOOKABLE',message:'This vehicle is not currently available for online rental.'}});}
    const conflict=await client.query(`SELECT id FROM rental_bookings WHERE vehicle_id=$1 AND status IN ('pending','confirmed','active') AND pickup_at < $3::timestamptz AND return_at > $2::timestamptz LIMIT 1`,[v.vehicleId,v.pickupAt,v.returnAt]);
    if(conflict.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:{code:'DATES_UNAVAILABLE',message:'This vehicle is already requested for part of those dates. Choose another date range.'}});}
    const days=Math.max(1,Math.ceil((dropoff-pickup)/86400000)),daily=Number(vehicle.rows[0].daily_rental_price_usd);
    const number=`ALX-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;
    const inserted=await client.query(`INSERT INTO rental_bookings(booking_number,customer_id,vehicle_id,pickup_location,dropoff_location,pickup_at,return_at,rental_days,daily_rate_usd,estimated_total_usd,customer_note,pickup_method,dropoff_method) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id,booking_number,status,rental_days,daily_rate_usd,estimated_total_usd,pickup_at,return_at`,[number,req.user.id,v.vehicleId,v.pickupLocation,v.dropoffLocation,v.pickupAt,v.returnAt,days,daily,daily*days,v.note,v.pickupMethod,v.dropoffMethod]);
    await client.query(`INSERT INTO rental_booking_events(booking_id,actor_user_id,event_type,details) VALUES($1,$2,'booking.requested',$3::jsonb)`,[inserted.rows[0].id,req.user.id,JSON.stringify({source:'website'})]);
    await client.query('COMMIT');
    res.status(201).json({data:inserted.rows[0],message:'Reservation request received. AutoLux will confirm availability and final charges.'});
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));

router.get('/mine',authenticate,asyncHandler(async(req,res)=>{
  const result=await pool.query(`SELECT rb.*,v.make,v.model,v.model_year,v.slug FROM rental_bookings rb JOIN vehicles v ON v.id=rb.vehicle_id WHERE rb.customer_id=$1 ORDER BY rb.created_at DESC`,[req.user.id]);
  res.json({data:result.rows});
}));
router.patch('/:id/cancel',authenticate,asyncHandler(async(req,res)=>{
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const current=await client.query(`SELECT id,status FROM rental_bookings WHERE id=$1 AND customer_id=$2 FOR UPDATE`,[req.params.id,req.user.id]);
    if(!current.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:{code:'BOOKING_NOT_FOUND',message:'Reservation not found.'}});}
    if(!['pending','confirmed'].includes(current.rows[0].status)){await client.query('ROLLBACK');return res.status(409).json({error:{code:'BOOKING_CANNOT_CANCEL',message:'This reservation can no longer be cancelled online. Contact AutoLux support.'}});}
    const updated=await client.query(`UPDATE rental_bookings SET status='cancelled',updated_at=now() WHERE id=$1 RETURNING id,booking_number,status`,[req.params.id]);
    await client.query(`INSERT INTO rental_booking_events(booking_id,actor_user_id,event_type,details) VALUES($1,$2,'booking.cancelled',jsonb_build_object('source','customer'))`,[req.params.id,req.user.id]);
    await client.query('COMMIT'); res.json({data:updated.rows[0]});
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));

router.get('/manage/summary',authenticate,requireRole(...staffRoles),asyncHandler(async(_req,res)=>{
  const result=await pool.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE status='pending')::int AS pending,count(*) FILTER(WHERE status='confirmed')::int AS confirmed,count(*) FILTER(WHERE status='active')::int AS active,count(*) FILTER(WHERE status='completed')::int AS completed,count(*) FILTER(WHERE status IN ('cancelled','rejected'))::int AS closed,COALESCE(sum(estimated_total_usd) FILTER(WHERE status IN ('confirmed','active','completed')),0)::numeric(14,2) AS confirmed_value FROM rental_bookings`);
  res.json({data:result.rows[0]});
}));
router.get('/manage/all',authenticate,requireRole(...staffRoles),asyncHandler(async(req,res)=>{
  const values=[],where=[]; const status=String(req.query.status||'').trim(); const search=String(req.query.search||'').trim().slice(0,100);
  if(['pending','confirmed','active','completed','cancelled','rejected'].includes(status)){values.push(status);where.push(`rb.status=$${values.length}`);}
  if(search){values.push(`%${search}%`);where.push(`(rb.booking_number ILIKE $${values.length} OR u.email ILIKE $${values.length} OR u.first_name ILIKE $${values.length} OR u.last_name ILIKE $${values.length} OR v.make ILIKE $${values.length} OR v.model ILIKE $${values.length})`);}
  const result=await pool.query(`SELECT rb.*,v.make,v.model,v.model_year,v.slug,u.email AS customer_email,u.first_name,u.last_name FROM rental_bookings rb JOIN vehicles v ON v.id=rb.vehicle_id JOIN users u ON u.id=rb.customer_id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY CASE rb.status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'active' THEN 2 ELSE 3 END,rb.created_at DESC LIMIT 500`,values);
  res.json({data:result.rows});
}));
router.get('/:id/events',authenticate,asyncHandler(async(req,res)=>{
  const owned=await pool.query(`SELECT customer_id FROM rental_bookings WHERE id=$1`,[req.params.id]);
  if(!owned.rowCount)return res.status(404).json({error:{code:'BOOKING_NOT_FOUND',message:'Reservation not found.'}});
  const isStaff=req.user.roles?.some(role=>staffRoles.includes(role));
  if(owned.rows[0].customer_id!==req.user.id&&!isStaff)return res.status(403).json({error:{code:'FORBIDDEN',message:'You cannot view this reservation.'}});
  const events=await pool.query(`SELECT event_type,details,created_at FROM rental_booking_events WHERE booking_id=$1 ORDER BY created_at ASC`,[req.params.id]);
  res.json({data:events.rows});
}));
router.patch('/:id/status',authenticate,requireRole(...staffRoles),asyncHandler(async(req,res)=>{
  const parsed=z.object({status:z.enum(['confirmed','rejected','cancelled','active','completed']),note:z.string().max(500).optional()}).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:{code:'INVALID_BOOKING_STATUS',message:'Choose a valid reservation status.'}});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const current=await client.query(`SELECT id,status FROM rental_bookings WHERE id=$1 FOR UPDATE`,[req.params.id]);
    if(!current.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:{code:'BOOKING_NOT_FOUND',message:'Reservation not found.'}});}
    if(!transitions[current.rows[0].status]?.includes(parsed.data.status)){await client.query('ROLLBACK');return res.status(409).json({error:{code:'INVALID_STATUS_TRANSITION',message:`A reservation cannot move from ${current.rows[0].status} to ${parsed.data.status}.`}});}
    const updated=await client.query(`UPDATE rental_bookings SET status=$1,updated_at=now() WHERE id=$2 RETURNING id,booking_number,status`,[parsed.data.status,req.params.id]);
    await client.query(`INSERT INTO rental_booking_events(booking_id,actor_user_id,event_type,details) VALUES($1,$2,$3,$4::jsonb)`,[req.params.id,req.user.id,`booking.${parsed.data.status}`,JSON.stringify({note:parsed.data.note||''})]);
    await client.query('COMMIT'); res.json({data:updated.rows[0]});
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}));
export default router;
