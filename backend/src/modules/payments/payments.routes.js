import {Router} from 'express';
import {z} from 'zod';
import {authenticate} from '../../middleware/authenticate.js';
import {requireRole} from '../../middleware/authorize.js';
import {pool} from '../../db/pool.js';
import {asyncHandler} from '../../utils/http.js';
import {createCheckout,capturePayPalOrder,processRefund,verifyStripeSignature,handleStripeWebhook,verifyPayPalWebhook,handlePayPalWebhook} from '../../services/payments.js';
const router=Router();
router.post('/checkout',authenticate,asyncHandler(async(req,res)=>{
 const p=z.object({provider:z.enum(['stripe','paypal']),bookingId:z.string().uuid().optional(),shopOrderId:z.string().uuid().optional(),salesOrderId:z.string().uuid().optional()}).refine(v=>[v.bookingId,v.shopOrderId,v.salesOrderId].filter(Boolean).length===1).safeParse(req.body);
 if(!p.success)return res.status(422).json({error:{message:'Select one order and a supported payment provider.'}});
 res.status(201).json({data:await createCheckout({...p.data,userId:req.user.id})});
}));
router.post('/paypal/capture',authenticate,asyncHandler(async(req,res)=>{
 const p=z.object({transactionId:z.string().uuid()}).safeParse(req.body);if(!p.success)return res.status(422).json({error:{message:'Provide a valid transaction ID.'}});
 res.json({data:await capturePayPalOrder({transactionId:p.data.transactionId,userId:req.user.id})});
}));
router.get('/transactions/:id',authenticate,asyncHandler(async(req,res)=>{const r=await pool.query(`SELECT id,provider,provider_reference,amount_usd,currency,status,created_at FROM payment_transactions WHERE id=$1 AND user_id=$2`,[req.params.id,req.user.id]);if(!r.rowCount)return res.status(404).json({error:{message:'Payment transaction not found.'}});res.json({data:r.rows[0]});}));
router.get('/mine',authenticate,asyncHandler(async(req,res)=>{const r=await pool.query(`SELECT id,provider,amount_usd,currency,status,created_at FROM payment_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,[req.user.id]);res.json({data:r.rows});}));
router.get('/admin/transactions',authenticate,requireRole('super_admin','company_admin','finance_staff'),asyncHandler(async(req,res)=>{const r=await pool.query(`SELECT pt.*,u.email FROM payment_transactions pt LEFT JOIN users u ON u.id=pt.user_id ORDER BY pt.created_at DESC LIMIT 500`);res.json({data:r.rows});}));
router.post('/admin/refunds',authenticate,requireRole('super_admin','company_admin','finance_staff'),asyncHandler(async(req,res)=>{
 const p=z.object({transactionId:z.string().uuid(),amount:z.number().positive().optional(),reason:z.string().max(500).optional()}).safeParse(req.body);if(!p.success)return res.status(422).json({error:{message:'Provide a valid refund request.'}});
 const result=await processRefund({...p.data,userId:req.user.id});await pool.query(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,'payment.refund.processed','payment_transaction',$2,$3::jsonb)`,[req.user.id,p.data.transactionId,JSON.stringify(result)]);res.json({data:result});
}));
router.post('/webhooks/stripe',asyncHandler(async(req,res)=>{
 if(!verifyStripeSignature(req.rawBody,req.get('stripe-signature')))return res.status(400).json({error:{message:'Invalid Stripe signature.'}});
 await handleStripeWebhook(JSON.parse(req.rawBody.toString('utf8')));res.json({received:true});
}));
router.post('/webhooks/paypal',asyncHandler(async(req,res)=>{
 if(!await verifyPayPalWebhook(req.headers,req.body))return res.status(400).json({error:{message:'Invalid PayPal webhook signature.'}});
 await handlePayPalWebhook(req.body);res.json({received:true});
}));
export default router;
