import { describe, it, expect } from 'vitest';
import {
  OPT_IN_SKILLS,
  resolveSkillName,
  listAvailableSkills,
  formatUnknownSkillError,
} from '../../src/lib/opt-in-registry.js';

describe('opt-in-registry', () => {
  it('contem 7 skills opt-in canonicas (incluindo paperclip e local-waves)', () => {
    expect(Object.keys(OPT_IN_SKILLS)).toEqual(
      expect.arrayContaining([
        'paperclip-orchestrator',
        'local-waves',
        'bootstrap',
        'claude-md-bootstrap',
        'db-archaeologist',
        'screenshot-spec-writer',
        'flowchart-extractor',
      ])
    );
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
    });

    it('input desconhecido retorna null', () => {
      expect(resolveSkillName('skill-inexistente')).toBe(null);
      expect(resolveSkillName('')).toBe(null);
    });
  });

  describe('listAvailableSkills', () => {
    it('retorna 7 entradas com name, aliases, summary', () => {
      const all = listAvailableSkills();
      expect(all).toHaveLength(7);
      const paperclip = all.find((s) => s.name === 'paperclip-orchestrator');
      expect(paperclip.aliases).toContain('paperclip');
      expect(paperclip.summary).toMatch(/Paperclip/);
    });
  });

  describe('formatUnknownSkillError', () => {
    it('lista todas as 7 skills e seus aliases na mensagem', () => {
      const msg = formatUnknownSkillError('xyz');
      expect(msg).toMatch(/skill desconhecida "xyz"/);
      expect(msg).toMatch(/paperclip-orchestrator/);
      expect(msg).toMatch(/alias: paperclip/);
      expect(msg).toMatch(/local-waves/);
      expect(msg).toMatch(/db-archaeologist/);
    });
  });
});
