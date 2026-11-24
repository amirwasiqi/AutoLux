
import { Button, Container, Stack, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext.jsx';

export default function AccountPage() {
  const { user, logout } = useAuth();
  return (
    <Container maxWidth="md" sx={{py:8}}>
      <Stack spacing={2}>
        <Typography variant="overline" color="warning.main">AUTOLUX ACCOUNT</Typography>
        <Typography variant="h3">Welcome, {user?.first_name || user?.firstName}</Typography>
        <Typography color="text.secondary">{user?.email}</Typography>
        <Typography>Account identity is ready. Rental bookings, vehicle purchases and product orders will be added in later phases.</Typography>
        <Button variant="outlined" onClick={logout} sx={{alignSelf:'flex-start'}}>Sign out</Button>
      </Stack>
    </Container>
  );
}
