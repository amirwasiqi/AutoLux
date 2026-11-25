
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
  const { login, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error,setError] = useState('');
  const [googleReady,setGoogleReady] = useState(false);
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    const initialize = () => {
      if (!window.google?.accounts?.id) return false;
      window.google.accounts.id.initialize({ client_id: clientId, callback: async ({ credential }) => {
        try { await loginGoogle(credential); navigate(location.state?.from?.pathname || '/account'); }
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
    try { await login(values); navigate(location.state?.from?.pathname || '/account'); }
    catch (e) { setError(e.response?.data?.error?.message || 'Unable to sign in.'); }
  };
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your AutoLux account.">
      <Stack component="form" spacing={2} onSubmit={handleSubmit(submit)}>
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
      </Stack>
    </AuthLayout>
  );
}
