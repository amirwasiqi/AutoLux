import { useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';

// Wikimedia Commons is queried by the AutoLux API, avoiding browser-side Commons
// API/CORS failures. The Unsplash images below are fallbacks only, not model-specific.
const photoSets = {
  sedan: [
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=85'
  ],
  suv: [
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=85'
  ],
  sports: [
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=85'
  ],
  ev: [
    'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1560958089-b8a1929d?auto=format&fit=crop&w=1200&q=85'
  ],
  general: [
    'https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85'
  ]
};
function categoryFor(query = '', alt = '') {
  const text = `${query} ${alt}`.toLowerCase();
  if (/electric|tesla|lucid|ioniq|ev /.test(text)) return 'ev';
  if (/suv|crossover|4runner|rav4|cr-v|explorer|tahoe|x[357]|gle|glc/.test(text)) return 'suv';
  if (/sport|coupe|convertible|911|supra|mustang|corvette|f-type|vantage|z /.test(text)) return 'sports';
  if (/sedan|camry|corolla|accord|civic|3 series|5 series|a4|a6|c-class|e-class/.test(text)) return 'sedan';
  return 'general';
}
const apiRoot = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');

export default function VehicleImage({ query, alt, className = '', eager = false, src, slug, sourcePage, license, credit }) {
  const fallbacks = useMemo(() => photoSets[categoryFor(query, alt)], [query, alt]);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const commonsSrc = slug ? `${apiRoot}/vehicles/${encodeURIComponent(slug)}/photo` : '';
  const currentSrc = fallbackIndex === 0 && src ? src : (fallbackIndex === 0 && commonsSrc ? commonsSrc : fallbacks[fallbackIndex - (src || commonsSrc ? 1 : 0)]);

  useEffect(() => { setFallbackIndex(0); setFailed(false); }, [src, slug, query, alt]);
  const handleError = () => {
    const next = fallbackIndex + 1;
    const total = fallbacks.length + (src || commonsSrc ? 1 : 0);
    if (next < total) setFallbackIndex(next);
    else setFailed(true);
  };
  const isFallback = fallbackIndex > 0 || (!src && !commonsSrc);

  return <Box className={`vehicle-image ${className}`}>
    {!failed ? <>
      <img key={currentSrc} src={currentSrc} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={handleError} />
      <a className="image-credit" href={isFallback ? 'https://unsplash.com/license' : (sourcePage || 'https://commons.wikimedia.org/')} target="_blank" rel="noreferrer">
        {isFallback ? 'Representative vehicle photo · Unsplash' : `Vehicle photo · ${credit || 'Wikimedia Commons'}${license ? ` · ${license}` : ''}`}
      </a>
    </> : <Box className="vehicle-image-placeholder"><span className="vehicle-placeholder-mark">A·L</span><Typography variant="caption">Vehicle photo unavailable</Typography></Box>}
  </Box>;
}
