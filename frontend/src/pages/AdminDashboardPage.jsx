import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Container, Stack, Typography } from '@mui/material';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import DirectionsCarFilledRounded from '@mui/icons-material/DirectionsCarFilledRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import BuildCircleRounded from '@mui/icons-material/BuildCircleRounded';
import AssessmentRounded from '@mui/icons-material/AssessmentRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import { api } from '../api/client.js';

const usd = (value) => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(Number(value || 0));
const statusLabels = { available:'Available', reserved:'Reserved', rented:'Rented', under_maintenance:'Maintenance', damaged:'Damaged', inactive:'Inactive' };
const statusColors = { available:'#27c995', reserved:'#d9b45b', rented:'#56a8e8', under_maintenance:'#e5a34a', damaged:'#e16c64', inactive:'#737b82' };

function FleetMap({ statuses }) {
  const pins = [{x:17,y:35,t:'available'},{x:30,y:58,t:'rented'},{x:44,y:28,t:'available'},{x:58,y:47,t:'reserved'},{x:72,y:30,t:'available'},{x:83,y:62,t:'under_maintenance'},{x:65,y:75,t:'available'}];
  return <div className="admin-map-art" role="img" aria-label="Illustrative United States fleet distribution map. GPS tracking is not connected in this phase.">
    <svg viewBox="0 0 760 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><pattern id="mapGrid" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0V42" fill="none" stroke="#17333a" strokeWidth="1"/></pattern><radialGradient id="mapGlow"><stop stopColor="#0b6d5b" stopOpacity=".34"/><stop offset="1" stopColor="#061015" stopOpacity="0"/></radialGradient></defs>
      <rect width="760" height="420" fill="#061015"/><rect width="760" height="420" fill="url(#mapGrid)"/><ellipse cx="385" cy="210" rx="330" ry="190" fill="url(#mapGlow)"/>
      <path d="M74 91 125 68 178 76 215 58 271 72 308 63 356 83 408 67 449 86 498 74 537 94 590 91 641 124 674 155 656 188 678 218 645 245 619 280 579 296 546 333 498 318 464 343 422 328 389 346 347 325 309 335 271 315 226 324 189 296 154 300 128 270 96 247 81 205 57 175Z" fill="#0a2228" stroke="#155147" strokeWidth="2"/>
      <path d="M101 142 C195 98 228 201 310 166 S420 96 494 156 581 197 659 145 M112 249 C197 198 252 288 340 238 S455 207 530 259 597 292 656 254 M230 78 C210 159 284 190 263 308 M398 75 C370 151 424 220 399 336 M540 100 C506 164 563 228 534 310" fill="none" stroke="#126c5d" strokeWidth="2" strokeDasharray="5 8" opacity=".8"/>
      <path d="M77 190 680 190 M180 75 180 330 M470 75 470 330" stroke="#163a40" strokeWidth="1" opacity=".8"/>
      {pins.map((pin,i)=><g key={i} transform={`translate(${pin.x*7.6},${pin.y*4.2})`}><circle r="17" fill={statusColors[pin.t]} opacity=".12"/><circle r="7" fill={statusColors[pin.t]} stroke="#071014" strokeWidth="3"/><circle r="2" fill="#fff"/></g>)}
      <g fill="#7a9a92" fontSize="10" letterSpacing="2"><text x="92" y="116">WEST REGION</text><text x="315" y="120">CENTRAL</text><text x="545" y="115">EAST REGION</text><text x="300" y="295">SOUTH REGION</text></g>
    </svg>
    <div className="admin-map-label"><span className="map-pulse"/> BRANCH DISTRIBUTION PREVIEW</div>
    <div className="admin-map-legend"><span><i style={{background:statusColors.available}}/> Available</span><span><i style={{background:statusColors.rented}}/> Rented</span><span><i style={{background:statusColors.reserved}}/> Reserved</span><span><i style={{background:statusColors.under_maintenance}}/> Maintenance</span></div>
  </div>;
}

export default function AdminDashboardPage() {
  const [data,setData] = useState(null); const [loading,setLoading] = useState(true); const [error,setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { const response = await api.get('/admin/dashboard/overview'); setData(response.data.data); } catch (e) { setError(e.response?.data?.error?.message || 'Dashboard data could not be loaded.'); } finally { setLoading(false); } };
  useEffect(()=>{ load(); },[]);
  const statusEntries = useMemo(()=>Object.entries(data?.statuses || {}).filter(([,count])=>count>0),[data]);
  const maxCategory = Math.max(1,...(data?.categories || []).map(x=>x.count));
  if (loading && !data) return <main className="admin-loading"><CircularProgress color="primary"/><Typography color="text.secondary">Loading AutoLux operations…</Typography></main>;
  return <main className="admin-shell"><aside className="admin-sidebar"><Link to="/" className="admin-brand"><span className="admin-brand-mark">A</span><span>AUTOLUX<small>OPERATIONS</small></span></Link><p className="admin-nav-label">WORKSPACE</p><Link className="admin-nav-item active" to="/admin"><DashboardRounded/> Overview</Link><Link className="admin-nav-item" to="/admin/fleet"><DirectionsCarFilledRounded/> Vehicles & fleet</Link><Link className="admin-nav-item" to="/admin/bookings"><Inventory2Rounded/> Reservations</Link><Link className="admin-nav-item disabled" to="/admin/fleet"><BuildCircleRounded/> Maintenance <small>Later</small></Link><Link className="admin-nav-item disabled" to="/admin/fleet"><AssessmentRounded/> Reports <small>Later</small></Link><div className="admin-sidebar-bottom"><Link className="admin-nav-item disabled" to="/admin"><SettingsRounded/> Settings</Link><div className="admin-system-status"><span/><div><b>System foundation</b><small>API dashboard connected</small></div></div></div></aside>
    <section className="admin-content"><header className="admin-topbar"><div><span>ADMINISTRATION</span><b>Overview</b></div><Stack direction="row" alignItems="center" spacing={1}><Chip size="small" label="United States" variant="outlined"/><Button onClick={load} startIcon={<RefreshRounded/>} color="inherit" disabled={loading}>Refresh</Button></Stack></header>
      <Container maxWidth={false} className="admin-main-content"><div className="admin-welcome"><div><p className="eyebrow"><span className="eyebrow-line"/> AUTOLUX CONTROL CENTER</p><Typography component="h1">Command <span>the fleet.</span></Typography><p>One operational view of your vehicles, availability and branch footprint.</p></div><Button component={Link} to="/admin/fleet" variant="contained" startIcon={<AddRounded/>}>Manage vehicles</Button></div>
      {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}
      <div className="admin-kpi-grid"><article className="admin-kpi"><span>TOTAL VEHICLE RECORDS</span><strong>{data?.totals.total ?? 0}</strong><small>Catalogue entries</small><DirectionsCarFilledRounded/></article><article className="admin-kpi"><span>PUBLIC LISTINGS</span><strong>{data?.totals.published ?? 0}</strong><small>Visible in collection</small><ArrowOutwardRounded/></article><article className="admin-kpi"><span>RENTAL LISTINGS</span><strong>{data?.totals.rental_listings ?? 0}</strong><small>Rental-enabled records</small><Inventory2Rounded/></article><article className="admin-kpi"><span>BRANCHES</span><strong>{data?.branches.active ?? 0}</strong><small>{data?.branches.total ?? 0} branch records</small><AssessmentRounded/></article></div>
      <div className="admin-dashboard-grid"><section className="admin-panel admin-map-panel"><div className="admin-panel-heading"><div><span>FLEET FOOTPRINT</span><h2>Branch distribution</h2></div><Chip size="small" color="warning" label="Illustrative view"/></div><FleetMap statuses={data?.statuses}/><p className="admin-panel-note">This is a design preview, not live GPS tracking. Branch coordinates and telematics integration are not included in Phase 3.</p></section>
      <section className="admin-panel admin-status-panel"><div className="admin-panel-heading"><div><span>VEHICLE OPERATIONS</span><h2>Fleet status</h2></div><Link to="/admin/fleet">View fleet <ArrowOutwardRounded fontSize="inherit"/></Link></div><div className="admin-status-list">{Object.entries(statusLabels).map(([key,label])=><div className="admin-status-row" key={key}><span><i style={{background:statusColors[key]}}/>{label}</span><b>{data?.statuses?.[key] ?? 0}</b></div>)}</div><div className="admin-status-total"><span>Verified inventory records</span><strong>{data?.totals.verified_inventory ?? 0}</strong></div></section>
      <section className="admin-panel admin-category-panel"><div className="admin-panel-heading"><div><span>COLLECTION MIX</span><h2>Vehicles by category</h2></div></div>{(data?.categories || []).map(item=><div className="admin-category-row" key={item.category}><div><span>{item.category}</span><b>{item.count}</b></div><div className="admin-bar-track"><i style={{width:`${Math.max(3,item.count/maxCategory*100)}%`}}/></div></div>)}{!data?.categories?.length && <p className="admin-panel-note">No category data yet.</p>}</section>
      <section className="admin-panel admin-activity-panel"><div className="admin-panel-heading"><div><span>FLEET AUDIT TRAIL</span><h2>Recent activity</h2></div><Link to="/admin/fleet">Manage <ArrowOutwardRounded fontSize="inherit"/></Link></div>{data?.recentActivity?.length ? data.recentActivity.map(item=><div className="admin-activity-row" key={item.id}><span className="admin-activity-dot"/><div><b>{item.stock_code} · {item.make} {item.model}</b><small>{statusLabels[item.previous_status] || 'New'} → {statusLabels[item.new_status] || item.new_status} · {item.actor}</small></div><time>{new Date(item.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</time></div>) : <div className="admin-activity-empty">No status changes recorded yet. Changes made in Fleet Management will appear here.</div>}</section></div>
      <div className="admin-phase-note"><b>Phase 3 scope</b><span>Vehicle catalogue, pricing references, fleet status and admin controls. Reservation requests and status control are available in Phase 4. Payments, live GPS and telematics remain future work.</span></div>
      </Container>
    </section></main>;
}
