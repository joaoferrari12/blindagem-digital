import { CATEGORY_ORDER, QUESTIONS, type Category, type Question } from './questions';

/** What the user answered. Choice questions store the option id; the leak test stores its outcome. */
export type PwnedAnswer = { status: 'safe' } | { status: 'leaked'; count: number } | { status: 'skipped' };
export type Answers = Record<string, string | PwnedAnswer | undefined>;

export type Priority = 'high' | 'medium' | 'low';
export type Level = 'good' | 'warn' | 'bad';

export interface PlannedAction {
  questionId: string;
  category: Category;
  priority: Priority;
  /** The user answered "I don't know": the action is a check, not a fix. */
  unknown: boolean;
  /** Extra detail for the leaked-password action. */
  leakCount?: number;
}

export interface Result {
  /** 0–100, rounded. */
  score: number;
  level: Level;
  byCategory: Record<Category, number>;
  actions: PlannedAction[];
  /** Question ids answered with full credit. */
  done: string[];
  /** Questions answered at all (skipped leak test excluded). */
  answered: number;
}

export const LEVEL_GOOD = 80;
export const LEVEL_WARN = 50;

export function levelFor(score: number): Level {
  if (score >= LEVEL_GOOD) return 'good';
  if (score >= LEVEL_WARN) return 'warn';
  return 'bad';
}

interface Graded {
  earned: number;
  max: number;
  credit: number;
  unknown: boolean;
  leakCount?: number;
}

/** Returns null when the question was not answered or was skipped (then it does not count). */
function grade(q: Question, answers: Answers): Graded | null {
  const a = answers[q.id];
  if (a === undefined) return null;
  if (q.kind === 'pwned') {
    if (typeof a === 'string') return null;
    if (a.status === 'skipped') return null;
    const credit = a.status === 'safe' ? 1 : 0;
    return {
      earned: credit * q.weight,
      max: q.weight,
      credit,
      unknown: false,
      leakCount: a.status === 'leaked' ? a.count : undefined,
    };
  }
  if (typeof a !== 'string') return null;
  const opt = q.options.find((o) => o.id === a);
  if (!opt) return null;
  return { earned: opt.credit * q.weight, max: q.weight, credit: opt.credit, unknown: Boolean(opt.unknown) };
}

function pct(earned: number, max: number): number {
  return max === 0 ? 0 : Math.round((earned / max) * 100);
}

/** Priority comes from the question weight; a half-credit answer drops one step. */
export function priorityFor(weight: 1 | 2 | 3, credit: number): Priority {
  const base: Priority = weight === 3 ? 'high' : weight === 2 ? 'medium' : 'low';
  if (credit === 0) return base;
  if (base === 'high') return 'medium';
  return 'low';
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function computeResult(answers: Answers): Result {
  let earned = 0;
  let max = 0;
  const cat: Record<Category, { earned: number; max: number }> = {
    accounts: { earned: 0, max: 0 },
    devices: { earned: 0, max: 0 },
    scams: { earned: 0, max: 0 },
  };
  const actions: PlannedAction[] = [];
  const done: string[] = [];
  let answered = 0;

  for (const q of QUESTIONS) {
    const g = grade(q, answers);
    if (!g) continue;
    answered++;
    earned += g.earned;
    max += g.max;
    cat[q.category].earned += g.earned;
    cat[q.category].max += g.max;
    if (g.credit === 1) {
      done.push(q.id);
    } else {
      actions.push({
        questionId: q.id,
        category: q.category,
        priority: priorityFor(q.weight, g.credit),
        unknown: g.unknown,
        leakCount: g.leakCount,
      });
    }
  }

  // Stable order: priority first, then category order, then question order.
  const order = new Map(QUESTIONS.map((q, i) => [q.id, i]));
  actions.sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      (order.get(a.questionId) ?? 0) - (order.get(b.questionId) ?? 0),
  );

  const score = pct(earned, max);
  return {
    score,
    level: levelFor(score),
    byCategory: {
      accounts: pct(cat.accounts.earned, cat.accounts.max),
      devices: pct(cat.devices.earned, cat.devices.max),
      scams: pct(cat.scams.earned, cat.scams.max),
    },
    actions,
    done,
    answered,
  };
}

/** Minutes of the high-priority actions, for the "together they take N minutes" line. */
export function highPriorityMinutes(result: Result): number {
  const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
  return result.actions
    .filter((a) => a.priority === 'high')
    .reduce((sum, a) => sum + (byId.get(a.questionId)?.action.minutes ?? 0), 0);
}
