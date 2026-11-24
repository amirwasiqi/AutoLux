
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { Box, CircularProgress } from '@mui/material';

export default function RequireAuth({ roles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Box minHeight="60vh" display="grid" sx={{ placeItems:'center' }}><CircularProgress /></Box>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles.length && !roles.some((role) => user.roles?.includes(role))) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
