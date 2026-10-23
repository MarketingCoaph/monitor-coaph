export function send(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}

export function fail(res, error, status = 500) {
  const message = error instanceof Error ? error.message : String(error || 'Erro interno');
  res.status(status).json({ success: false, message });
}

export function allow(req, res, methods) {
  res.setHeader('Cache-Control', 'no-store');
  if (methods.includes(req.method)) return true;
  res.setHeader('Allow', methods.join(', '));
  fail(res, 'Método não permitido', 405);
  return false;
}

export function body(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
}

export function normalized(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
