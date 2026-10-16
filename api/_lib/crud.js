import { supabaseAdmin, assertDb } from './supabase.js';
import { allow, body, fail, normalized, send } from './http.js';

const definitions = {
  'search_terms': { order: ['active', 'term'], fields: ['term', 'weight', 'active', 'notes'], required: ['term'] },
  'case_entities': { order: ['active', 'relevance_weight', 'name'], fields: ['name', 'normalized_name', 'type', 'relevance_weight', 'active', 'notes'], required: ['name', 'type'] },
  'sources': { order: ['active', 'name'], fields: ['name', 'type', 'url', 'active'], required: ['name', 'url'] },
};

export async function crudHandler(req, res, table) {
  if (!allow(req, res, ['GET', 'POST', 'PUT', 'DELETE'])) return;
  try {
    const cfg = definitions[table], db = supabaseAdmin();
    if (req.method === 'GET') {
      let query = db.from(table).select('*');
      for (const column of cfg.order) query = query.order(column, { ascending: column !== 'relevance_weight' });
      return send(res, assertDb(await query) || []);
    }
    const input = body(req), id = Number(input.id);
    if (req.method === 'DELETE') {
      if (!id) return fail(res, 'ID obrigatório', 400);
      assertDb(await db.from(table).delete().eq('id', id));
      return send(res, { deleted: true });
    }
    for (const field of cfg.required) if (!String(input[field] || '').trim()) return fail(res, `${field} é obrigatório`, 400);
    if (table === 'sources') { try { new URL(input.url); } catch { return fail(res, 'URL inválida', 400); } }
    const record = Object.fromEntries(cfg.fields.filter(key => input[key] !== undefined).map(key => [key, input[key]]));
    for (const key of ['weight', 'active', 'relevance_weight']) if (record[key] !== undefined) record[key] = Number(record[key]);
    if (table === 'case_entities') record.normalized_name = normalized(record.name);
    if (req.method === 'POST') return send(res, assertDb(await db.from(table).insert(record).select('id').single()), 201);
    if (!id) return fail(res, 'ID obrigatório', 400);
    assertDb(await db.from(table).update(record).eq('id', id));
    send(res, { updated: true });
  } catch (error) { fail(res, error); }
}
