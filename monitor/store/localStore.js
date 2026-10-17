import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export class LocalCandidateStore {
  constructor(file = path.resolve('data/monitor-cache.json')) { this.file = file; }
  async load() {
    try { return JSON.parse(await readFile(this.file, 'utf8')); } catch { return null; }
  }
  async save(snapshot) {
    await mkdir(path.dirname(this.file), { recursive: true });
    const temporary = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, JSON.stringify(snapshot, null, 2), 'utf8');
    await rename(temporary, this.file);
  }
}
