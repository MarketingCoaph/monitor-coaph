const TRACKING_PARAMS = new Set(['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','ref','source']);

export function normalizeUrl(value = '') {
  try {
    const url = new URL(value);
    // HTTP and HTTPS variants point to the same article for monitored portals.
    if (url.protocol === 'http:') url.protocol = 'https:';
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
    url.searchParams.sort();
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString();
  } catch { return value.trim(); }
}

export function domainOf(value = '') {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
}
