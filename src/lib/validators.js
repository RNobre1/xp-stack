import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMAS_DIR = join(__dirname, '..', '..', 'schemas');

export const SCHEMA_NAMES = ['state', 'tasks', 'sources', 'claims', 'manifest', 'index'];

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validators = {};
for (const name of SCHEMA_NAMES) {
  const schemaPath = join(SCHEMAS_DIR, `${name}.schema.json`);
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  validators[name] = ajv.compile(schema);
}

/**
 * Valida data contra um schema nomeado.
 *
 * @param {string} schemaName - Um de SCHEMA_NAMES
 * @param {unknown} data - Dado a validar
 * @returns {{valid: boolean, errors: object[]|null}}
 */
export function validate(schemaName, data) {
  if (!validators[schemaName]) {
    throw new Error(`Schema desconhecido: ${schemaName}. Validos: ${SCHEMA_NAMES.join(', ')}`);
  }
  const validator = validators[schemaName];
  const valid = validator(data);
  return {
    valid,
    errors: valid ? null : validator.errors,
  };
}
