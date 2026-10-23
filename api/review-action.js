import { supabaseAdmin, assertDb } from './_lib/supabase.js';
import { allow, body, fail, send } from './_lib/http.js';

export default async function handler(req, res) {
  if (!allow(req, res, ['POST'])) return;
  try {
    const input = body(req), id = Number(input.news_id);
    if (!id || !['related', 'unrelated', 'manual_review'].includes(input.status)) return fail(res, 'Revisão inválida', 400);
    const db = supabaseAdmin();
    const current = assertDb(await db.from('news').select('relevance_status').eq('id', id).maybeSingle());
    if (!current) return fail(res, 'Notícia não encontrada', 404);
    assertDb(await db.from('news').update({ relevance_status: input.status, manual_reviewed: 1, is_new: 0 }).eq('id', id));
    assertDb(await db.from('manual_reviews').insert({ news_id: id, previous_status: current.relevance_status, new_status: input.status, notes: String(input.notes || '') }));
    send(res, { updated: true });
  } catch (error) { fail(res, error); }
}
