
import { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Stack, TextField, Link, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const schema = z.object({ email:z.string().email(), password:z.string().min(1) });
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error,setError] = useState('');
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
        <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ py:1.4 }}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <Typography variant="body2" textAlign="center">
          <Link component={RouterLink} to="/forgot-password">Forgot password?</Link>
        </Typography>
        <Typography variant="body2" textAlign="center" color="grey.400">
          New to AutoLux? <Link component={RouterLink} to="/register">Create an account</Link>
        </Typography>
      </Stack>
    </AuthLayout>
  );
}
