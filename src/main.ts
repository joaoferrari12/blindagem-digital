import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles.css';

import { html, icon, mount, raw, type Raw } from './dom';
import { htmlLang, t, type Lang, type StringKey } from './i18n';
import { checkPassword } from './pwned';
import { QUESTIONS, TOTAL_QUESTIONS, categoryName, type Question } from './questions';
import { buildPlanDocument } from './report';
import { computeResult, highPriorityMinutes, type Answers, type Priority, type Result } from './scoring';
import { clearAnswers, loadAnswers, loadLang, saveAnswers, saveLang } from './storage';

const REPO_URL = 'https://github.com/joaoferrari12/blindagem-digital';

// ------------------------------------------------------------------ state
const state = {
  lang: loadLang() as Lang,
  answers: loadAnswers() as Answers,
};

const root = document.getElementById('app') as HTMLElement;

function tr(key: StringKey, vars?: Record<string, string | number>): string {
  return t(state.lang, key, vars);
}

function setLang(lang: Lang): void {
  state.lang = lang;
  saveLang(lang);
  document.documentElement.lang = htmlLang(lang);
  const skip = document.querySelector<HTMLAnchorElement>('.skip-link');
  if (skip) skip.textContent = tr('skip');
  route();
}

function setAnswer(id: string, value: Answers[string]): void {
  state.answers = { ...state.answers, [id]: value };
  saveAnswers(state.answers);
}

/** Index of the first unanswered question, or the total when all are answered. */
function firstUnanswered(): number {
  const i = QUESTIONS.findIndex((q) => state.answers[q.id] === undefined);
  return i === -1 ? TOTAL_QUESTIONS : i;
}

// ----------------------------------------------------------------- router
type Route = { name: 'home' } | { name: 'question'; index: number } | { name: 'result' } | { name: 'notfound' };

function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  if (path === '' || path === '/') return { name: 'home' };
  const q = /^(?:perguntas|questions)\/(\d+)$/.exec(path);
  if (q) {
    const n = Number(q[1]);
    if (n >= 1 && n <= TOTAL_QUESTIONS) return { name: 'question', index: n - 1 };
    return { name: 'notfound' };
  }
  if (path === 'resultado' || path === 'result') return { name: 'result' };
  return { name: 'notfound' };
}

function go(hash: string): void {
  if (location.hash === hash) route();
  else location.hash = hash;
}

function questionHash(index: number): string {
  return `#/${state.lang === 'pt' ? 'perguntas' : 'questions'}/${index + 1}`;
}

function resultHash(): string {
  return state.lang === 'pt' ? '#/resultado' : '#/result';
}

function route(): void {
  const r = parseRoute(location.hash);
  let view: Raw;
  switch (r.name) {
    case 'home':
      view = homeView();
      break;
    case 'question':
      view = questionView(r.index);
      break;
    case 'result':
      view = resultView();
      break;
    default:
      view = notFoundView();
  }
  mount(root, html`${header()}<main id="main" class="main" tabindex="-1">${view}</main>${footer()}`);
  bind(r);
  // Move focus to the page heading so screen readers announce the new screen.
  const heading = root.querySelector<HTMLElement>('[data-focus]');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: false });
  }
  window.scrollTo({ top: 0 });
}

// ------------------------------------------------------------------ shell
function header(): Raw {
  return html`
    <header class="site-header">
      <a class="brand" href="#/">${icon('shield', 30)}<span>${tr('brand')}</span></a>
      <nav class="site-nav" aria-label="${tr('navHow')}">
        <a class="nav-link" href="#/#como-funciona" data-anchor="como-funciona">${tr('navHow')}</a>
        <a class="nav-link" href="#/#privacidade" data-anchor="privacidade">${tr('navPrivacy')}</a>
        <div class="lang-switch" role="group" aria-label="${tr('langLabel')}">
          <button type="button" data-lang="pt" aria-pressed="${state.lang === 'pt'}" lang="pt-BR">PT</button>
          <button type="button" data-lang="en" aria-pressed="${state.lang === 'en'}" lang="en">EN</button>
        </div>
      </nav>
    </header>`;
}

function footer(): Raw {
  return html`
    <footer class="site-footer">
      <span>${tr('footerCredit')}</span>
      <a href="${REPO_URL}" rel="noopener">${tr('footerCode')}</a>
    </footer>`;
}

// ------------------------------------------------------------------- home
function homeView(): Raw {
  const resumeAt = firstUnanswered();
  const started = Object.keys(state.answers).length > 0;
  return html`
    <section class="hero">
      <div class="hero-copy">
        <p class="kicker">${tr('kicker')}</p>
        <h1 data-focus>${tr('heroTitle')}</h1>
        <p class="lead">${tr('heroText')}</p>
        <div class="cta-row">
          <a class="btn btn-primary btn-lg" href="${questionHash(0)}" data-start>${tr('start')} ${icon('arrowRight', 22)}</a>
          ${started && resumeAt < TOTAL_QUESTIONS
            ? html`<a class="btn btn-secondary" href="${questionHash(resumeAt)}">${tr('resume')}</a>`
            : started
              ? html`<a class="btn btn-secondary" href="${resultHash()}">${tr('seeResult')}</a>`
              : ''}
        </div>
        <p class="muted">${tr('noSignup')}</p>
      </div>
      <aside class="card example" aria-label="${tr('exampleTitle')}">
        <p class="eyebrow">${tr('exampleTitle')}</p>
        <div class="example-score">
          <div class="ring ring-warn" aria-hidden="true"><span>62</span></div>
          <div>
            <strong class="example-level">${tr('exampleLevel')}</strong>
            <span class="muted">${tr('exampleSub')}</span>
          </div>
        </div>
        <ul class="dots">
          <li><span class="dot dot-high"></span>${tr('example1')}</li>
          <li><span class="dot dot-high"></span>${tr('example2')}</li>
          <li><span class="dot dot-medium"></span>${tr('example3')}</li>
        </ul>
      </aside>
    </section>

    <section id="como-funciona" class="section">
      <h2>${tr('whatTitle')}</h2>
      <div class="grid-3">
        <article class="card">${icon('lock', 36)}<h3>${tr('catAccounts')}</h3><p>${tr('catAccountsText')}</p></article>
        <article class="card">${icon('phone', 36)}<h3>${tr('catDevices')}</h3><p>${tr('catDevicesText')}</p></article>
        <article class="card">${icon('alert', 36)}<h3>${tr('catScams')}</h3><p>${tr('catScamsText')}</p></article>
      </div>
    </section>

    <section id="privacidade" class="notice">
      ${icon('eyeOff', 32)}
      <div>
        <h2>${tr('privacyTitle')}</h2>
        <p>${tr('privacyText')}</p>
      </div>
    </section>`;
}

// -------------------------------------------------------------- questions
function progress(index: number, q: Question): Raw {
  const n = index + 1;
  return html`
    <div class="progress">
      <div class="progress-meta">
        <span>${tr('questionOf', { n, total: TOTAL_QUESTIONS })}</span>
        <span class="chip">${categoryName(state.lang, q.category)}</span>
      </div>
      <div class="progress-bar" role="progressbar" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="${TOTAL_QUESTIONS}" aria-label="${tr('progressLabel')}">
        <div class="progress-fill" style="width: ${Math.round((n / TOTAL_QUESTIONS) * 100)}%"></div>
      </div>
    </div>`;
}

function questionView(index: number): Raw {
  const q = QUESTIONS[index];
  const isLast = index === TOTAL_QUESTIONS - 1;
  const body = q.kind === 'choice' ? choiceBody(q) : pwnedBody(q);
  return html`
    ${progress(index, q)}
    <form class="card question" novalidate data-question="${q.id}" data-index="${index}">
      ${body}
      <div class="form-nav">
        <a class="btn btn-secondary" href="${index === 0 ? '#/' : questionHash(index - 1)}">${icon('arrowLeft', 20)} ${tr('back')}</a>
        <button type="submit" class="btn btn-primary">${isLast ? tr('seeResult') : tr('next')} ${icon('arrowRight', 20)}</button>
      </div>
    </form>
    <p class="muted stay-local">${icon('lock', 18)} ${tr('stayLocal')}</p>`;
}

function choiceBody(q: Extract<Question, { kind: 'choice' }>): Raw {
  const current = state.answers[q.id];
  return html`
    <fieldset>
      <legend>
        <h1 class="question-title" data-focus>${q.title[state.lang]}</h1>
        ${q.help ? html`<span class="question-help">${q.help[state.lang]}</span>` : ''}
      </legend>
      <div class="options">
        ${q.options.map(
          (o) => html`
            <label class="option ${current === o.id ? 'is-selected' : ''}">
              <input type="radio" name="q" value="${o.id}" ${current === o.id ? raw('checked') : ''} />
              <span>${o.label[state.lang]}</span>
            </label>`,
        )}
      </div>
      <p class="field-error" role="alert" data-error hidden>${tr('pickOne')}</p>
    </fieldset>`;
}

function pwnedBody(q: Extract<Question, { kind: 'pwned' }>): Raw {
  const current = state.answers[q.id];
  const status = typeof current === 'object' ? current : undefined;
  return html`
    <div class="pw-head">
      <h1 class="question-title" data-focus>${q.title[state.lang]}</h1>
      <label for="pw" class="question-help">${tr('pwLabel')}. ${tr('pwHelp')}</label>
    </div>
    <div class="pw-row">
      <input id="pw" name="pw" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" />
      <button type="button" class="btn btn-icon" data-toggle-pw aria-label="${tr('pwShow')}" aria-pressed="false">${icon('eye')}</button>
    </div>
    <button type="button" class="btn btn-primary btn-block" data-check-pw>${tr('pwCheck')}</button>
    <div class="pw-result" role="status" aria-live="polite" data-pw-result>${pwnedResultMarkup(status)}</div>
    <details class="why">
      <summary>${tr('pwWhyTitle')}</summary>
      <ol>
        <li>${tr('pwWhy1')}</li>
        <li>${tr('pwWhy2')}</li>
        <li>${tr('pwWhy3')}</li>
      </ol>
      <a href="https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange" rel="noopener">${tr('pwWhyLink')}</a>
    </details>
    <button type="button" class="link-btn" data-skip-pw>${tr('pwSkip')}</button>`;
}

function pwnedResultMarkup(status: Answers[string] | { status: 'error' } | undefined): Raw {
  if (!status || typeof status === 'string') return raw('');
  if (status.status === 'leaked') {
    return html`<div class="callout callout-bad">${icon('alert', 26)}<div><strong>${tr('pwLeaked', { count: status.count.toLocaleString(htmlLang(state.lang)) })}</strong><span>${tr('pwLeakedText')}</span></div></div>`;
  }
  if (status.status === 'safe') {
    return html`<div class="callout callout-good">${icon('check', 26)}<div><strong>${tr('pwSafe')}</strong><span>${tr('pwSafeText')}</span></div></div>`;
  }
  if (status.status === 'error') {
    return html`<div class="callout callout-warn">${icon('alert', 26)}<div><strong>${tr('pwError')}</strong><span>${tr('pwErrorText')}</span></div></div>`;
  }
  return raw('');
}

// ----------------------------------------------------------------- result
function resultView(): Raw {
  const result = computeResult(state.answers);
  if (result.answered === 0) {
    return html`<section class="card empty"><h1 data-focus>${tr('noAnswers')}</h1><a class="btn btn-primary" href="${questionHash(0)}">${tr('start')}</a></section>`;
  }
  const levelKey = `level${result.level === 'good' ? 'Good' : result.level === 'warn' ? 'Warn' : 'Bad'}` as StringKey;
  const highCount = result.actions.filter((a) => a.priority === 'high').length;
  const headline =
    result.level === 'good'
      ? tr('headlineGood')
      : result.level === 'bad'
        ? tr('headlineBad')
        : highCount === 1
          ? tr('headlineWarnOne')
          : tr('headlineWarn', { n: highCount || result.actions.length });
  const sub = highCount > 0 ? tr('subHigh', { min: highPriorityMinutes(result) }) : tr('subNoHigh');
  const hasUnknown = result.actions.some((a) => a.unknown);
  const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
  const circumference = 2 * Math.PI * 64;
  const dash = (result.score / 100) * circumference;
  const groups: Priority[] = ['high', 'medium', 'low'];
  let n = 0;

  return html`
    <section class="result-head">
      <div class="card score-card">
        <div class="score-ring">
          <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="${tr('scoreLabel', { score: result.score })}">
            <circle cx="75" cy="75" r="64" fill="none" stroke="var(--line-strong)" stroke-width="14"></circle>
            <circle cx="75" cy="75" r="64" fill="none" stroke="var(--level-${result.level})" stroke-width="14" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 75 75)"></circle>
          </svg>
          <div class="score-number" aria-hidden="true"><span>${result.score}</span><small>${tr('outOf')}</small></div>
        </div>
        <div class="score-copy">
          <p class="eyebrow level-${result.level}">${tr('levelLabel', { level: tr(levelKey) })}</p>
          <h1 data-focus>${headline}</h1>
          <p class="muted">${sub}</p>
        </div>
      </div>
      <div class="card category-card">
        ${(['accounts', 'devices', 'scams'] as const).map((c) => {
          const v = result.byCategory[c];
          const lvl = v >= 80 ? 'good' : v >= 50 ? 'warn' : 'bad';
          return html`
            <div class="cat-row">
              <div class="cat-meta"><span>${categoryName(state.lang, c)}</span><span>${v}</span></div>
              <div class="progress-bar" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100" aria-label="${tr('categoryScore', { cat: categoryName(state.lang, c), score: v })}">
                <div class="progress-fill level-bg-${lvl}" style="width: ${v}%"></div>
              </div>
            </div>`;
        })}
      </div>
    </section>

    <div class="plan-head">
      <h2>${tr('planTitle')}</h2>
      <div class="actions no-print">
        <button type="button" class="btn btn-secondary" data-print>${icon('print', 18)} ${tr('print')}</button>
        <button type="button" class="btn btn-secondary" data-download>${icon('download', 18)} ${tr('download')}</button>
        <button type="button" class="link-btn" data-redo>${tr('redo')}</button>
      </div>
    </div>
    ${hasUnknown ? html`<p class="muted">${tr('unknownNote')}</p>` : ''}

    ${groups.map((p) => {
      const items = result.actions.filter((a) => a.priority === p);
      if (items.length === 0) return '';
      return html`
        <section class="plan-group">
          <h3><span class="dot dot-${p}"></span>${tr(p)}</h3>
          ${items.map((a) => {
            const q = byId.get(a.questionId)!;
            n++;
            return html`
              <article class="card action action-${p}">
                <span class="action-n" aria-hidden="true">${n}</span>
                <div class="action-body">
                  <div class="action-title-row">
                    <h4>${q.action.title[state.lang]}</h4>
                    <span class="muted">${tr('minutes', { n: q.action.minutes })}</span>
                  </div>
                  <p class="muted">${a.leakCount ? tr('pwLeaked', { count: a.leakCount.toLocaleString(htmlLang(state.lang)) }) + '. ' : ''}${q.action.why[state.lang]}</p>
                  <p><strong>${tr('howTo')}</strong> ${q.action.how[state.lang]}</p>
                </div>
              </article>`;
          })}
        </section>`;
    })}

    ${result.done.length
      ? html`
        <section class="plan-group">
          <h3><span class="dot dot-good"></span>${tr('doneTitle')}</h3>
          <ul class="card done-list">
            ${result.done.map((id) => html`<li>${icon('check', 20)}${byId.get(id)!.done[state.lang]}</li>`)}
          </ul>
        </section>`
      : ''}
    <p class="muted generated">${tr('generatedOn', { date: new Date().toLocaleDateString(htmlLang(state.lang)) })}</p>`;
}

function notFoundView(): Raw {
  return html`<section class="card empty"><h1 data-focus>${tr('notFound')}</h1><a class="btn btn-primary" href="#/">${tr('goHome')}</a></section>`;
}

// ------------------------------------------------------------------ events
function bind(r: Route): void {
  root.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) =>
    b.addEventListener('click', () => setLang(b.dataset.lang as Lang)),
  );
  // Anchor links on the home page: go home, then scroll to the section.
  root.querySelectorAll<HTMLAnchorElement>('[data-anchor]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.dataset.anchor!;
      if (parseRoute(location.hash).name !== 'home') go('#/');
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }),
  );

  if (r.name === 'question') bindQuestion(r.index);
  if (r.name === 'result') bindResult();
}

function bindQuestion(index: number): void {
  const form = root.querySelector<HTMLFormElement>('form[data-question]')!;
  const q = QUESTIONS[index];
  const next = () => go(index + 1 < TOTAL_QUESTIONS ? questionHash(index + 1) : resultHash());

  if (q.kind === 'choice') {
    const error = form.querySelector<HTMLElement>('[data-error]')!;
    form.querySelectorAll<HTMLInputElement>('input[name=q]').forEach((input) =>
      input.addEventListener('change', () => {
        form.querySelectorAll('.option').forEach((l) => l.classList.toggle('is-selected', l.contains(input)));
        error.hidden = true;
        setAnswer(q.id, input.value);
      }),
    );
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const picked = form.querySelector<HTMLInputElement>('input[name=q]:checked');
      if (!picked) {
        error.hidden = false;
        form.querySelector<HTMLInputElement>('input[name=q]')?.focus();
        return;
      }
      setAnswer(q.id, picked.value);
      next();
    });
    return;
  }

  // Leaked-password step.
  const pw = form.querySelector<HTMLInputElement>('#pw')!;
  const toggle = form.querySelector<HTMLButtonElement>('[data-toggle-pw]')!;
  const check = form.querySelector<HTMLButtonElement>('[data-check-pw]')!;
  const out = form.querySelector<HTMLElement>('[data-pw-result]')!;
  const skip = form.querySelector<HTMLButtonElement>('[data-skip-pw]')!;

  toggle.addEventListener('click', () => {
    const show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', tr(show ? 'pwHide' : 'pwShow'));
    toggle.innerHTML = icon(show ? 'eyeOff' : 'eye').value;
  });

  const run = async () => {
    const value = pw.value;
    if (!value) {
      out.innerHTML = html`<p class="field-error" role="alert">${tr('pwEmpty')}</p>`.value;
      pw.focus();
      return;
    }
    check.disabled = true;
    check.textContent = tr('pwChecking');
    try {
      const outcome = await checkPassword(value);
      setAnswer(q.id, outcome);
      out.innerHTML = pwnedResultMarkup(outcome).value;
    } catch {
      out.innerHTML = pwnedResultMarkup({ status: 'error' }).value;
    } finally {
      check.disabled = false;
      check.textContent = tr('pwCheck');
      pw.value = ''; // never keep the password around longer than the check
    }
  };
  check.addEventListener('click', () => void run());
  pw.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void run();
    }
  });
  skip.addEventListener('click', () => {
    setAnswer(q.id, { status: 'skipped' });
    next();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.answers[q.id] === undefined) setAnswer(q.id, { status: 'skipped' });
    next();
  });
}

function bindResult(): void {
  root.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  root.querySelector('[data-download]')?.addEventListener('click', () => {
    const result: Result = computeResult(state.answers);
    const doc = buildPlanDocument(state.lang, result);
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = tr('downloadedName');
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  root.querySelector('[data-redo]')?.addEventListener('click', () => {
    clearAnswers();
    state.answers = {};
    go('#/');
  });
}

// ------------------------------------------------------------------- boot
document.documentElement.lang = htmlLang(state.lang);
window.addEventListener('hashchange', route);
route();
