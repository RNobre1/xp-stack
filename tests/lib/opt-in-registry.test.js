import { describe, it, expect } from 'vitest';
import {
  OPT_IN_SKILLS,
  resolveSkillName,
  listAvailableSkills,
  formatUnknownSkillError,
} from '../../src/lib/opt-in-registry.js';

describe('opt-in-registry', () => {
  it('mantém as skills opt-in canônicas existentes', () => {
    expect(Object.keys(OPT_IN_SKILLS)).toEqual(
      expect.arrayContaining([
        'paperclip-orchestrator',
        'local-waves',
        'bootstrap',
        'claude-md-bootstrap',
        'db-archaeologist',
        'screenshot-spec-writer',
        'flowchart-extractor',
        'debugging-discipline',
        'code-review-automation',
      ])
    );
  });

  it('resolve Jev como opt-in manual na fonte de plugin', () => {
    expect(resolveSkillName('jev')).toBe('jev-triage');
    expect(OPT_IN_SKILLS['jev-triage'].sourceRoot).toBe('plugins/xp-stack/skills');
    expect(formatUnknownSkillError('missing')).toContain('jev-triage');
  });

  it('debugging-discipline vive em templates/opt-in-skills (v2.0.0)', () => {
    expect(OPT_IN_SKILLS['debugging-discipline'].sourceRoot).toBe('templates/opt-in-skills');
  });

  it('code-review-automation vive em templates/opt-in-skills (v2.1.0)', () => {
    expect(OPT_IN_SKILLS['code-review-automation'].sourceRoot).toBe('templates/opt-in-skills');
  });

  it('paperclip-orchestrator vive em plugins/xp-stack/skills (nao templates/opt-in-skills)', () => {
    expect(OPT_IN_SKILLS['paperclip-orchestrator'].sourceRoot).toBe('plugins/xp-stack/skills');
  });

  it('db-archaeologist vive em templates/opt-in-skills (legado, mantido)', () => {
    expect(OPT_IN_SKILLS['db-archaeologist'].sourceRoot).toBe('templates/opt-in-skills');
  });

  describe('resolveSkillName', () => {
    it('canonical name retorna ele proprio', () => {
      expect(resolveSkillName('paperclip-orchestrator')).toBe('paperclip-orchestrator');
      expect(resolveSkillName('local-waves')).toBe('local-waves');
    });

    it('alias resolve pra canonical', () => {
      expect(resolveSkillName('paperclip')).toBe('paperclip-orchestrator');
      expect(resolveSkillName('waves')).toBe('local-waves');
      expect(resolveSkillName('claude-md')).toBe('claude-md-bootstrap');
      expect(resolveSkillName('db')).toBe('db-archaeologist');
      expect(resolveSkillName('debug-discipline')).toBe('debugging-discipline');
      expect(resolveSkillName('fix-gates')).toBe('debugging-discipline');
      expect(resolveSkillName('debugging')).toBe('debugging-discipline');
      expect(resolveSkillName('review-auto')).toBe('code-review-automation');
      expect(resolveSkillName('pr-review-gate')).toBe('code-review-automation');
      expect(resolveSkillName('self-review')).toBe('code-review-automation');
      expect(resolveSkillName('review')).toBe('code-review-automation');
    });

    it('input desconhecido retorna null', () => {
      expect(resolveSkillName('skill-inexistente')).toBe(null);
      expect(resolveSkillName('')).toBe(null);
    });
  });

  describe('listAvailableSkills', () => {
    it('retorna entradas únicas com name, aliases e summary', () => {
      const all = listAvailableSkills();
      expect(new Set(all.map((s) => s.name)).size).toBe(all.length);
      const paperclip = all.find((s) => s.name === 'paperclip-orchestrator');
      expect(paperclip.aliases).toContain('paperclip');
      expect(paperclip.summary).toMatch(/Paperclip/);
      const debugging = all.find((s) => s.name === 'debugging-discipline');
      expect(debugging.aliases).toContain('debugging');
      const codeReview = all.find((s) => s.name === 'code-review-automation');
      expect(codeReview.aliases).toContain('review-auto');
    });
  });

  describe('formatUnknownSkillError', () => {
    it('lista as skills do registry e seus aliases na mensagem', () => {
      const msg = formatUnknownSkillError('xyz');
      expect(msg).toMatch(/skill desconhecida "xyz"/);
      expect(msg).toMatch(/paperclip-orchestrator/);
      expect(msg).toMatch(/alias: paperclip/);
      expect(msg).toMatch(/local-waves/);
      expect(msg).toMatch(/db-archaeologist/);
      expect(msg).toMatch(/debugging-discipline/);
      expect(msg).toMatch(/code-review-automation/);
    });
  });
});
