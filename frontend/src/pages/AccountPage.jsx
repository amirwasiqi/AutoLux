import { useEffect, useState } from 'react';
import { Alert, Button, Chip, Container, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
const usd=(value)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(value||0));
export default function AccountPage(){
 const {user,logout}=useAuth();const [bookings,setBookings]=useState([]);const [error,setError]=useState('');const [busy,setBusy]=useState('');
 const load=()=>api.get('/bookings/mine').then(({data})=>setBookings(data.data)).catch(e=>setError(e.response?.data?.error?.message||'Your reservations could not be loaded.'));
 useEffect(()=>{load();},[]);
 const cancel=async(id)=>{setBusy(id);setError('');try{await api.patch(`/bookings/${id}/cancel`);await load();}catch(e){setError(e.response?.data?.error?.message||'Reservation could not be cancelled.');}finally{setBusy('');}};
 return <main className="account-page"><Container maxWidth="lg" sx={{py:{xs:12,md:15}}}><Stack spacing={2}><Typography variant="overline" color="warning.main">AUTOLUX ACCOUNT</Typography><Typography variant="h3">Welcome, {user?.first_name||user?.firstName}</Typography><Typography color="text.secondary">{user?.email}</Typography><div className="account-bookings"><div className="admin-panel-heading"><div><span>YOUR AUTOLUX ACTIVITY</span><h2>Reservations</h2></div><Button component={Link} to="/vehicles" variant="contained">Explore vehicles</Button></div>{error&&<Alert severity="error">{error}</Alert>}{bookings.length?bookings.map(item=><article className="account-booking-row" key={item.id}><div><b>{item.booking_number}</b><strong>{item.model_year} {item.make} {item.model}</strong><small>{new Date(item.pickup_at).toLocaleString()} to {new Date(item.return_at).toLocaleString()}</small></div><div><Chip size="small" label={item.status.replace('_',' ')}/><b>{usd(item.estimated_total_usd)}</b>{['pending','confirmed'].includes(item.status)&&<Button size="small" color="error" disabled={busy===item.id} onClick={()=>cancel(item.id)}>Cancel request</Button>}</div></article>):<p className="admin-panel-note">No reservations yet. Your submitted requests will appear here.</p>}</div><Button variant="outlined" onClick={logout} sx={{alignSelf:'flex-start'}}>Sign out</Button></Stack></Container></main>;
}
