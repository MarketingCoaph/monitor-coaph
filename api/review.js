import { supabaseAdmin, assertDb } from './_lib/supabase.js';
import { allow, fail, send } from './_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['GET'])) return;
  try {
    const result = await supabaseAdmin().from('news').select('*').in('relevance_status', ['possibly_related', 'manual_review']).order('relevance_score', { ascending: false }).order('discovered_at', { ascending: false });
    send(res, assertDb(result) || []);
  } catch (error) { fail(res, error); }
}
