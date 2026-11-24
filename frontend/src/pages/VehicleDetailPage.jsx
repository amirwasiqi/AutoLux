import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Container, Grid, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import VehicleImage from '../components/VehicleImage.jsx';

const money = (value) => value == null ? 'Price on request' : new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(Number(value));

export default function VehicleDetailPage() {
  const { slug } = useParams();
  const [vehicle,setVehicle] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  useEffect(()=>{ let active=true; api.get(`/vehicles/${slug}`).then(({data})=>{if(active)setVehicle(data.data);}).catch((err)=>{if(active)setError(err.response?.data?.error?.message || 'Vehicle details could not be loaded.');}).finally(()=>{if(active)setLoading(false);}); return ()=>{active=false;};},[slug]);
  if (loading) return <Container maxWidth="xl" sx={{pt:16,pb:8}}><Skeleton height={420}/><Skeleton width="45%"/><Skeleton width="70%"/></Container>;
  if (error || !vehicle) return <Container maxWidth="lg" sx={{pt:18,pb:10}}><Alert severity="error">{error || 'Vehicle not found.'}</Alert><Button component={Link} to="/vehicles" sx={{mt:2}} startIcon={<ArrowBackRounded/>}>Back to collection</Button></Container>;
  return <main className="vehicle-detail-page"><Container maxWidth="xl">
    <Button component={Link} to="/vehicles" color="inherit" startIcon={<ArrowBackRounded/>} className="detail-back">Back to collection</Button>
    <Grid container spacing={{xs:4,lg:7}}>
      <Grid item xs={12} lg={7}><div className="detail-image-wrap"><VehicleImage eager query={vehicle.image_search_query || `${vehicle.model_year} ${vehicle.make} ${vehicle.model} car exterior`} src={vehicle.image_url} sourcePage={vehicle.image_source_url} license={vehicle.image_license} credit={vehicle.image_credit} alt={`${vehicle.model_year} ${vehicle.make} ${vehicle.model}`}/><span className="detail-image-label">AUTOLUX COLLECTION / {vehicle.stock_code}</span></div></Grid>
      <Grid item xs={12} lg={5}><div className="detail-copy"><p className="eyebrow"><span className="eyebrow-line"/> {vehicle.category.toUpperCase()}</p><Typography component="h1" className="detail-title">{vehicle.make}<br/><span>{vehicle.model}</span></Typography><p className="detail-description">{vehicle.description}</p>
        <div className="detail-spec-grid">{[['MODEL YEAR',vehicle.model_year],['TRANSMISSION',vehicle.transmission],['FUEL',vehicle.fuel_type],['SEATS',vehicle.seats],['DOORS',vehicle.doors],['DAILY MILEAGE',vehicle.mileage_limit_per_day ? `${vehicle.mileage_limit_per_day} miles` : 'Confirm at branch']].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
        <div className="detail-price-grid">{vehicle.daily_rental_price_usd != null && <div><small>RENTAL FROM</small><strong>{money(vehicle.daily_rental_price_usd)}<em>/day</em></strong><span>Weekly {money(vehicle.weekly_rental_price_usd)} · Monthly {money(vehicle.monthly_rental_price_usd)}</span></div>}{vehicle.sale_price_usd != null && <div><small>VEHICLE MARKET GUIDE</small><strong>{money(vehicle.sale_price_usd)}</strong><span>{vehicle.sale_price_basis === 'model_median' ? 'Model-level used-market median reference' : 'Segment-level estimate; confirm vehicle-specific price'}</span></div>}</div>
        <Alert severity="info" className="detail-note">This is a sample catalogue entry. Confirm the actual vehicle, trim, condition, branch, final price, taxes and fees before making a reservation or purchase.</Alert>
        <Stack direction={{xs:'column',sm:'row'}} spacing={1.5} sx={{mt:3}}><Button component={Link} to="/contact" variant="contained" endIcon={<ArrowOutwardRounded/>}>Ask about this vehicle</Button><Button component={Link} to="/vehicles" variant="outlined" color="inherit">Continue browsing</Button></Stack>
      </div></Grid>
    </Grid>
  </Container></main>;
}
