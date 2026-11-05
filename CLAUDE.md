# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Little English 850 is a static, backend-free React 19 + TypeScript + Vite SPA. It teaches the Ogden Basic English 850 words to Chinese-speaking children. All progress lives in browser `localStorage` (key `little-english-850`). It deploys to GitHub Pages at `/LittleEnglish850/`, using hash routing and `base: './'`. Node 24 is recommended (`.node-version`); the minimum is 22.12.

## Commands

```sh
npm ci
npm run dev                 # runs content:prepare, then Vite on http://127.0.0.1:5173
npm run typecheck
npm run lint
npm test                    # Vitest (pretest runs content:prepare)
npm run build               # content:prepare + typecheck + vite build -> dist/
npm run test:e2e            # Playwright: chromium, firefox, webkit, mobile (iPhone 13 / webkit)
npm run content:check       # validates words.json, course.json, audio files/hashes, provenance
npm run content:check -- --text-only   # skips audio checks; fast feedback while editing content
npm run content:prepare     # re-generate browser data during a running dev session
npm run course:design       # regenerate content/course.json + docs/COURSE_CLASS_LIST.md
```

Run a single test:

```sh
npx vitest run tests/domain.test.ts -t "sentence test"     # generated JSON must exist (run content:prepare once)
npx playwright test tests/e2e/app.spec.ts --project=chromium -g "some title"
```

Install E2E browsers first with `npx playwright install chromium firefox webkit`. To run E2E against the production build under the Pages subpath (PowerShell):

```powershell
npm run build; $env:PLAYWRIGHT_PRODUCTION = '1'; npm run test:e2e; Remove-Item Env:PLAYWRIGHT_PRODUCTION
```

Dev E2E uses port 5174 and production E2E uses 5175. CI (`.github/workflows/verify.yml`) runs lint, test, content:check, build and production E2E. It deploys Pages from `main` only.

Expected checks before committing:
- App changes: typecheck, lint, test and build.
- UI, interaction, routing, audio or storage changes: also `test:e2e`.
- Content changes: also `content:check`.

## Content pipeline (generated vs. authored)

```
content/*.tsv + support.json --(python -X utf8 scripts/build-content.py)--> content/words.json
content/words.json + unit lists inside scripts/generate-course-design.mjs --(npm run course:design)--> content/course.json, docs/COURSE_CLASS_LIST.md
content/words.json + content/course.json --(scripts/prepare-content.mjs)--> src/data/words.generated.json, words.source.generated.json, course.generated.json
```

- Do not hand-edit `content/words.json`, `content/course.json` or `src/data/*.generated.json`. Edit their sources and regenerate.
- `words*.generated.json` are git-ignored. `src/data/course.generated.json` **is committed**, so commit it whenever the course changes.
- The browser payloads are compact positional arrays: words are referenced by numeric index and helpers are deduplicated. The decoders `initializeCatalog` (`src/data/catalog.ts`) and `initializeCourse` (`src/data/course.ts`) validate strictly. They hard-code the expected shape: 850 words, 34 units × 10 groups of 2–3 words, 170 Standard and 136 Accelerated classes. Changing the curriculum shape requires updating these decoders and `scripts/check-content.mjs` together.
- Word IDs are derived as `ogden-${word.toLowerCase()}`.
- Audio is static MP3 in `public/assets/audio/`. Chinese voices live in the `xiaoxiao/` and `yunxia/` subfolders. Regenerating audio needs Python 3.12 and a local Kokoro model (see `docs/CONTENT.md`). Use `python -X utf8` for all scripts.
- `content:check -- --release` requires real human editorial, listening and child-trial approvals. Never edit approval metadata in `content/attributions.json` or `audio-manifest.json` just to make it pass.

## Runtime architecture

- **Boot (`src/main.tsx`)**: fetches the two generated JSON assets in parallel with the lazily imported `App` chunk, retrying once. It decodes them, then renders. The store (`src/app/store.ts`) is created inside `App` on purpose, so `localStorage` is read only after catalogue IDs exist. In production the built `index.html` already starts both catalogue fetches (`window.littleEnglishStartupFetches`) and `main.tsx` takes them over. Do not replace this with `<link rel=preload>`: WebKit downloads twice, and `tests/e2e/deployment.spec.ts` asserts exactly two catalogue requests.
- **Offline/service worker (production only)**: `scripts/vite-offline.ts` emits `dist/sw.js` from `src/sw/service-worker.js` with a precache list and versions; `src/services/offline.ts` registers it, applies waiting updates at startup and sends audio prefetch lists from `upcomingAudio()` (`src/domain/prefetch.ts`). Playwright blocks service workers except in `tests/e2e/offline.spec.ts`. See `docs/DEVELOPMENT.md` → Loading on slow and distant networks.
- **Routing (`src/app/router.ts`, `App.tsx`)**: hash routes `#/`, `#/learn`, `#/practice/:wordId`, `#/book[/:wordId]`, `#/parent`, `#/about[/en]`. The Wordbook stays mounted while hidden so it keeps search and scroll state.
- **State**: one `AppState` (`src/data/types.ts`) holds per-word progress, at most one formal `session` and settings. All transitions go through the pure reducer `reduce()` / `stepSession()` in `src/domain/session.ts`. Derived values (status, due words, next class, home main action, review scheduling at 1/3/7/30 days) live in `src/domain/progress.ts`. Lesson/class status and TSV rows are derived; they are never stored.
- **Persistence (`src/services/storage.ts`)**: `createStore` saves after each dispatch. It detects cross-tab conflicts by comparing the raw stored string, and blocks writes when data is `unreadable` or in `conflict`, rather than overwriting it.
  - `parseState` validates exhaustively. `validSession` re-checks every reducer invariant: question order, flags, choices, completed counts, group/word ordering, exit-test results.
  - **Any change to the `Session` shape or flow must update `validSession`.** Otherwise saved sessions are rejected as damaged.
  - Schema 1 saves are migrated by `migrateLegacy`; schema 2 is current.
- **`CONTENT_VERSION` (`src/data/catalog.ts`)**: `parseState` rejects saves whose `contentVersion` differs. Changing it, stable word IDs or ordering makes every existing user's progress unreadable unless you add a compatible migration.
- **Course/classes (`src/data/course.ts`)**: there is one curriculum with two pacing plans, `standard` (target 5, 4–6 words) and `accelerated` (target 7). `nextCourseClass` assembles the next class dynamically from whole consecutive incomplete content groups in the current unit. It returns the authored class when one matches; otherwise it creates an `*-adaptive-*` class (e.g. after a plan switch or skipped words). Due reviews must be finished before a new class can start. A plan change applies only to the next class.
- **Lesson flow**: each word goes card → read → listen → spell → sentence. Review mode uses spell → listen → read → sentence, with at most 10 words per round. A lesson then enters the `exit-test` phase, a sentence cloze over non-skipped words. Word progress becomes `completed` only when every item is answered correctly.
  - Exit-test items are built at runtime from each word's `sentence` (regex locating the word). `validSession` re-derives and compares them, so editing a sentence invalidates any saved in-progress exit test.
  - `skip` ("I know this word") is allowed only on a lesson word card.
  - Free practice (`#/practice/...`) is local component state and never changes formal progress or review dates.
- `catalog.ts` still exposes the legacy `lessonId` / `lessonWords` (fixed 5-word lessons). Current class logic uses `course.ts` instead.

## Conventions

- **UI language**: learning screens (`Learn`, practice, exit test, result) use short English for navigation, steps, prompts and feedback. Chinese appears there only for meanings, contexts and translations. Home, Wordbook, Parent and the Chinese About page are in Chinese. Set `lang` attributes accordingly.
- Accessibility is tested with axe (`tests/e2e/accessibility.spec.ts`). Keep keyboard, focus and screen-reader semantics intact. Mobile emulation does not replace checks with a real phone keyboard.
- Unit tests (`tests/domain.test.ts`) load the generated JSON through `tests/setup.ts`. They cover reducer, storage validation/migration, TSV export and audio routing.

## Docs

- `PROJECT.md`: product rules and acceptance (Chinese).
- `docs/DEVELOPMENT.md`, `docs/CONTENT.md`, `docs/ux/UX_DESIGN.md`.
- `docs/COURSE_FEATURE_PLAN.md`, `docs/COURSE_DATA_STRUCTURE.md`: the two-plan course design.

The README, `PROJECT.md` and `CONTENT.md` still describe the older "170 lessons × 5 words" model. `COURSE_DATA_STRUCTURE.md` was a design input, and its session shape differs from the implementation. When docs and code disagree, `src/data/types.ts` and the code are authoritative.

Keep `package.json` version and `CHANGELOG.md` aligned; release candidates are tagged `v0.1.0-rc.N`.
