# Blindagem Digital

[![CI](https://github.com/joaoferrari12/blindagem-digital/actions/workflows/ci.yml/badge.svg)](https://github.com/joaoferrari12/blindagem-digital/actions/workflows/ci.yml)

A 10-minute **digital security check-up for everyday people**: 14 plain-language
questions about accounts, devices and scams, a score from 0 to 100, and an
action plan ordered by priority that can be printed or downloaded. Portuguese
by default, English with one click. No backend, no sign-up, nothing leaves the
browser.

> **Live:** **https://joaoferrari12.github.io/blindagem-digital/**

Built for Brazilians aged 40 to 60 (the audience of my *Blindagem Digital*
service, a two-hour session that locks down a person's phone, e-mail and
WhatsApp), and written so that a recruiter can read every design decision in
the code.

## What it does

- **Accounts**: two-step verification on e-mail, password manager, reused
  passwords, recovery options, and a **leaked-password test** against Have I
  Been Pwned's Pwned Passwords API.
- **Devices**: automatic updates, screen lock strength, disk encryption,
  automatic backup.
- **Scams**: WhatsApp two-step PIN plus a four-message quiz drawn from the
  scams that actually hit this audience in Brazil ("child with a new number",
  fake delivery fee, "bank" asking for the SMS code, cloned-contact link).
- **Result**: a score with three bands (protected ≥ 80, attention ≥ 50, at
  risk), a per-category breakdown, and an action plan where every item has a
  *why*, a *how to* with the exact menu path for Android and iPhone, and a
  time estimate. High-priority actions are summed so the page can say "together
  they take about 25 minutes".
- **Keep it**: print (print stylesheet) or download a self-contained HTML plan.
  Answers persist in `localStorage` so the person can close the tab and come
  back; "start over" wipes them.

The question set and the action texts come from what the market already
agreed on rather than from scratch: Google's Security Checkup, the Government
of Canada's [Get Cyber Safe checklist](https://www.getcybersafe.gc.ca/en/resources/cyber-security-checklist),
and the Brazilian courts' *Cartilha de Segurança Virtual* (TJDFT / Polícia
Civil) for the scam catalogue and the WhatsApp PIN guidance.

## The leaked-password check, and why the password never leaves the browser

Checking a password against a breach list is useful exactly as long as the
password is not sent anywhere. This project uses the k-anonymity range search
that Have I Been Pwned designed for this
([docs](https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange)):

```
password  →  SHA-1 in the browser (Web Crypto)  →  5BAA61E4C9B9…8FD8
                                                    ─────
                                            only these 5 characters are sent

GET https://api.pwnedpasswords.com/range/5BAA6    (header: Add-Padding: true)
  ←  ~800–1000 lines of "SUFFIX:COUNT" sharing that prefix

the browser looks for its own 35-character suffix in that list
```

What the API receives is a 5-character prefix shared by hundreds of unrelated
passwords; it cannot know which one was typed. `Add-Padding` makes every
response the same size class so the number of matches cannot be inferred from
the response length either. The input field is cleared as soon as the check
finishes, the password is never stored, and the result that is kept is only
`{ status: 'leaked', count }` or `{ status: 'safe' }`.

`src/pwned.ts` is a pure module (`sha1Hex`, `splitHash`, `findSuffix`,
`checkPassword`) with `fetch` injected, so the tests assert on the exact URL
that would be sent: it contains the 5-character prefix and nothing else.

## Scoring

Each question has a weight (1, 2 or 3) that doubles as the action's priority;
an answer earns 0, ½ or all of the weight. The score is earned ÷ possible,
over the questions actually answered, so skipping the leak test neither helps
nor hurts. A half-credit answer ("pattern lock", "I back up now and then")
drops the action one priority step instead of leaving it at the top. "I don't
know" earns 0 and is flagged so the plan words the item as *check this*
rather than *fix this*. All of it lives in `src/scoring.ts`, pure and tested.

## Stack

- **Vite + TypeScript, no framework.** A hash router and a tagged `html`
  template that escapes by default (`src/dom.ts`); the whole UI (`src/main.ts`) is about 500 lines.
- **CSS custom properties, mobile-first**, a single accent colour, Atkinson
  Hyperlegible (a typeface designed for low vision) self-hosted via
  `@fontsource`, so the page makes no third-party request except the one
  5-character call to HIBP when the user asks for it.
- **i18n** as a typed string table (`src/i18n.ts`) plus bilingual question
  content; the language switch re-renders in place and updates `<html lang>`.
- **Tests**: Vitest for scoring, k-anonymity and the report; Playwright +
  axe-core for an end-to-end walk of the whole flow at phone and desktop widths
  in both languages (`scripts/a11y.mjs`), which also fails on horizontal
  overflow or any page error.
- **CI** on GitHub Actions runs all of that on every push; a second workflow
  builds and deploys to GitHub Pages.

## What this project demonstrates (measured)

- **axe-core: 0 violations** on 38 screens (home, 14 questions, the leak-test
  result, and the result page, at 375 px and 1280 px, in Portuguese and
  English), with the `wcag2a`, `wcag2aa`, `wcag21aa` and `best-practice` rule
  sets.
- **0 screens with horizontal overflow** at 375 px; **0 page errors** across the
  walk.
- **Keyboard**: the walk answers every question with Tab + Space only; focus
  moves to the heading on each screen; a skip link, one `<h1>` per screen,
  `fieldset`/`legend` radio groups, a live region for the leak result,
  `aria-pressed` on the language switch, labelled progress bars.
- **Contrast**: every text/background pair is at least 4.5:1 (the four status
  colours are 4.9:1 to 6.3:1 on white; values are documented next to each
  variable in `styles.css`).
- **29 unit tests**: scoring bands and priorities, weighting, skipped and
  unknown answers, action ordering, the SHA-1 test vector, suffix parsing with
  padding rows, and the k-anonymity contract (prefix-only URL, `Add-Padding`
  header, no body).
- **Size**: 55.7 kB gzipped on first load (HTML + CSS + JS + two Latin woff2
  fonts); 116 kB gzipped for the whole `dist/` including the Latin-Extended
  and legacy woff fonts that only some browsers fetch.
- **Privacy by construction**: no analytics, no cookies, no form posts; the
  only network call is opt-in and provably prefix-only (see the tests).

## Running it

```
npm install
npm run dev        # http://localhost:5173/blindagem-digital/
npm test           # unit tests
npm run build      # type-check + production build into dist/
npm run a11y       # end-to-end walk with axe-core (needs: npx playwright install chromium)
npm run size       # gzipped sizes of the build
```

## Roadmap

- A `v2` with a short "what to do when it already happened" page (WhatsApp
  cloned, Pix sent to a scammer), and a shareable result card.
- Spanish.

## License

MIT · Joao Victor Ferrari
