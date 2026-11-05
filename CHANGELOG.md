# Changelog

## Unreleased

- Replace the fixed five-word lessons with one 850-word course of 34 units and 340 two- or three-word content groups, taught at two paces: Standard (about 5 new words per class, 170 classes) and Accelerated (about 7, 136 classes). Parents choose a plan on first use and can switch in Parent Settings without losing progress; a switch applies from the next class.
- End every class with a required fixed-sentence typing test. Word progress is settled only after every sentence is answered correctly; first-attempt accuracy is shown on the result, and the full sentence audio becomes available only after a correct answer.
- Group the wordbook course view and filters by unit, and show each word's unit and group. Progress export adds unit, content group and learning plan columns.
- Migrate existing progress to the Standard plan, keeping all settled words, review stages and dates; an unfinished legacy lesson is closed.
- Fix the course view's unit button leading to an empty page when reviews were due; it now offers the due review first.
- Load faster on slow and distant networks such as mainland China: the page shows its loading text and starts both catalogues and the app chunk at once, and a failed catalogue load is retried once before the error screen.
- Add a production service worker: after one visit the app opens and the next class plays offline; audio is cached on the device, and audio for the open session, due reviews and the next class is downloaded in advance once a plan is chosen. New deployments take over at the next startup.
- Note on the About pages that the Wikipedia and Wiktionary links may not open in every region.

Not yet included from the course plan: group-first mixed practice, scene previews and shared group stories. Human editorial review, listening review and child usability trials are still required before release.

## 0.1.0-rc.2 — 2026-10-22

- Refresh surfaces and controls with clearer borders, interaction states and responsive details while removing decorative shadows.
- Use English consistently for learning steps, prompts, results, controls and learning-route errors; retain Chinese for meanings, contexts and translations.
- Add browser regression coverage for the English step labels, question guidance and result summary.
- Expand the README with current features, setup, validation, content-editing, production-preview and project-structure guidance.

Human editorial review, listening review and child usability trials are still required before the final release.

## 0.1.0-rc.1 — 2026-10-12

- Preserve the complete application and teaching assets in Git; prepare the `release/v0.1.0` branch and candidate tag.
- Fix completed review spelling becoming unreadable after a wordbook visit. Recover saves affected by that specific bug while retaining progress and hint flags.
- Generate one compact, content-hashed catalogue, fetched once across supported browsers. Reduce catalogue size from 1,130,227 to 760,737 bytes.
- Avoid rendering the hidden wordbook; preserve search and scroll state. Use direct five-word lesson lookups.
- Add regression tests, production subdirectory browser checks and a GitHub Actions validation workflow with a downloadable build artifact.
- Use the public npm registry in the lockfile, preserving all dependency versions.
- Consolidate obsolete plans and review reports into current development and content documentation; retain editable UX diagrams.
- Include word lessons, due reviews, wordbook, browser-local progress, one TSV export and bilingual About pages with the slogan above the title.

Public deployment remains pending. Human editorial review, listening review and child usability trials are still required.
