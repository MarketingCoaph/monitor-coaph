export function normalizeText(value = '') {
  return String(value).toLocaleLowerCase('pt-BR').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function decodeXml(value = '') {
  const entities = text => text.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  const decoded = entities(String(value).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'));
  return entities(decoded.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim();
}

export function normalizeTitle(value = '') {
  return normalizeText(value).replace(/\b(cn7|news ceara|g1|opovo|diario do nordeste)\b$/g, '').trim();
}
