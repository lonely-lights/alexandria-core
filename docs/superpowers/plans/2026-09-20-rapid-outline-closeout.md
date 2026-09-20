# Rapid outline and authored pacing — execution record

2026-09-20. Implemented on coordinated `feat/rapid-outline-pacing` branches in core and app. The original plans remain below their task ledgers as the approved implementation recipe; this record describes actual execution rather than claiming every proposed command or test grouping was followed verbatim.

## Delivered

- Keyboard hierarchy follows configured/actual section tiers; outdent moves complete subtrees and saved scenes can become beats only when lossless.
- Stable draft keys, meaningful-row filtering, serialized/coalesced saves, and explicit conflict recovery protect typing and structural changes. Copyable local text survives failures.
- Authored section durations, work targets, container budgets, cumulative positions, unknown bounds, and percentage markers anchored to section Start/End. Zero remains distinct from blank.
- Outline and Navigator use one pure timing model. Work Settings opens after saving and refreshing section choices. Guidance uses authored time when enabled, while retaining independent diagnostics.
- Invalid duration text blocks navigation/collapse/structural shortcuts until corrected or explicitly discarded with Escape.
- Durations survive revisions, duplication, moves, and cross-work transfers. Legacy revisions omit rather than clear duration. Missing anchors remain unavailable until cleared or reassigned.
- Comment highlighting no longer changes card padding. Regression covers repeated highlighting.
- Work-first transaction locks cover outline, tree, content, and revision mutations. Delayed content saves re-fetch a live same-work section under lock and reject deleted/transferred/structural targets.

## Verification

- Focused frontend: 139 tests / 18 files passed; existing Kanban model: 9 passed. Includes hierarchy, parsing, payloads, meaningful drafts, focus, queue, merge/recovery, timing parser/model/editor/settings, Navigator, guidance/rules, and comment highlight.
- Host backend: 107 tests / 525 assertions passed across work/section/outline endpoints, conversions, concurrency, transfer, revisions, real permissions, and estimate parsing. Expanded transfer suite subsequently passed 6 tests / 48 assertions.
- Package Testbench: 22 tests / 58 assertions passed for schema/casts, section tree, content persistence, and stale-section rejection.
- Actual PostgreSQL two-connection isolated-schema lock test: 1 test / 2 assertions passed; not skipped and no live application tables used.
- TypeScript check and production build passed. Build retains existing large-chunk warnings.
- Browser: all six acceptance cases passed across the final runs (five in the combined run, then the timing/settings test passed with 13 assertions). Covers two-page conflict recovery, keyboard conversion/promotion/reorder, original outline persistence, prose/screenplay plan modal reading/editing, authored totals/unknowns/zero persistence, invalid-input navigation protection, and Work Settings Start/End round-trip. Desktop and 390px timing screenshots inspected: readable labels and wrapped marker details, no page-wide overflow.
- Pint and whitespace checks passed. Targeted package ESLint is clean outside the existing Workspace component: 26 errors and one warning remain there (refs/effects/compiler memoization/dependencies). The pre-change Workspace baseline had 162 errors and the same warning, including those rule families; no rule was disabled.

## Execution adjustments

- The strict duration parser is `pacing/durationValue.ts`, avoiding a Windows case-insensitive filename collision with `DurationInput.tsx`.
- Timing work was verified together and committed together rather than at each proposed file-level milestone. Plan 1 had incremental commits.
- A private, local-only workspace script performed the one-time additive schema change and reviewed estimate migration instead of registering a temporary Artisan command. Snapshot existence, exact synopsis comparison, null-duration eligibility, ordered work/section locks, and one transaction protected the batch. Every applied row was read back and compared exactly; a second scan returned zero candidates. Temporary tooling was removed; the generic parser and its unit tests remain in the app under `app/Support/Writing`.
- The existing create migrations were updated for fresh installs. Live schema was changed additively after a verified snapshot; no database reset. Snapshot and private reports stay outside tracked repositories.
- Dedicated command tests were replaced by parser tests plus reviewed dry-run, transactional apply, idempotent rescan, and exact post-apply verification of the private one-off. No private story data was added to core.

The graphical pacing view, automatic estimates, ranges, and intra-scene offsets remain deliberately deferred. Nothing was pushed or deployed.
