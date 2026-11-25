import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Container, FormControl, InputLabel, MenuItem, Pagination, Select, Skeleton, Stack, TextField, Typography } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import VehicleImage from '../components/VehicleImage.jsx';

const money = (value) => value == null ? 'Price on request' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value));

function VehicleCard({ vehicle }) {
  return <article className="vehicle-card">
    <Link to={`/vehicles/${vehicle.slug}`} className="vehicle-card-image-link" aria-label={`View ${vehicle.make} ${vehicle.model}`}>
    
      <VehicleImage slug={vehicle.slug} query={vehicle.image_search_query || `${vehicle.model_year} ${vehicle.make} ${vehicle.model} car exterior`} src={vehicle.image_url} sourcePage={vehicle.image_source_url} license={vehicle.image_license} credit={vehicle.image_credit} alt={`${vehicle.model_year} ${vehicle.make} ${vehicle.model}`} />
      <span className="vehicle-card-category">{vehicle.category}</span>
      <span className="vehicle-card-stock">{vehicle.stock_code}</span>{vehicle.is_demo && <span className="vehicle-card-stock" style={{ left: 12, right: "auto", top: 48 }}>DEMONSTRATION VEHICLE · NOT BOOKABLE</span>}
    </Link>
    <div className="vehicle-card-content">
      <div className="vehicle-card-heading"><div><p className="vehicle-card-make">{vehicle.make} · {vehicle.model_year}</p><h2>{vehicle.model}</h2></div><span className="vehicle-card-arrow"><ArrowOutwardRounded fontSize="small" /></span></div>
      <div className="vehicle-card-specs"><span>{vehicle.transmission}</span><span>{vehicle.fuel_type}</span><span>{vehicle.seats} seats</span></div>
      <div className="vehicle-card-prices">
        {vehicle.daily_rental_price_usd != null && <div><small>RENT FROM</small><strong>{money(vehicle.daily_rental_price_usd)}<em>/day</em></strong></div>}
        {vehicle.sale_price_usd != null && <div><small>MARKET GUIDE</small><strong>{money(vehicle.sale_price_usd)}</strong></div>}
      </div>
      <Link to={`/vehicles/${vehicle.slug}`} className="vehicle-card-link">View vehicle <ArrowOutwardRounded fontSize="small" /></Link>
    </div>
  </article>;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [filters, setFilters] = useState({ categories: [], makes: [] });
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [make, setMake] = useState('all');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('featured');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/vehicles/filters').then(({ data }) => setFilters(data.data)).catch(() => { }); }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/vehicles', { params: { page, pageSize: 12, search, category: category === 'all' ? '' : category, make: make === 'all' ? '' : make, type: type === 'all' ? '' : type, sort } });
        if (active) { setVehicles(data.data); setPagination(data.pagination); }
      } catch (err) { if (active) setError(err.response?.data?.error?.message || 'The vehicle catalogue could not be loaded.'); }
      finally { if (active) setLoading(false); }
    }, 220);
    return () => { active = false; clearTimeout(timer); };
  }, [page, search, category, make, type, sort]);

  const activeFilters = useMemo(() => [category !== 'all' && category, make !== 'all' && make, type !== 'all' && (type === 'rental' ? 'Rental' : 'For sale')].filter(Boolean), [category, make, type]);
  const submitSearch = (event) => { event.preventDefault(); setPage(1); setSearch(query.trim()); };
  const clearFilters = () => { setQuery(''); setSearch(''); setCategory('all'); setMake('all'); setType('all'); setSort('featured'); setPage(1); };

  return <main className="catalog-page">
    <section className="catalog-hero"><Container maxWidth="xl">
      <p className="eyebrow"><span className="eyebrow-line" /> THE AUTOLUX COLLECTION</p>
      <div className="catalog-hero-row"><div><h1>Find your<br /><span>next drive.</span></h1><p>From considered everyday comfort to something a little more extraordinary. Explore the AutoLux vehicle collection.</p></div>
        <div className="catalog-hero-stat"><strong>100</strong><span>VEHICLES IN THE COLLECTION</span><i>One place. Every kind of drive.</i></div></div>
      <div className="catalog-hero-bottom"><span>RENTAL · SALES · PREMIUM FLEET</span><span>UNITED STATES</span></div>
    </Container></section>

    <Container maxWidth="xl" className="catalog-main">
      <div className="catalog-toolbar"><div><p className="eyebrow"><span className="eyebrow-line" /> DISCOVER THE FLEET</p><Typography variant="h4" component="h2">The collection <span className="catalog-count">{pagination.total.toString().padStart(3, '0')} VEHICLES</span></Typography></div>
        <form className="catalog-search" onSubmit={submitSearch}><TextField fullWidth size="small" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search make or model" inputProps={{ 'aria-label': 'Search make or model' }} /><Button type="submit" variant="contained" aria-label="Search vehicles"><SearchRounded /></Button></form>
      </div>
      <div className="catalog-filters"><div className="filter-label"><TuneRounded fontSize="small" /> REFINE</div>
        <FormControl size="small"><InputLabel>Category</InputLabel><Select label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}><MenuItem value="all">All categories</MenuItem>{filters.categories.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl>
        <FormControl size="small"><InputLabel>Make</InputLabel><Select label="Make" value={make} onChange={(e) => { setMake(e.target.value); setPage(1); }}><MenuItem value="all">All makes</MenuItem>{filters.makes.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl>
        <FormControl size="small"><InputLabel>Listing</InputLabel><Select label="Listing" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><MenuItem value="all">Rental & sales</MenuItem><MenuItem value="rental">For rent</MenuItem><MenuItem value="sale">For sale</MenuItem></Select></FormControl>
        <FormControl size="small" className="catalog-sort"><InputLabel>Sort by</InputLabel><Select label="Sort by" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}><MenuItem value="featured">Featured</MenuItem><MenuItem value="price_low">Price: low to high</MenuItem><MenuItem value="price_high">Price: high to low</MenuItem><MenuItem value="name">Name</MenuItem></Select></FormControl>
        {activeFilters.length > 0 && <Button onClick={clearFilters} color="inherit" size="small">Clear filters</Button>}
      </div>
      {activeFilters.length > 0 && <Stack direction="row" spacing={1} className="active-filter-chips">{activeFilters.map((item) => <Chip key={item} label={item} size="small" variant="outlined" />)}</Stack>}
      {error && <Alert severity="error" sx={{ my: 3 }}>{error}</Alert>}
      {loading ? <div className="vehicle-grid">{Array.from({ length: 6 }).map((_, i) => <div className="vehicle-card-skeleton" key={i}><Skeleton variant="rectangular" height={220} /><Skeleton width="55%" /><Skeleton width="80%" /><Skeleton width="45%" /></div>)}</div>
        : vehicles.length ? <div className="vehicle-grid">{vehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}</div>
          : <div className="catalog-empty"><span>NO MATCHES</span><h2>Nothing in this lane.</h2><p>Try a different make, category or search term.</p><Button onClick={clearFilters} variant="outlined">Reset filters</Button></div>}
      {!loading && pagination.totalPages > 1 && <div className="catalog-pagination"><span>SHOWING {((page - 1) * 12) + 1}–{Math.min(page * 12, pagination.total)} OF {pagination.total}</span><Pagination count={pagination.totalPages} page={page} onChange={(_, value) => { setPage(value); window.scrollTo({ top: 500, behavior: 'smooth' }); }} color="primary" shape="rounded" /></div>}
      <p className="catalog-price-note">Prices are market-guide starting points for demonstration. Final rental and purchase prices depend on model year, trim, condition, branch, dates, taxes and fees. Seeded listings are sample catalogue entries, not confirmation of physical inventory.</p>
    </Container>
  </main>;
}
