import { env } from '../config/env.js';
export async function sendContactEmail({name,email,phone,subject,message,messageId}){
 if(!env.RESEND_API_KEY||!env.CONTACT_INBOX_EMAIL||!env.EMAIL_FROM)return {delivered:false,reason:'Email delivery is not configured. The message remains saved in AutoLux.'};
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[env.CONTACT_INBOX_EMAIL],reply_to:email,subject:`[AutoLux website] ${subject}`,text:`New website contact message\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone||'Not provided'}\nMessage ID: ${messageId}\n\nMessage:\n${message}`})});
 if(!r.ok)throw new Error(`Email provider returned ${r.status}: ${(await r.text()).slice(0,300)}`);return {delivered:true};
}
