import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>readFile(path.join(root,relative),'utf8');
test('commercial migration defines the ten-role and commerce foundations',async()=>{
 const sql=await read('src/db/migrations/006_commercial_platform.sql');
 for(const name of ['driver_verification_staff','reservation_holds','dealership_partners','partner_vehicle_listings','vehicle_sales_enquiries','vehicle_sales_orders','products','shop_orders','driver_documents','rental_contract_templates','rental_contracts','payment_transactions','payment_webhook_events','customer_notifications','vehicle_transfers','integration_status'])assert.match(sql,new RegExp(`(?:CREATE TABLE IF NOT EXISTS|VALUES)[\\s\\S]*${name}`));
 assert.match(sql,/WHERE is_demo=true/);assert.match(sql,/rental_enabled=false/);
});
test('MFA routes include TOTP enrollment, login challenge, recovery and encrypted secrets',async()=>{
 const [routes,service,util]=await Promise.all([read('src/modules/auth/auth.routes.js'),read('src/modules/auth/auth.service.js'),read('src/utils/mfa.js')]);
 for(const route of ['/mfa/verify','/mfa/email-recovery/start','/mfa/email-recovery/verify','/mfa/enroll/start','/mfa/enroll/confirm','/mfa/recovery-codes/regenerate'])assert.ok(routes.includes(route));
 assert.match(service,/verifyTotp/);assert.match(service,/mfa_recovery_codes/);assert.match(util,/aes-256-gcm/);
});
test('payment checkout is server-priced and webhooks verify provider signatures',async()=>{
 const [service,routes]=await Promise.all([read('src/services/payments.js'),read('src/modules/payments/payments.routes.js')]);
 assert.match(service,/verifyStripeSignature/);assert.match(service,/verifyPayPalWebhook/);assert.match(service,/payment_transactions/);assert.match(routes,/stripe-signature/);assert.match(routes,/verifyPayPalWebhook/);
});
test('driver uploads use short-lived private S3 URLs and staff review endpoints',async()=>{
 const [storage,routes]=await Promise.all([read('src/services/private-storage.js'),read('src/modules/drivers/drivers.routes.js')]);
 assert.match(storage,/X-Amz-Expires/);assert.match(routes,/verifyObjectExists/);assert.match(routes,/admin\/documents/);assert.match(routes,/reviewed_by/);
});
test('reservation holds and demo inventory are protected from booking',async()=>{
 const routes=await read('src/modules/bookings/bookings.routes.js');
 assert.match(routes,/reservation_holds/);assert.match(routes,/inventory_verification_status==='verified'/);assert.match(routes,/is_demo/);
});
