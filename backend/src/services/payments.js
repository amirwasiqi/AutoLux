import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

async function paypalAccessToken(){
 if(!env.PAYPAL_CLIENT_ID||!env.PAYPAL_CLIENT_SECRET){const e=new Error('PayPal is pending configuration.');e.status=503;throw e;}
 const auth=Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
 const response=await fetch(`${env.PAYPAL_BASE_URL}/v1/oauth2/token`,{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error(`PayPal authentication failed (${response.status}).`);return (await response.json()).access_token;
}
export async function createCheckout({provider,userId,bookingId,shopOrderId,salesOrderId}){
 if(provider==='stripe'&&!env.STRIPE_SECRET_KEY){const e=new Error('Stripe is pending configuration.');e.status=503;throw e;}
 if(provider==='paypal'&&(!env.PAYPAL_CLIENT_ID||!env.PAYPAL_CLIENT_SECRET)){const e=new Error('PayPal is pending configuration.');e.status=503;throw e;}
 let source;
 if(bookingId){const r=await pool.query(`SELECT id,customer_id,booking_number,estimated_total_usd amount,payment_status FROM rental_bookings WHERE id=$1`,[bookingId]);source=r.rows[0];}
 else if(shopOrderId){const r=await pool.query(`SELECT id,customer_id,order_number,total_usd amount,status FROM shop_orders WHERE id=$1`,[shopOrderId]);source=r.rows[0];}
 else if(salesOrderId){const r=await pool.query(`SELECT id,customer_id,order_number,GREATEST(0,deposit_due_usd-deposit_paid_usd) amount,status FROM vehicle_sales_orders WHERE id=$1`,[salesOrderId]);source=r.rows[0];}
 if(!source||source.customer_id!==userId){const e=new Error('Order not found.');e.status=404;throw e;}
 if(bookingId&&['paid','refunded'].includes(source.payment_status)){const e=new Error('This reservation has already been paid or refunded.');e.status=409;throw e;}if(shopOrderId&&source.status!=='pending'){const e=new Error('This shop order is not awaiting payment.');e.status=409;throw e;}if(salesOrderId&&!['draft','awaiting_deposit'].includes(source.status)){const e=new Error('This sales order is not awaiting a deposit.');e.status=409;throw e;}const amount=Number(source.amount);if(!Number.isFinite(amount)||amount<=0){const e=new Error('This order has no payable balance.');e.status=409;throw e;}
 const idempotencyKey=crypto.randomUUID();
 const transaction=await pool.query(`INSERT INTO payment_transactions(provider,idempotency_key,user_id,booking_id,shop_order_id,sales_order_id,amount_usd,status) VALUES($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING id`,[provider,idempotencyKey,userId,bookingId||null,shopOrderId||null,salesOrderId||null,amount]);
 const txId=transaction.rows[0].id;
 try{
  if(provider==='stripe'){
   const body=new URLSearchParams({mode:'payment','success_url':`${env.FRONTEND_ORIGIN}/payment/success?transaction_id=${txId}&session_id={CHECKOUT_SESSION_ID}`,'cancel_url':`${env.FRONTEND_ORIGIN}/payment/cancel`,'client_reference_id':txId,'metadata[transaction_id]':txId,'payment_intent_data[metadata][transaction_id]':txId,'line_items[0][quantity]':'1','line_items[0][price_data][currency]':'usd','line_items[0][price_data][unit_amount]':String(Math.round(amount*100)),'line_items[0][price_data][product_data][name]':`AutoLux order ${source.booking_number||source.order_number}`});
   const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':idempotencyKey},body,signal:AbortSignal.timeout(15000)});
   const payload=await response.json();if(!response.ok)throw new Error(payload.error?.message||'Stripe checkout creation failed.');
   await pool.query('UPDATE payment_transactions SET provider_reference=$2,metadata=$3::jsonb,updated_at=now() WHERE id=$1',[txId,payload.id,JSON.stringify({checkoutUrl:payload.url})]);
   return {transactionId:txId,provider,checkoutUrl:payload.url,status:'pending'};
  }
  if(provider==='paypal'){
   const token=await paypalAccessToken();
   const response=await fetch(`${env.PAYPAL_BASE_URL}/v2/checkout/orders`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','PayPal-Request-Id':idempotencyKey},body:JSON.stringify({intent:'CAPTURE',purchase_units:[{reference_id:txId,custom_id:txId,invoice_id:txId,description:`AutoLux order ${source.booking_number||source.order_number}`,amount:{currency_code:'USD',value:amount.toFixed(2)}}],application_context:{return_url:`${env.FRONTEND_ORIGIN}/payment/success?transaction_id=${txId}`,cancel_url:`${env.FRONTEND_ORIGIN}/payment/cancel`}}),signal:AbortSignal.timeout(15000)});
   const payload=await response.json();if(!response.ok)throw new Error(payload.message||'PayPal checkout creation failed.');
   await pool.query('UPDATE payment_transactions SET provider_reference=$2,metadata=$3::jsonb,updated_at=now() WHERE id=$1',[txId,payload.id,JSON.stringify({approveUrl:payload.links?.find(x=>x.rel==='approve')?.href})]);
   return {transactionId:txId,provider,checkoutUrl:payload.links?.find(x=>x.rel==='approve')?.href,status:'pending'};
  }
  const e=new Error('Unsupported payment provider.');e.status=400;throw e;
 }catch(error){await finalizePayment(txId,false,{creationError:error.message.slice(0,250)});throw error;}
}

async function finalizePayment(txId,succeeded,metadata={}){
 const client=await pool.connect();
 try{await client.query('BEGIN');
  const tx=await client.query(`SELECT * FROM payment_transactions WHERE id=$1 FOR UPDATE`,[txId]);
  if(!tx.rowCount||['succeeded','refunded','partially_refunded'].includes(tx.rows[0].status)){await client.query('COMMIT');return;}
  const row=tx.rows[0];
  await client.query(`UPDATE payment_transactions SET status=$2,metadata=metadata||$3::jsonb,updated_at=now() WHERE id=$1`,[txId,succeeded?'succeeded':'failed',JSON.stringify(metadata)]);
  if(row.booking_id) await client.query(`UPDATE rental_bookings SET payment_status=$2,updated_at=now() WHERE id=$1`,[row.booking_id,succeeded?'paid':'failed']);
  if(row.sales_order_id&&succeeded) await client.query(`UPDATE vehicle_sales_orders SET deposit_paid_usd=deposit_due_usd,status='deposit_paid',updated_at=now() WHERE id=$1`,[row.sales_order_id]);
  if(row.shop_order_id){
   await client.query(`UPDATE shop_orders SET status=$2,updated_at=now() WHERE id=$1`,[row.shop_order_id,succeeded?'processing':'cancelled']);
   const items=await client.query('SELECT product_id,quantity,fulfillment_mode FROM shop_order_items WHERE order_id=$1',[row.shop_order_id]);
   for(const item of items.rows) if(item.fulfillment_mode==='autolux') await client.query(`UPDATE product_inventory SET reserved=GREATEST(0,reserved-$2),on_hand=CASE WHEN $3 THEN GREATEST(0,on_hand-$2) ELSE on_hand END,updated_at=now() WHERE product_id=$1`,[item.product_id,item.quantity,succeeded]);
   if(succeeded) { const redemption=await client.query(`UPDATE coupon_redemptions SET status='redeemed',redeemed_at=now() WHERE shop_order_id=$1 AND status='reserved' RETURNING coupon_id`,[row.shop_order_id]); if(redemption.rowCount) await client.query('UPDATE coupons SET redemption_count=redemption_count+1 WHERE id=$1',[redemption.rows[0].coupon_id]); } else await client.query(`UPDATE coupon_redemptions SET status='released' WHERE shop_order_id=$1 AND status='reserved'`,[row.shop_order_id]);
  }
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function capturePayPalOrder({transactionId,userId}){
 const tx=await pool.query(`SELECT id,provider_reference,status FROM payment_transactions WHERE id=$1 AND user_id=$2 AND provider='paypal'`,[transactionId,userId]);
 if(!tx.rowCount) {const e=new Error('Payment transaction not found.');e.status=404;throw e;}
 if(tx.rows[0].status==='succeeded')return {status:'succeeded'};
 const token=await paypalAccessToken();
 const response=await fetch(`${env.PAYPAL_BASE_URL}/v2/checkout/orders/${encodeURIComponent(tx.rows[0].provider_reference)}/capture`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','PayPal-Request-Id':crypto.randomUUID()},body:'{}',signal:AbortSignal.timeout(15000)});
 const payload=await response.json();if(!response.ok)throw new Error(payload.message||'PayPal capture failed.');
 const capture=payload.purchase_units?.[0]?.payments?.captures?.[0];
 if(capture?.status==='COMPLETED')await finalizePayment(transactionId,true,{paypalCaptureId:capture.id});
 return {status:capture?.status?.toLowerCase()||payload.status?.toLowerCase()||'pending'};
}
export async function processRefund({transactionId,amount,userId,reason}){
 const tx=await pool.query(`SELECT * FROM payment_transactions WHERE id=$1`,[transactionId]);
 if(!tx.rowCount){const e=new Error('Payment transaction not found.');e.status=404;throw e;}
 const row=tx.rows[0];if(!['stripe','paypal'].includes(row.provider)){const e=new Error('Automated refunds are supported only for Stripe and PayPal transactions.');e.status=409;throw e;}if(!['succeeded','partially_refunded'].includes(row.status)){const e=new Error('Only successful payments can be refunded.');e.status=409;throw e;}
 const totalRefunded=await pool.query(`SELECT COALESCE(sum(amount_usd),0)::numeric total FROM payment_refunds WHERE transaction_id=$1 AND status='succeeded'`,[transactionId]);
 const refundAmount=amount==null?Number(row.amount_usd)-Number(totalRefunded.rows[0].total):Number(amount);
 if(refundAmount<=0||refundAmount>Number(row.amount_usd)-Number(totalRefunded.rows[0].total)){const e=new Error('Refund amount exceeds the refundable balance.');e.status=422;throw e;}
 const refund=await pool.query(`INSERT INTO payment_refunds(transaction_id,amount_usd,reason,status) VALUES($1,$2,$3,'pending') RETURNING id`,[transactionId,refundAmount,reason||null]);
 try{
  let providerReference=null;
  if(row.provider==='stripe'){
   if(!env.STRIPE_SECRET_KEY)throw new Error('Stripe is not configured.');
   const paymentIntent=row.metadata?.stripePaymentIntent;if(!paymentIntent)throw new Error('Stripe payment intent is missing from the transaction.');
   const body=new URLSearchParams({payment_intent:paymentIntent,amount:String(Math.round(refundAmount*100)),reason:'requested_by_customer'});
   const response=await fetch('https://api.stripe.com/v1/refunds',{method:'POST',headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':refund.rows[0].id},body,signal:AbortSignal.timeout(15000)});const payload=await response.json();if(!response.ok)throw new Error(payload.error?.message||'Stripe refund failed.');providerReference=payload.id;
  }else if(row.provider==='paypal'){
   if(!env.PAYPAL_CLIENT_ID||!env.PAYPAL_CLIENT_SECRET)throw new Error('PayPal is not configured.');
   const captureId=row.metadata?.paypalCaptureId;if(!captureId)throw new Error('PayPal capture ID is missing from the transaction.');
   const token=await paypalAccessToken();const response=await fetch(`${env.PAYPAL_BASE_URL}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','PayPal-Request-Id':refund.rows[0].id},body:JSON.stringify({amount:{value:refundAmount.toFixed(2),currency_code:'USD'},note_to_payer:reason||'AutoLux refund'}),signal:AbortSignal.timeout(15000)});const payload=await response.json();if(!response.ok)throw new Error(payload.message||'PayPal refund failed.');providerReference=payload.id;
  }
  await pool.query(`UPDATE payment_refunds SET status='succeeded',provider_reference=$2 WHERE id=$1`,[refund.rows[0].id,providerReference]);
  const nowRefunded=Number(totalRefunded.rows[0].total)+refundAmount;
  await pool.query(`UPDATE payment_transactions SET status=$2,updated_at=now() WHERE id=$1`,[transactionId,nowRefunded>=Number(row.amount_usd)?'refunded':'partially_refunded']);
  if(nowRefunded>=Number(row.amount_usd)){if(row.booking_id)await pool.query(`UPDATE rental_bookings SET payment_status='refunded',updated_at=now() WHERE id=$1`,[row.booking_id]);if(row.shop_order_id)await pool.query(`UPDATE shop_orders SET status='refunded',updated_at=now() WHERE id=$1`,[row.shop_order_id]);if(row.sales_order_id)await pool.query(`UPDATE vehicle_sales_orders SET status='refunded',updated_at=now() WHERE id=$1`,[row.sales_order_id]);}
  return {refundId:refund.rows[0].id,amount:refundAmount,status:'succeeded'};
 }catch(error){await pool.query(`UPDATE payment_refunds SET status='failed' WHERE id=$1`,[refund.rows[0].id]);throw error;}
}

export function verifyStripeSignature(rawBody,header){
 if(!env.STRIPE_WEBHOOK_SECRET||!header)return false;
 const parts=Object.fromEntries(header.split(',').map(x=>x.split('=')));
 if(!parts.t||!parts.v1)return false;
 const signed=`${parts.t}.${rawBody.toString('utf8')}`;
 const expected=crypto.createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(signed).digest('hex');
 const a=Buffer.from(expected),b=Buffer.from(parts.v1);return a.length===b.length&&crypto.timingSafeEqual(a,b)&&Math.abs(Date.now()/1000-Number(parts.t))<300;
}
export async function handleStripeWebhook(event){
 const eventId=event.id;const inserted=await pool.query(`INSERT INTO payment_webhook_events(provider,event_id,event_type,payload) VALUES('stripe',$1,$2,$3::jsonb) ON CONFLICT(provider,event_id) DO NOTHING RETURNING id`,[eventId,event.type,JSON.stringify(event)]);
 if(!inserted.rowCount)return {duplicate:true};
 const session=event.data?.object;const txId=session?.metadata?.transaction_id||session?.client_reference_id;
 if(txId&&event.type==='checkout.session.completed'&&session.payment_status==='paid')await pool.query(`UPDATE payment_transactions SET status='succeeded',updated_at=now(),metadata=metadata||$2::jsonb WHERE id=$1`,[txId,JSON.stringify({stripePaymentIntent:session.payment_intent})]);
 if(txId&&event.type==='checkout.session.expired')await pool.query(`UPDATE payment_transactions SET status='cancelled',updated_at=now() WHERE id=$1 AND status='pending'`,[txId]);
 await pool.query('UPDATE payment_webhook_events SET processed_at=now() WHERE id=$1',[inserted.rows[0].id]);return {processed:true};
}
export async function verifyPayPalWebhook(headers,body){
 if(!env.PAYPAL_WEBHOOK_ID)return false;const token=await paypalAccessToken();
 const response=await fetch(`${env.PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({auth_algo:headers['paypal-auth-algo'],cert_url:headers['paypal-cert-url'],transmission_id:headers['paypal-transmission-id'],transmission_sig:headers['paypal-transmission-sig'],transmission_time:headers['paypal-transmission-time'],webhook_id:env.PAYPAL_WEBHOOK_ID,webhook_event:body}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)return false;return (await response.json()).verification_status==='SUCCESS';
}
export async function handlePayPalWebhook(event){
 const eventId=event.id;const inserted=await pool.query(`INSERT INTO payment_webhook_events(provider,event_id,event_type,payload) VALUES('paypal',$1,$2,$3::jsonb) ON CONFLICT(provider,event_id) DO NOTHING RETURNING id`,[eventId,event.event_type,JSON.stringify(event)]);
 if(!inserted.rowCount)return {duplicate:true};
 const resource=event.resource||{};let txId=resource.custom_id||resource.purchase_units?.[0]?.custom_id;if(!txId&&resource.supplementary_data?.related_ids?.order_id){const found=await pool.query(`SELECT id FROM payment_transactions WHERE provider='paypal' AND provider_reference=$1`,[resource.supplementary_data.related_ids.order_id]);txId=found.rows[0]?.id;}
 if(txId&&event.event_type==='PAYMENT.CAPTURE.COMPLETED')await pool.query(`UPDATE payment_transactions SET status='succeeded',updated_at=now(),metadata=metadata||$2::jsonb WHERE id=$1`,[txId,JSON.stringify({paypalCaptureId:resource.id})]);
 if(txId&&event.event_type==='PAYMENT.CAPTURE.DENIED')await pool.query(`UPDATE payment_transactions SET status='failed',updated_at=now() WHERE id=$1`,[txId]);
 await pool.query('UPDATE payment_webhook_events SET processed_at=now() WHERE id=$1',[inserted.rows[0].id]);return {processed:true};
}
