import crypto from 'node:crypto';
import { env } from '../config/env.js';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Encode(buffer) {
  let bits = 0, value = 0, output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { output += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}
export function base32Decode(input) {
  const clean = input.replace(/=+$/,'').toUpperCase(); let bits = 0, value = 0; const out=[];
  for (const char of clean) { const idx=alphabet.indexOf(char); if(idx<0) throw new Error('Invalid base32 secret.'); value=(value<<5)|idx; bits+=5; if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8;} }
  return Buffer.from(out);
}
export function generateTotpSecret() { return base32Encode(crypto.randomBytes(20)); }
export function verifyTotp(secret, token, now = Date.now()) {
  if (!/^\d{6}$/.test(String(token))) return false;
  const key=base32Decode(secret), counter=Math.floor(now/30000);
  for(let drift=-1;drift<=1;drift++){
    const msg=Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter+drift));
    const h=crypto.createHmac('sha1',key).update(msg).digest(); const offset=h[h.length-1]&15;
    const code=((h.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,'0');
    if(crypto.timingSafeEqual(Buffer.from(code),Buffer.from(String(token)))) return true;
  }
  return false;
}
function encryptionKey() {
  if(!env.MFA_ENCRYPTION_KEY || env.MFA_ENCRYPTION_KEY.length<32 || env.MFA_ENCRYPTION_KEY.startsWith('replace-with')) { const e=new Error('MFA encryption is not configured.'); e.status=503; throw e; }
  return crypto.createHash('sha256').update(env.MFA_ENCRYPTION_KEY).digest();
}
export function encryptSecret(value) {
  const iv=crypto.randomBytes(12), cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv);
  const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return [iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.');
}
export function decryptSecret(value) {
  if(!value) return null;
  const [iv,tag,data]=value.split('.'); const decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(iv,'base64url'));
  decipher.setAuthTag(Buffer.from(tag,'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data,'base64url')),decipher.final()]).toString('utf8');
}
export function makeRecoveryCodes(count=10) { return Array.from({length:count},()=>crypto.randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g).join('-')); }
