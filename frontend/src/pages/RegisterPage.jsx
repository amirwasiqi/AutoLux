
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Button, Stack, TextField, MenuItem, Typography, Link } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const schema = z.object({
  firstName:z.string().min(1).max(80), lastName:z.string().min(1).max(80),
  email:z.string().email(), password:z.string().min(12,'Use at least 12 characters.'),
  phoneE164:z.string().regex(/^\+[1-9]\d{7,14}$/,'Use international format, e.g. +14155552671.').optional().or(z.literal('')),
  preferredLanguage:z.enum(['en','de','fr','ar'])
});
export default function RegisterPage() {
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const { register,handleSubmit,formState:{errors,isSubmitting} } = useForm({
    resolver:zodResolver(schema), defaultValues:{ preferredLanguage:'en' }
  });
  const submit = async (values) => {
    setError(''); setMessage('');
    try {
      const { data } = await createAccount({ ...values, phoneE164:values.phoneE164 || undefined });
      setMessage(data.message || 'Account created. Check your email to verify it.');
      navigate('/registration-success', { state:{ message:data.message, sent:data.data.verificationEmailSent } });
    } catch (e) { setError(e.response?.data?.error?.message || 'Unable to create your account.'); }
  };
  return (
    <AuthLayout title="Create your account" subtitle="Your AutoLux experience starts here.">
      <Stack component="form" spacing={2} onSubmit={handleSubmit(submit)}>
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        <Stack direction={{xs:'column',sm:'row'}} spacing={2}>
          <TextField label="First name" fullWidth {...register('firstName')} error={!!errors.firstName} helperText={errors.firstName?.message}/>
          <TextField label="Last name" fullWidth {...register('lastName')} error={!!errors.lastName} helperText={errors.lastName?.message}/>
        </Stack>
        <TextField label="Email address" type="email" fullWidth {...register('email')} error={!!errors.email} helperText={errors.email?.message}/>
        <TextField label="Password (12+ characters)" type="password" fullWidth {...register('password')} error={!!errors.password} helperText={errors.password?.message}/>
        <TextField label="Phone (international format)" fullWidth {...register('phoneE164')} error={!!errors.phoneE164} helperText={errors.phoneE164?.message}/>
        <TextField select label="Preferred language" defaultValue="en" {...register('preferredLanguage')}>
          <MenuItem value="en">English</MenuItem><MenuItem value="de">German</MenuItem>
          <MenuItem value="fr">French</MenuItem><MenuItem value="ar">Arabic</MenuItem>
        </TextField>
        <Button type="submit" variant="contained" disabled={isSubmitting} sx={{py:1.4}}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
        <Typography variant="body2" textAlign="center" color="grey.400">
          Already registered? <Link component={RouterLink} to="/login">Sign in</Link>
        </Typography>
      </Stack>
    </AuthLayout>
  );
}
