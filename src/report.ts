import { esc } from './dom';
import { htmlLang, t, type Lang } from './i18n';
import { QUESTIONS, categoryName } from './questions';
import { highPriorityMinutes, type Priority, type Result } from './scoring';

/**
 * A self-contained HTML file of the action plan, for the "download" button.
 * Plain markup and a few inline styles so it opens anywhere and prints well.
 */
export function buildPlanDocument(lang: Lang, result: Result): string {
  const tr = (key: Parameters<typeof t>[1], vars?: Record<string, string | number>) => t(lang, key, vars);
  const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
  const level = tr(result.level === 'good' ? 'levelGood' : result.level === 'warn' ? 'levelWarn' : 'levelBad');
  const groups: Priority[] = ['high', 'medium', 'low'];
  const colors: Record<Priority, string> = { high: '#B91C1C', medium: '#B45309', low: '#0E6B63' };
  let n = 0;

  const sections = groups
    .map((p) => {
      const items = result.actions.filter((a) => a.priority === p);
      if (!items.length) return '';
      const list = items
        .map((a) => {
          const q = byId.get(a.questionId)!;
          n++;
          const leak = a.leakCount ? esc(tr('pwLeaked', { count: a.leakCount.toLocaleString(htmlLang(lang)) })) + '. ' : '';
          return `<li style="margin:0 0 16px">
  <strong>${n}. ${esc(q.action.title[lang])}</strong> <small>(${esc(tr('minutes', { n: q.action.minutes }))})</small><br>
  ${leak}${esc(q.action.why[lang])}<br>
  <em>${esc(tr('howTo'))}</em> ${esc(q.action.how[lang])}
</li>`;
        })
        .join('\n');
      return `<h2 style="color:${colors[p]};font-size:18px;margin:28px 0 10px">${esc(tr(p))}</h2>\n<ol style="padding-left:0;list-style:none;margin:0">${list}</ol>`;
    })
    .join('\n');

  const done = result.done.length
    ? `<h2 style="color:#15803D;font-size:18px;margin:28px 0 10px">${esc(tr('doneTitle'))}</h2>\n<ul>${result.done
        .map((id) => `<li>${esc(byId.get(id)!.done[lang])}</li>`)
        .join('')}</ul>`
    : '';

  const cats = (['accounts', 'devices', 'scams'] as const)
    .map((c) => `<li>${esc(categoryName(lang, c))}: <strong>${result.byCategory[c]}</strong></li>`)
    .join('');

  const high = result.actions.filter((a) => a.priority === 'high').length;
  const sub = high > 0 ? tr('subHigh', { min: highPriorityMinutes(result) }) : tr('subNoHigh');

  return `<!doctype html>
<html lang="${htmlLang(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tr('planDocTitle'))}</title>
</head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:17px;line-height:1.5;color:#17231F;max-width:720px;margin:32px auto;padding:0 20px">
<h1 style="font-size:26px;margin:0 0 4px">${esc(tr('planDocTitle'))}</h1>
<p style="margin:0 0 20px;color:#3B4742">${esc(tr('generatedOn', { date: new Date().toLocaleDateString(htmlLang(lang)) }))}</p>
<p style="font-size:22px;margin:0"><strong>${esc(tr('scoreLabel', { score: result.score }))}</strong> · ${esc(tr('levelLabel', { level }))}</p>
<p style="margin:4px 0 12px">${esc(sub)}</p>
<ul style="margin:0 0 8px">${cats}</ul>
${sections}
${done}
<p style="margin-top:32px;color:#3B4742;font-size:14px">Blindagem Digital · https://joaoferrari12.github.io/blindagem-digital/</p>
</body>
</html>
`;
}
