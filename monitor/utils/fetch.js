import { REQUEST_TIMEOUT_MS } from '../config.js';

export async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options, signal: controller.signal,
      headers: { 'User-Agent': 'Monitor-COAPH/2.0 (+news-monitor)', ...options.headers },
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 240);
      throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    }
    return response;
  } finally { clearTimeout(timer); }
}
