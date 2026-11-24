
import * as service from './auth.service.js';
import { registerSchema, loginSchema, tokenSchema, resetSchema, googleSchema } from './auth.schemas.js';
import { asyncHandler } from '../../utils/http.js';

const parse = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const error = new Error('Please check the submitted information.');
    error.status = 422; error.details = result.error.flatten().fieldErrors; throw error;
  }
  return result.data;
};

export const register = asyncHandler(async (req,res) => {
  const result = await service.register(parse(registerSchema,req.body),req,res);
  res.status(201).json({ data: result, message: 'Account created. Verify your email to activate it.' });
});
export const login = asyncHandler(async (req,res) => {
  const result = await service.login(parse(loginSchema,req.body),req,res);
  res.json({ data: result });
});
export const verifyEmail = asyncHandler(async (req,res) => {
  res.json({ data: await service.verifyEmail(parse(tokenSchema,req.body).token) });
});
export const refresh = asyncHandler(async (req,res) => {
  res.json({ data: await service.refreshSession(req,res) });
});
export const logout = asyncHandler(async (req,res) => {
  res.json({ data: await service.logout(req,res) });
});
export const forgotPassword = asyncHandler(async (req,res) => {
  const email = parse(loginSchema.pick({email:true}),req.body).email;
  res.json({ data: await service.requestPasswordReset(email) });
});
export const resetPassword = asyncHandler(async (req,res) => {
  const body = parse(resetSchema,req.body);
  res.json({ data: await service.resetPassword(body.token,body.password) });
});
export const googleLogin = asyncHandler(async (req,res) => {
  const body = parse(googleSchema,req.body);
  res.json({ data: await service.googleLogin(body.idToken,req,res) });
});
export const startSms = asyncHandler(async (req,res) => {
  const phone = parse(registerSchema.pick({phoneE164:true}),{phoneE164:req.body.phone}).phoneE164;
  res.json({ data: await service.startSms(phone) });
});


export const verifySms = asyncHandler(async (req,res) => {
  const phone = parse(registerSchema.pick({phoneE164:true}),{phoneE164:req.body.phone}).phoneE164;
  const code = z.string().regex(/^\d{4,10}$/).parse(req.body.code);
  res.json({ data: await service.verifySms(req.user.id,phone,code) });
});
