import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { validate } from './validators.js';

const SOURCES_FILE = 'sources.json';
const CLAIMS_FILE = 'claims.json';

export function EMPTY_SOURCES() { return []; }
export function EMPTY_CLAIMS() { return []; }

export function readSources(slugDir) {
  const path = join(slugDir, SOURCES_FILE);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeSources(slugDir, sources) {
  const result = validate('sources', sources);
  if (!result.valid) {
    throw new Error(`Sources invalido contra schema:\n${JSON.stringify(result.errors, null, 2)}`);
  }
  const path = join(slugDir, SOURCES_FILE);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(sources, null, 2) + '\n', 'utf8');
}

export function readClaims(slugDir) {
  const path = join(slugDir, CLAIMS_FILE);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeClaims(slugDir, claims) {
  const result = validate('claims', claims);
  if (!result.valid) {
    throw new Error(`Claims invalido contra schema:\n${JSON.stringify(result.errors, null, 2)}`);
  }
  const path = join(slugDir, CLAIMS_FILE);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(claims, null, 2) + '\n', 'utf8');
}

export function addSource(slugDir, source) {
  const list = readSources(slugDir) ?? EMPTY_SOURCES();
  list.push(source);
  writeSources(slugDir, list);
}

export function addClaim(slugDir, claim) {
  const list = readClaims(slugDir) ?? EMPTY_CLAIMS();
  list.push(claim);
  writeClaims(slugDir, list);
}
