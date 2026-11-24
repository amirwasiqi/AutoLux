
import { Alert, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';

export function RegistrationSuccessPage() {
  const location = useLocation();
  return (
    <AuthLayout title="Check your inbox" subtitle="One more step before your account is active.">
      <Stack spacing={2}>
        <Alert severity="info">{location.state?.message || 'If the email service is configured, a verification link has been sent.'}</Alert>
        <Typography color="grey.400" variant="body2">If you do not receive an email, check your spam folder or contact AutoLux support.</Typography>
        <Button component={RouterLink} to="/login" variant="contained">Go to sign in</Button>
      </Stack>
    </AuthLayout>
  );
}
export function ForbiddenPage() {
  return <AuthLayout title="Access restricted" subtitle="Your account does not have permission to view this page.">
    <Button component={RouterLink} to="/" variant="contained">Return home</Button>
  </AuthLayout>;
}
export function PlaceholderPage({ title }) {
  return <AuthLayout title={title} subtitle="This account workflow is part of the AutoLux authentication foundation.">
    <Alert severity="info">The interface is prepared. Complete email delivery and provider credentials are required for live verification.</Alert>
    <Button component={RouterLink} to="/login" sx={{mt:2}} variant="contained">Back to sign in</Button>
  </AuthLayout>;
}
