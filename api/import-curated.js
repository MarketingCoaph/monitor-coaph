import { importCuratedNews } from '../scripts/import-curated-news.js';
import { authorized } from './_lib/monitor.js';
import { allow, fail, send } from './_lib/http.js';

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  if (!allow(req, res, ['POST'])) return;
  if (!authorized(req)) return fail(res, 'Não autorizado', 401);
  try {
    send(res, await importCuratedNews());
  } catch (error) {
    fail(res, error);
  }
}
