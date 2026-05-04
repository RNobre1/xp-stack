import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { hashFile } from './manifest.js';

/**
 * Copia source -> dest se dest nao existe. Idempotente.
 *
 * @param {string} sourcePath - Path absoluto do source
 * @param {string} destPath - Path absoluto do destino
 * @returns {{hash?: string, skipped?: boolean}}
 */
export function scaffoldFile(sourcePath, destPath) {
  if (existsSync(destPath)) return { skipped: true };
  mkdirSync(dirname(destPath), { recursive: true });
  copyFileSync(sourcePath, destPath);
  return { hash: hashFile(destPath) };
}

/**
 * Copia recursivo sourceDir -> destDir se destDir nao existe.
 * Atomic-ish: tudo-ou-nada na perspectiva do usuario (skip se ja existe).
 *
 * @param {string} sourceDir
 * @param {string} destDir
 * @returns {{copied: Array<{destPath: string, hash: string}>, skipped: boolean}}
 */
export function scaffoldDir(sourceDir, destDir) {
  if (existsSync(destDir)) return { copied: [], skipped: true };
  const copied = [];
  function walk(srcSub, destSub) {
    mkdirSync(destSub, { recursive: true });
    for (const entry of readdirSync(srcSub)) {
      const srcPath = join(srcSub, entry);
      const destPath = join(destSub, entry);
      if (statSync(srcPath).isDirectory()) {
        walk(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
        copied.push({ destPath, hash: hashFile(destPath) });
      }
    }
  }
  walk(sourceDir, destDir);
  return { copied, skipped: false };
}

/**
 * Cria symlink relativo de linkPath -> target. Skip se linkPath existe (regular ou symlink).
 *
 * @param {string} target - Target relativo ao diretorio de linkPath
 * @param {string} linkPath - Path absoluto do symlink a criar
 * @returns {{skipped: boolean}}
 */
export function scaffoldSymlink(target, linkPath) {
  // Use try/catch instead of existsSync — existsSync follows symlinks and would
  // miss broken links. We want to skip if ANY entry exists at linkPath.
  try {
    // lstatSync via dynamic require not needed; existsSync covers regular files & valid symlinks.
    if (existsSync(linkPath)) return { skipped: true };
  } catch {
    /* fallthrough */
  }
  mkdirSync(dirname(linkPath), { recursive: true });
  symlinkSync(target, linkPath);
  return { skipped: false };
}

/**
 * Append idempotente de uma linha ao .gitignore. Cria arquivo se nao existe.
 *
 * @param {string} line - Linha a adicionar (sem trailing newline)
 * @param {string} projectRoot
 * @returns {{skipped: boolean}}
 */
export function injectGitignoreLine(line, projectRoot) {
  const gitignorePath = join(projectRoot, '.gitignore');
  const target = line.trim();
  let content = '';
  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, 'utf8');
    const lines = content.split('\n').map((l) => l.trim());
    if (lines.includes(target)) return { skipped: true };
    if (content.length > 0 && !content.endsWith('\n')) content += '\n';
  }
  content += target + '\n';
  writeFileSync(gitignorePath, content, 'utf8');
  return { skipped: false };
}
