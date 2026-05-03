// O subcomando "version" e' implementado via commander.version() no index.js
// (registra automaticamente as flags -V e --version).
//
// Este modulo existe pra futuro suporte a `xp-stack version` como subcomando
// explicito (ex: imprimir versao + node version + engines instaladas).
//
// Por enquanto, no-op exportado pra manter contrato do router.

export function registerVersion(program) {
  // commander ja registrou -V/--version em index.js. Sem subcomando explicito.
  return program;
}
