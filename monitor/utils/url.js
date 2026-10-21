const TRACKING_PARAMS = new Set(['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','ref','source','hl','__d','igsh','igshid']);

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
    if (url.hostname === 'instagram.com') {
      const post = url.pathname.match(/^\/(?:[^/]+\/)?(p|reel|reels)\/([^/]+)/i);
      if (post) url.pathname = `/${post[1].toLowerCase()==='p'?'p':'reels'}/${post[2]}`;
    }
    return url.toString();
  } catch { return value.trim(); }
}

export function domainOf(value = '') {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
}
