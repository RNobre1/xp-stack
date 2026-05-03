import { describe, it, expect } from 'vitest';
import { renderResearchMarkdown } from '../../src/lib/research-renderer.js';

describe('research-renderer', () => {
  const sources = [
    { id: 'S1', url: 'https://example.com/a', title: 'Source A', type: 'official_docs', accessed_at: '2026-05-03', hash: 'sha256:1' },
    { id: 'S2', url: 'https://example.com/b', title: 'Source B', type: 'blog_post', accessed_at: '2026-05-03', hash: 'sha256:2' },
  ];

  const claims = [
    { id: 'C1', statement: 'X eh verdade comprovada', sources: ['S1'], confidence: '🟢', reviewed_by_critic: true },
    { id: 'C2', statement: 'Y eh inferido por padrao', sources: ['S1', 'S2'], confidence: '🟡', reviewed_by_critic: false },
    { id: 'C3', statement: 'Z requer validacao humana', sources: ['S2'], confidence: '🔴', reviewed_by_critic: false },
  ];

  it('inclui header da pesquisa', () => {
    const md = renderResearchMarkdown('estudo-x', sources, claims);
    expect(md).toMatch(/# estudo-x/i);
  });

  it('inclui claims com inline citations [S1]', () => {
    const md = renderResearchMarkdown('estudo-x', sources, claims);
    expect(md).toMatch(/X eh verdade comprovada.*\[S1\]/);
    expect(md).toMatch(/Y eh inferido por padrao.*\[S1, S2\]/);
  });

  it('inclui confidence markers visualmente', () => {
    const md = renderResearchMarkdown('estudo-x', sources, claims);
    expect(md).toMatch(/🟢/);
    expect(md).toMatch(/🟡/);
    expect(md).toMatch(/🔴/);
  });

  it('inclui secao de fontes com URLs', () => {
    const md = renderResearchMarkdown('estudo-x', sources, claims);
    expect(md).toMatch(/Fontes|Sources/i);
    expect(md).toMatch(/Source A.*https:\/\/example\.com\/a/);
    expect(md).toMatch(/Source B.*https:\/\/example\.com\/b/);
  });

  it('marca claims revisados pelo critic', () => {
    const md = renderResearchMarkdown('estudo-x', sources, claims);
    expect(md).toMatch(/critic|revisado/i);
  });

  it('lida com listas vazias sem crashar', () => {
    expect(() => renderResearchMarkdown('vazio', [], [])).not.toThrow();
    const md = renderResearchMarkdown('vazio', [], []);
    expect(md).toMatch(/# vazio/i);
  });
});
