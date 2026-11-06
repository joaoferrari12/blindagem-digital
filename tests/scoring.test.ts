import { describe, expect, it } from 'vitest';
import { QUESTIONS, TOTAL_QUESTIONS } from '../src/questions';
import { LEVEL_GOOD, LEVEL_WARN, computeResult, highPriorityMinutes, levelFor, priorityFor, type Answers } from '../src/scoring';

/** Every question answered with the option that earns the given credit. */
function allWith(credit: 0 | 0.5 | 1): Answers {
  const answers: Answers = {};
  for (const q of QUESTIONS) {
    if (q.kind === 'pwned') {
      answers[q.id] = credit === 1 ? { status: 'safe' } : { status: 'leaked', count: 10 };
      continue;
    }
    const opt = q.options.find((o) => o.credit === credit && !o.unknown) ?? q.options.find((o) => o.credit === credit);
    if (opt) answers[q.id] = opt.id;
  }
  return answers;
}

describe('question bank', () => {
  it('has 14 questions: 5 accounts, 4 devices, 5 scams', () => {
    expect(TOTAL_QUESTIONS).toBe(14);
    const count = (c: string) => QUESTIONS.filter((q) => q.category === c).length;
    expect(count('accounts')).toBe(5);
    expect(count('devices')).toBe(4);
    expect(count('scams')).toBe(5);
  });

  it('every choice question has exactly one full-credit option and unique ids', () => {
    const ids = new Set<string>();
    for (const q of QUESTIONS) {
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);
      if (q.kind !== 'choice') continue;
      const full = q.options.filter((o) => o.credit === 1);
      expect(full.length, q.id).toBeGreaterThanOrEqual(1);
      expect(new Set(q.options.map((o) => o.id)).size).toBe(q.options.length);
    }
  });

  it('has both languages for every string', () => {
    for (const q of QUESTIONS) {
      expect(q.title.pt).toBeTruthy();
      expect(q.title.en).toBeTruthy();
      expect(q.action.how.pt).toBeTruthy();
      expect(q.action.how.en).toBeTruthy();
      if (q.kind === 'choice') for (const o of q.options) expect(o.label.en && o.label.pt).toBeTruthy();
    }
  });
});

describe('levelFor', () => {
  it('uses the 80 / 50 thresholds', () => {
    expect(levelFor(100)).toBe('good');
    expect(levelFor(LEVEL_GOOD)).toBe('good');
    expect(levelFor(LEVEL_GOOD - 1)).toBe('warn');
    expect(levelFor(LEVEL_WARN)).toBe('warn');
    expect(levelFor(LEVEL_WARN - 1)).toBe('bad');
    expect(levelFor(0)).toBe('bad');
  });
});

describe('priorityFor', () => {
  it('maps weight to priority and drops one step on half credit', () => {
    expect(priorityFor(3, 0)).toBe('high');
    expect(priorityFor(2, 0)).toBe('medium');
    expect(priorityFor(1, 0)).toBe('low');
    expect(priorityFor(3, 0.5)).toBe('medium');
    expect(priorityFor(2, 0.5)).toBe('low');
    expect(priorityFor(1, 0.5)).toBe('low');
  });
});

describe('computeResult', () => {
  it('scores 100 and produces no actions when everything is protected', () => {
    const r = computeResult(allWith(1));
    expect(r.score).toBe(100);
    expect(r.level).toBe('good');
    expect(r.actions).toEqual([]);
    expect(r.done).toHaveLength(TOTAL_QUESTIONS);
    expect(r.byCategory).toEqual({ accounts: 100, devices: 100, scams: 100 });
  });

  it('scores 0 and lists every question as an action when nothing is protected', () => {
    const r = computeResult(allWith(0));
    expect(r.score).toBe(0);
    expect(r.level).toBe('bad');
    expect(r.actions).toHaveLength(TOTAL_QUESTIONS);
    expect(r.done).toEqual([]);
  });

  it('returns an empty result with answered = 0 when nothing was answered', () => {
    const r = computeResult({});
    expect(r.answered).toBe(0);
    expect(r.score).toBe(0);
    expect(r.actions).toEqual([]);
  });

  it('weights by question weight: one high-weight miss costs more than one low-weight miss', () => {
    const base = allWith(1);
    const missHigh = { ...base, email2fa: 'no' }; // weight 3
    const missLow = { ...base, recovery: 'no' }; // weight 1
    const totalWeight = QUESTIONS.reduce((s, q) => s + q.weight, 0);
    expect(computeResult(missHigh).score).toBe(Math.round(((totalWeight - 3) / totalWeight) * 100));
    expect(computeResult(missLow).score).toBe(Math.round(((totalWeight - 1) / totalWeight) * 100));
    expect(computeResult(missHigh).score).toBeLessThan(computeResult(missLow).score);
  });

  it('excludes a skipped leak test from the denominator instead of penalising it', () => {
    const base = allWith(1);
    const skipped = { ...base, pwned: { status: 'skipped' as const } };
    const r = computeResult(skipped);
    expect(r.score).toBe(100);
    expect(r.answered).toBe(TOTAL_QUESTIONS - 1);
    expect(r.done).not.toContain('pwned');
  });

  it('turns a leaked password into a medium-priority action carrying the count', () => {
    const r = computeResult({ ...allWith(1), pwned: { status: 'leaked', count: 12344 } });
    const a = r.actions.find((x) => x.questionId === 'pwned');
    expect(a).toMatchObject({ priority: 'medium', leakCount: 12344, unknown: false });
  });

  it('marks "I don\'t know" answers as unknown actions with zero credit', () => {
    const r = computeResult({ ...allWith(1), wapin: 'unknown' });
    expect(r.actions).toEqual([{ questionId: 'wapin', category: 'scams', priority: 'high', unknown: true, leakCount: undefined }]);
  });

  it('orders actions high → medium → low, then by category, then by question order', () => {
    const r = computeResult({
      ...allWith(1),
      recovery: 'no', // accounts, weight 1 → low
      wapin: 'no', // scams, weight 3 → high
      backup: 'manual', // devices, weight 2, half → low
      email2fa: 'no', // accounts, weight 3 → high
      updates: 'manual', // devices, weight 2, half → low
    });
    expect(r.actions.map((a) => a.questionId)).toEqual(['email2fa', 'wapin', 'recovery', 'updates', 'backup']);
  });

  it('computes per-category percentages independently', () => {
    const r = computeResult({ ...allWith(1), lock: 'none' }); // devices: weight 3 of 8
    expect(r.byCategory.accounts).toBe(100);
    expect(r.byCategory.scams).toBe(100);
    expect(r.byCategory.devices).toBe(Math.round((5 / 8) * 100));
  });

  it('ignores answers for unknown questions or option ids', () => {
    const r = computeResult({ ...allWith(1), ghost: 'yes', lock: 'does-not-exist' });
    expect(r.answered).toBe(TOTAL_QUESTIONS - 1);
    expect(r.score).toBe(100);
  });

  it('the sample scenario from the mockup lands in the "attention" band', () => {
    const r = computeResult({
      email2fa: 'no',
      manager: 'manager',
      reuse: 'some',
      recovery: 'yes',
      pwned: { status: 'leaked', count: 12344 },
      updates: 'yes',
      lock: 'bio',
      encryption: 'nocomputer',
      backup: 'no',
      wapin: 'no',
      quiz_son: 'scam',
      quiz_delivery: 'scam',
      quiz_bank: 'hangup',
      quiz_photo: 'trust',
    });
    expect(r.level).toBe('warn');
    expect(r.actions.filter((a) => a.priority === 'high').map((a) => a.questionId)).toEqual(['email2fa', 'wapin']);
    expect(highPriorityMinutes(r)).toBe(15);
  });
});
