import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const allowedLicense = /^(CC BY(?:-SA)?(?:\s|$)|CC0|Public domain|Free Art License|GFDL|GNU Free Documentation)/i;
const stripHtml = (value = '') => value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

export default function VehicleImage({ query, alt, className = '', eager = false, src, sourcePage, license, credit }) {
  const host = useRef(null);
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (src) { setAsset({ src, sourcePage: sourcePage || src, license: license || 'Provided image', credit: credit || 'AutoLux' }); return undefined; }
    if (!query || asset || failed) return undefined;
    let active = true;
    let observer;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          action: 'query', generator: 'search', gsrsearch: query,
          gsrnamespace: '6', gsrlimit: '10', prop: 'imageinfo',
          iiprop: 'url|extmetadata', iiurlwidth: '1400', format: 'json', origin: '*'
        });
        const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);
        if (!response.ok) throw new Error('Image search unavailable');
        const payload = await response.json();
        const pages = Object.values(payload.query?.pages || {});
        const candidate = pages.map((page) => {
          const info = page.imageinfo?.[0];
          const meta = info?.extmetadata || {};
          const license = stripHtml(meta.LicenseShortName?.value || '');
          return { page, info, meta, license };
        }).find((item) => item.info?.thumburl && allowedLicense.test(item.license) && !/\bNC\b|\bND\b/i.test(item.license));
        if (!candidate) throw new Error('No reusable image found');
        const fileTitle = candidate.page.title.replace(/^File:/, '');
        const sourcePage = `https://commons.wikimedia.org/wiki/${encodeURIComponent(candidate.page.title.replaceAll(' ', '_'))}`;
        if (active) setAsset({
          src: candidate.info.thumburl,
          sourcePage,
          license: candidate.license,
          credit: stripHtml(candidate.meta.Artist?.value || candidate.meta.Credit?.value || 'Wikimedia Commons contributor')
        });
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    if (eager || !('IntersectionObserver' in window)) load();
    else {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      }, { rootMargin: '240px' });
      if (host.current) observer.observe(host.current);
    }
    return () => { active = false; observer?.disconnect(); };
  }, [query, asset, failed, eager, src, sourcePage, license, credit]);

  return <Box ref={host} className={`vehicle-image ${className}`}>
    {asset ? <>
      <img src={asset.src} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} />
      <a className="image-credit" href={asset.sourcePage} target="_blank" rel="noreferrer" title={`${asset.credit} · ${asset.license}`}>Photo: {asset.credit} · {asset.license}</a>
    </> : <Box className="vehicle-image-placeholder">
      {loading ? <CircularProgress size={22} color="primary" /> : <>
        <span className="vehicle-placeholder-mark">A·L</span>
        <Typography variant="caption">{failed ? 'Photo unavailable' : 'Vehicle photography'}</Typography>
      </>}
    </Box>}
  </Box>;
}
