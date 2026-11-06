import type { Lang } from './i18n';
import type { Answers } from './scoring';

const ANSWERS_KEY = 'blindagem.answers.v1';
const LANG_KEY = 'blindagem.lang';

// Every read/write is wrapped: private windows and blocked storage must not break the app.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the session still works in memory */
  }
}

export function loadAnswers(): Answers {
  const raw = read(ANSWERS_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Answers) : {};
  } catch {
    return {};
  }
}

export function saveAnswers(answers: Answers): void {
  write(ANSWERS_KEY, JSON.stringify(answers));
}

export function clearAnswers(): void {
  write(ANSWERS_KEY, null);
}

export function loadLang(): Lang {
  const v = read(LANG_KEY);
  return v === 'en' ? 'en' : 'pt';
}

export function saveLang(lang: Lang): void {
  write(LANG_KEY, lang);
}
