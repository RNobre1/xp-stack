import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');
const PKG_JSON = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));

describe('xp-stack --version', () => {
  it('imprime a versao do package.json', () => {
    const output = execFileSync('node', [BIN, '--version'], { encoding: 'utf8' }).trim();
    expect(output).toBe(PKG_JSON.version);
  });

  it('aceita -V como atalho', () => {
    const output = execFileSync('node', [BIN, '-V'], { encoding: 'utf8' }).trim();
    expect(output).toBe(PKG_JSON.version);
  });
});
