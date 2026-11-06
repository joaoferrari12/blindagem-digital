import { describe, expect, it } from 'vitest';
import { t } from '../src/i18n';
import { buildPlanDocument } from '../src/report';
import { computeResult } from '../src/scoring';

describe('t', () => {
  it('replaces every placeholder', () => {
    expect(t('pt', 'questionOf', { n: 3, total: 14 })).toBe('Pergunta 3 de 14');
    expect(t('en', 'questionOf', { n: 3, total: 14 })).toBe('Question 3 of 14');
  });
});

describe('buildPlanDocument', () => {
  it('produces a standalone HTML document in the chosen language with the score and the actions', () => {
    const r = computeResult({ email2fa: 'no', wapin: 'yes' });
    const pt = buildPlanDocument('pt', r);
    const en = buildPlanDocument('en', r);
    expect(pt.startsWith('<!doctype html>')).toBe(true);
    expect(pt).toContain('lang="pt-BR"');
    expect(pt).toContain('Nota 50 de 100');
    expect(pt).toContain('Ligue a verificação em duas etapas no e-mail');
    expect(pt).toContain('WhatsApp com PIN de confirmação');
    expect(en).toContain('lang="en"');
    expect(en).toContain('Score 50 out of 100');
    expect(en).toContain('Turn on two-step verification on your e-mail');
  });

  it('escapes HTML in content', () => {
    const r = computeResult({ quiz_son: 'real' });
    expect(buildPlanDocument('pt', r)).not.toMatch(/<script/i);
  });
});
