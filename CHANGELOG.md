# Changelog

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
