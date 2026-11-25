
import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Stack, TextField, Link, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const schema = z.object({ email:z.string().email(), password:z.string().min(1) });
export default function LoginPage() {
  const { login, loginGoogle, completeMfa, startEmailMfaRecovery } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error,setError] = useState('');
  const [googleReady,setGoogleReady] = useState(false);
  const [mfaChallenge,setMfaChallenge] = useState('');
  const [mfaCode,setMfaCode] = useState('');
  const [emailRecovery,setEmailRecovery] = useState(false);
  const [recoverySent,setRecoverySent] = useState(false);
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    const initialize = () => {
      if (!window.google?.accounts?.id) return false;
      window.google.accounts.id.initialize({ client_id: clientId, callback: async ({ credential }) => {
        try { const result=await loginGoogle(credential); if(result?.mfaRequired){setMfaChallenge(result.challengeToken);return;} navigate(location.state?.from?.pathname || '/account'); }
        catch (e) { setError(e.response?.data?.error?.message || 'Google sign-in failed.'); }
      } });
      const target = document.getElementById('google-signin-button');
      if (target) { window.google.accounts.id.renderButton(target, { theme:'filled_black', size:'large', shape:'rectangular', text:'continue_with', width:320 }); setGoogleReady(true); }
      return true;
    };
    if (initialize()) return;
    const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (script) script.addEventListener('load', initialize, { once:true });
    return () => script?.removeEventListener('load', initialize);
  }, [loginGoogle, navigate, location.state]);
  const { register,handleSubmit,formState:{errors,isSubmitting} } = useForm({ resolver:zodResolver(schema) });
  const submit = async (values) => {
    setError('');
    try { const result=await login(values); if(result?.mfaRequired){setMfaChallenge(result.challengeToken);return;} navigate(location.state?.from?.pathname || '/account'); }
    catch (e) { setError(e.response?.data?.error?.message || 'Unable to sign in.'); }
  };
  const verifyMfa = async (event) => { event.preventDefault(); setError(''); try { await completeMfa(mfaChallenge,mfaCode,emailRecovery); navigate(location.state?.from?.pathname || '/account'); } catch(e) { setError(e.response?.data?.error?.message || 'MFA verification failed.'); } };
  const sendRecovery = async () => { setError(''); try { await startEmailMfaRecovery(mfaChallenge); setEmailRecovery(true); setRecoverySent(true); } catch(e) { setError(e.response?.data?.error?.message || 'Email recovery could not be started.'); } };
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your AutoLux account.">
      {mfaChallenge ? <Stack component="form" spacing={2} onSubmit={verifyMfa}>
        <Typography variant="h6">Two-step verification</Typography>
        <Typography color="text.secondary" variant="body2">{emailRecovery?'Enter the six-digit code sent to your verified email.':'Enter the six-digit code from your authenticator app, or a recovery code.'}</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {recoverySent && <Alert severity="success">Recovery code sent. Check your email.</Alert>}
        <TextField label={emailRecovery?'Email recovery code':'Authenticator / recovery code'} value={mfaCode} onChange={e=>setMfaCode(e.target.value)} autoFocus required inputProps={{maxLength:32}}/>
        <Button type="submit" variant="contained">Verify and sign in</Button>
        {!emailRecovery && <Button onClick={sendRecovery} variant="text">Use email recovery instead</Button>}
        {emailRecovery && <Button onClick={()=>{setEmailRecovery(false);setMfaCode('');setRecoverySent(false);}} variant="text">Use authenticator or recovery code</Button>}
      </Stack> : <Stack component="form" spacing={2} onSubmit={handleSubmit(submit)}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Email address" type="email" fullWidth {...register('email')}
          error={!!errors.email} helperText={errors.email?.message} />
        <TextField label="Password" type="password" fullWidth {...register('password')}
          error={!!errors.password} helperText={errors.password?.message} />
        <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ py:1.5, minHeight:52, fontWeight:800, color:"#090a0b", backgroundColor:"#d8b45a", "&:hover":{backgroundColor:"#f0d58b"} }}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
        {import.meta.env.VITE_GOOGLE_CLIENT_ID && <><Typography variant="body2" textAlign="center" color="grey.500">or continue with</Typography><div id="google-signin-button" style={{display:'flex',justifyContent:'center',minHeight:42}} />{!googleReady && <Typography variant="caption" color="grey.600" textAlign="center">Loading Google sign-in…</Typography>}</>}
        <Typography variant="body2" textAlign="center">
          <Link className="auth-action-link" component={RouterLink} to="/forgot-password">Forgot password?</Link>
        </Typography>
        <Typography variant="body2" textAlign="center" color="grey.400">
          New to AutoLux? <Link className="auth-action-link" component={RouterLink} to="/register">Create an account</Link>
        </Typography>
      </Stack>}
    </AuthLayout>
  );
}
