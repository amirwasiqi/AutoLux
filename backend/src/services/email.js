import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';

function encodeHeader(value='') { return String(value).replace(/[\r\n]+/g,' ').trim(); }
async function sendWithGmail({to,subject,text,replyTo}) {
  if(!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN || !env.GMAIL_SENDER_EMAIL) {
    return {delivered:false,reason:'gmail_not_configured'};
  }
  const oauth = new OAuth2Client(env.GOOGLE_CLIENT_ID,env.GOOGLE_CLIENT_SECRET,env.GOOGLE_REDIRECT_URI || undefined);
  oauth.setCredentials({refresh_token:env.GMAIL_REFRESH_TOKEN});
  const token=await oauth.getAccessToken();
  const accessToken=typeof token==='string'?token:token?.token;
  if(!accessToken) throw new Error('Gmail OAuth did not return an access token.');
  const lines=[`From: AutoLux <${env.GMAIL_SENDER_EMAIL}>`,`To: ${encodeHeader(to)}`,`Subject: ${/[^\x00-\x7F]/.test(encodeHeader(subject))?`=?UTF-8?B?${Buffer.from(encodeHeader(subject),'utf8').toString('base64')}?=`:encodeHeader(subject)}`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: 8bit'];
  if(replyTo) lines.push(`Reply-To: ${encodeHeader(replyTo)}`);
  const raw=Buffer.from(`${lines.join('\r\n')}\r\n\r\n${String(text).replace(/\r/g,'')}`).toString('base64url');
  const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({raw}),signal:AbortSignal.timeout(12000)});
  if(!response.ok) throw new Error(`Gmail API returned ${response.status}: ${(await response.text()).slice(0,250)}`);
  return {delivered:true};
}
export async function sendMail({to,subject,text,replyTo}) {
  const gmail=await sendWithGmail({to,subject,text,replyTo});
  if(gmail.delivered) return gmail;
  if(env.RESEND_API_KEY && env.EMAIL_FROM) {
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],reply_to:replyTo,subject,text}),signal:AbortSignal.timeout(12000)});
    if(!response.ok) throw new Error(`Email provider returned ${response.status}: ${(await response.text()).slice(0,250)}`);
    return {delivered:true};
  }
  return {delivered:false,reason:gmail.reason||'email_not_configured'};
}
export async function sendContactEmail({name,email,phone,subject,message,messageId}) {
  if(!env.CONTACT_INBOX_EMAIL) return {delivered:false,reason:'contact_inbox_not_configured'};
  return sendMail({to:env.CONTACT_INBOX_EMAIL,replyTo:email,subject:`[AutoLux website] ${subject}`,text:`New website contact message\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone||'Not provided'}\nMessage ID: ${messageId}\n\nMessage:\n${message}`});
}
export async function sendMfaRecoveryEmail(email,code) {
  return sendMail({to:email,subject:'Your AutoLux sign-in recovery code',text:`Your AutoLux email recovery code is ${code}. It expires in 10 minutes. If you did not request this code, secure your account immediately.`});
}
