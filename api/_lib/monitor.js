import { MonitorPipeline } from '../../monitor/pipeline.js';
import { SupabaseCandidateStore } from '../../monitor/store/supabaseStore.js';

let pipeline;
export function monitor() {
  const store = new SupabaseCandidateStore();
  pipeline ||= new MonitorPipeline({ serperApiKey: process.env.SERPER_API_KEY || '', store, loadConfig: () => store.getConfig() });
  return pipeline;
}

export function authorized(req) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return process.env.NODE_ENV !== 'production';
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || req.headers['x-cron-secret'];
  return supplied === expected || req.headers['x-vercel-cron'] === '1';
}
