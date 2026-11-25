import crypto from 'node:crypto';
import {env} from '../config/env.js';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const hmac=(key,value,encoding)=>crypto.createHmac('sha256',key).update(value).digest(encoding);
function config(){if(!env.AWS_ACCESS_KEY_ID||!env.AWS_SECRET_ACCESS_KEY||!env.S3_BUCKET){const e=new Error('Private S3 storage is pending configuration.');e.status=503;throw e;}return {region:env.AWS_REGION,bucket:env.S3_BUCKET};}
function signingKey(secret,date,region){const kDate=hmac(`AWS4${secret}`,date);const kRegion=hmac(kDate,region);const kService=hmac(kRegion,'s3');return hmac(kService,'aws4_request');}
function encodePath(key){return key.split('/').map(encodeURIComponent).join('/');}
export function createPresignedUrl(method,key,contentType='application/octet-stream',expires=600){
 const {region,bucket}=config();const host=`${bucket}.s3.${region}.amazonaws.com`;const now=new Date();const amz=now.toISOString().replace(/[:-]|\.\d{3}/g,'');const date=amz.slice(0,8);const scope=`${date}/${region}/s3/aws4_request`;
 const params={'X-Amz-Algorithm':'AWS4-HMAC-SHA256','X-Amz-Credential':`${env.AWS_ACCESS_KEY_ID}/${scope}`,'X-Amz-Date':amz,'X-Amz-Expires':String(expires),'X-Amz-SignedHeaders':'host'};
 const canonicalQuery=Object.entries(params).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
 const canonicalRequest=`${method}\n/${encodePath(key)}\n${canonicalQuery}\nhost:${host}\n\nhost\nUNSIGNED-PAYLOAD`;
 const stringToSign=`AWS4-HMAC-SHA256\n${amz}\n${scope}\n${sha(canonicalRequest)}`;
 const signature=hmac(signingKey(env.AWS_SECRET_ACCESS_KEY,date,region),stringToSign,'hex');
 return `https://${host}/${encodePath(key)}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
export async function verifyObjectExists(key,expectedSize){
 const url=createPresignedUrl('HEAD',key,'',60);const response=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(10000)});if(!response.ok)return false;const actual=Number(response.headers.get('content-length'));return expectedSize==null||actual===Number(expectedSize);
}
