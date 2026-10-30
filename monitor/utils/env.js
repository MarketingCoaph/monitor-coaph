import { readFile } from 'node:fs/promises';

export async function loadEnvFile(file = '.env') {
  try {
    const content = await readFile(file, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || match[1] in process.env) continue;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch { /* .env é opcional */ }
}
