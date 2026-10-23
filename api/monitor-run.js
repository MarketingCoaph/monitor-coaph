import { monitor, authorized } from './_lib/monitor.js';
import { allow, fail, send } from './_lib/http.js';

export const config = { maxDuration: 300 };
export default async function handler(req, res) {
  if (!allow(req, res, ['POST'])) return;
  if (!authorized(req)) return fail(res, 'Não autorizado', 401);
  try {
    const result = await monitor().run({ force: true });
    send(res, result.run);
  } catch (error) { fail(res, error); }
}
