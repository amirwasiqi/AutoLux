import {Router} from 'express';import crypto from 'node:crypto';import {z} from 'zod';
import {pool} from '../../db/pool.js';import {authenticate} from '../../middleware/authenticate.js';import {requireRole} from '../../middleware/authorize.js';import {asyncHandler} from '../../utils/http.js';import {createPresignedUrl,verifyObjectExists} from '../../services/private-storage.js';import {deliverCustomerNotification} from '../../services/customer-notifications.js';
const router=Router();const types=['license_front','license_back','identity_front','identity_back','proof_of_address'];
router.get('/documents',authenticate,asyncHandler(async(req,res)=>{const r=await pool.query(`SELECT id,document_type,original_filename,mime_type,file_size_bytes,status,review_note,created_at,reviewed_at FROM driver_documents WHERE user_id=$1 ORDER BY created_at DESC`,[req.user.id]);res.json({data:r.rows});}));
router.post('/documents/presign',authenticate,asyncHandler(async(req,res)=>{
 const p=z.object({documentType:z.enum(types),filename:z.string().min(1).max(180),mimeType:z.enum(['image/jpeg','image/png','application/pdf']),fileSizeBytes:z.number().int().positive().max(10*1024*1024)}).safeParse(req.body);
 if(!p.success)return res.status(422).json({error:{message:'Choose a JPG, PNG, or PDF file smaller than 10 MB.'}});
 const ext=p.data.mimeType==='image/jpeg'?'jpg':p.data.mimeType==='image/png'?'png':'pdf';const key=`driver-documents/${req.user.id}/${crypto.randomUUID()}.${ext}`;const url=createPresignedUrl('PUT',key,p.data.mimeType);
 const row=await pool.query(`INSERT INTO driver_documents(user_id,document_type,storage_provider,storage_key,original_filename,mime_type,file_size_bytes,status) VALUES($1,$2,'s3',$3,$4,$5,$6,'pending') RETURNING id`,[req.user.id,p.data.documentType,key,p.data.filename,p.data.mimeType,p.data.fileSizeBytes]);
 res.status(201).json({data:{documentId:row.rows[0].id,uploadUrl:url,storageKey:key,expiresInSeconds:600,requiredHeaders:{'Content-Type':p.data.mimeType}}});
}));
router.post('/documents/:id/complete',authenticate,asyncHandler(async(req,res)=>{
 const r=await pool.query(`SELECT id,storage_key,file_size_bytes FROM driver_documents WHERE id=$1 AND user_id=$2 AND status='pending'`,[req.params.id,req.user.id]);if(!r.rowCount)return res.status(404).json({error:{message:'Pending document upload not found.'}});
 if(!await verifyObjectExists(r.rows[0].storage_key,r.rows[0].file_size_bytes))return res.status(409).json({error:{message:'The uploaded file could not be verified in private storage.'}});
 await pool.query(`UPDATE driver_documents SET status='under_review' WHERE id=$1`,[req.params.id]);await pool.query(`INSERT INTO driver_profiles(user_id,verification_status) VALUES($1,'pending') ON CONFLICT(user_id) DO UPDATE SET verification_status='pending',updated_at=now()`,[req.user.id]);
 res.json({data:{id:req.params.id,status:'under_review'}});
}));
router.get('/admin/documents',authenticate,requireRole('super_admin','company_admin','driver_verification_staff'),asyncHandler(async(_req,res)=>{const r=await pool.query(`SELECT d.*,u.email,u.first_name,u.last_name FROM driver_documents d JOIN users u ON u.id=d.user_id ORDER BY CASE d.status WHEN 'under_review' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,d.created_at ASC LIMIT 500`);res.json({data:r.rows.map(({storage_key,...item})=>({...item,downloadUrl:storage_key?createPresignedUrl('GET',storage_key):null}))});}));
router.patch('/admin/documents/:id/review',authenticate,requireRole('super_admin','company_admin','driver_verification_staff'),asyncHandler(async(req,res)=>{
 const p=z.object({status:z.enum(['verified','rejected']),note:z.string().trim().min(5).max(1000)}).safeParse(req.body);if(!p.success)return res.status(422).json({error:{message:'Provide a review decision and note.'}});
 const client=await pool.connect();try{await client.query('BEGIN');const doc=await client.query(`SELECT id,user_id FROM driver_documents WHERE id=$1 AND status IN ('pending','under_review') FOR UPDATE`,[req.params.id]);if(!doc.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:{message:'Reviewable document not found.'}});}
 await client.query(`UPDATE driver_documents SET status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3 WHERE id=$4`,[p.data.status,req.user.id,p.data.note,req.params.id]);
 const remaining=await client.query(`SELECT count(*) FILTER(WHERE document_type='license_front' AND status='verified')::int license_front,count(*) FILTER(WHERE document_type='license_back' AND status='verified')::int license_back,count(*) FILTER(WHERE status='rejected')::int rejected FROM driver_documents WHERE user_id=$1`,[doc.rows[0].user_id]);
 const overall=remaining.rows[0].license_front>0&&remaining.rows[0].license_back>0?'verified':remaining.rows[0].rejected>0?'rejected':'pending';
 await client.query(`INSERT INTO driver_profiles(user_id,verification_status) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET verification_status=$2,updated_at=now()`,[doc.rows[0].user_id,overall]);
 await client.query(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,'driver.document.reviewed','driver_document',$2,$3::jsonb)`,[req.user.id,req.params.id,JSON.stringify(p.data)]);await client.query('COMMIT');try{await deliverCustomerNotification({userId:doc.rows[0].user_id,templateKey:'driver_document_review',subject:'Driver document review',body:`Your ${p.data.status==='verified'?'document was approved':'document requires changes'}: ${p.data.note}`});}catch(error){req.log?.error?.({err:error},'Driver review notification failed');}res.json({data:{id:req.params.id,status:p.data.status,driverStatus:overall}});
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}));
export default router;
