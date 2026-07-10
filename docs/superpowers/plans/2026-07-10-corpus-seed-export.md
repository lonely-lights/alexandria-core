# Corpus-Seed Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `migrate:refresh` + `local:seed` rebuilds Andrew's ENTIRE world — including the 1,918-row note corpus (living + trashed), every placement, notebook membership, and the 3,741 recovered level-2 commands — from git-versioned seed data. Snapshots demote to same-day crash insurance. Afterwards the blueprint-migration machinery (~2,400 LOC) is deleted per the temporary-code policy.

**Architecture:** the works-seed pattern scaled up. One export command writes NDJSON (one record per line — git-diffable at corpus scale) into the PRIVATE seeders submodule; a CorpusSeeder restores it. **Identity strategy:** note IDs are not stable across seeds, so the export assigns each note an ordinal `idx`; placements and commands reference notes by `idx`; blueprints/notebooks/entries/works/sections are referenced by SLUG (entries as `blueprint_slug` + `entry_slug`; sections as `work_slug` + `section_slug`); users by email. Deterministic content-hash writes (works-seed precedent): unchanged corpus = untouched files.

**Tech Stack:** Laravel 13 / PHP 8.4, Pest (sqlite fixtures), operator drill on live Postgres at the gate.

## Global Constraints

- UTF-8 no BOM; never write files via PowerShell; NEVER run migrate:fresh/refresh in ANY form during build (tests use sqlite :memory: automatically). The LIVE drill is operator-run at the gate only.
- Repos: app C:\Websites\alexandria\alexandria-app branch `feat/corpus-seed`; seeders submodule (app database/seeders/Local — its own repo) on `main`. Core untouched.
- Study precedents FIRST: `ExportWorksSeedCommand` + `WritingDeskSeeder` (deterministic hash, submodule data home `Alexandria/Undaunted/data/`, slug resolution, loud warnings on unresolved slugs), `LocalSeedCommand` (seeder ordering), the notables pivot shape (`Note::PIVOT_TABLE`), `ai_review_commands` schema (context JSON: user_id/project_id/blueprint_slug/note_id).
- Andrew's test style; pint; trailers:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n`

---

### Task 1: Export command

**Files:** app `app/Console/Commands/LocalWriting/ExportCorpusSeedCommand.php` (`local:corpus:export-seed {--project=undaunted} {--out=}` — out overridable for tests, default the submodule `data/` dir), config key beside `writing_desk_seed_path` (`corpus_seed_path`… mirror the convention), Pest `tests/Feature/LocalWriting/ExportCorpusSeedTest.php`.

**Output files (submodule `Alexandria/Undaunted/data/`):**
- `corpus-notes.ndjson` — one JSON object per note, ordered by id: `{idx, title, text, note_date, status, type, visibility, is_pinned, color, order_column, ai_notes, user_email, created_at, updated_at, deleted_at}` (INCLUDE trashed notes — deleted_at preserved; ai_notes verbatim).
- `corpus-placements.ndjson` — one per pivot/membership row: `{idx, kind: 'project'|'blueprint'|'entry'|'work_section'|'notebook', ref: {…slug fields per kind}, processing_status?|sort_order?/added_at?}`. Slug refs: blueprint `{slug}`; entry `{blueprint_slug, slug}`; work_section `{work_slug, slug}`; notebook `{slug}`; project `{slug}`.
- `corpus-commands.ndjson` — `{note_idx, action_type, context_extra: {blueprint_slug}, payload, reasoning, is_active, status, failure_reason, executed_at, raw_command, validation_errors, order_index, user_email, created_at, updated_at}` (batch_id NOT exported — regenerate UUIDs per import batch… check whether batch_id groups matter for the review UI; if commands sharing a batch_id must stay grouped, export a `batch_idx` ordinal instead and regenerate grouped UUIDs on seed).
- `corpus-manifest.json` — counts + content_hash (sha256 over the three files' content) + exported_at refreshed only on change (works-seed determinism verbatim).

**Tests:** fixture world (2 notes incl. 1 trashed, placements of every kind, 2 commands incl. one on the trashed note) → export to temp → assert NDJSON shapes, idx stability (ordered by id), trashed round-trip fields, determinism (re-export unchanged = byte-identical files).

Commit: app `feat(corpus): corpus-seed export command`.

---

### Task 2: CorpusSeeder (submodule) + wiring

**Files:** submodule `Alexandria/Undaunted/CorpusSeeder.php`; register in the local seed chain AFTER everything it references (blueprints/entries/notebooks/works — check LocalSeedCommand/DatabaseSeeder ordering; WritingDeskSeeder precedent). App Pest round-trip test.

**Behavior:** no-op with a loud line when the data files are absent; GUARD: if corpus notes (`ai_notes->local_import`) already exist, skip entirely (bootstrap, not sync). Create notes in idx order (timestamps + deleted_at preserved via `timestamps=false` handling; user by email fallback first user); build idx→id map; placements: resolve slugs (warn LOUDLY per unresolved ref, skip row); notebook rows with sort_order/added_at; commands: rebuild context `{user_id, project_id, blueprint_slug, note_id: map[idx]}` + payload etc.; sequence-safe inserts.

**Tests (app):** seed a fixture world (blueprints/notebooks/entries), write fixture NDJSON to the configured temp path, run the seeder → notes (incl. trashed) + placements + commands restored with correct resolution; idempotent re-run skips; unresolved slug warns and skips without aborting.

Commit: submodule `feat: CorpusSeeder restores notes, placements, and review commands`; app `test(corpus): seeder round-trip coverage` (+ any LocalSeedCommand wiring).

---

### Task 3: LIVE export + THE DRILL (operator-gated — the controller runs this WITH Andrew)

1. `local:corpus:export-seed` against live → commit submodule + pointer (first corpus checkpoint).
2. Re-run `local:writing:export-works-seed` (freshness) → commit if changed.
3. **The drill** (Andrew's explicit go required): snapshot `pre-reproducibility-drill` → `migrate:fresh` (guard satisfied by fresh snapshot) → `migrate` → `local:seed` → VERIFY: note count 1,918 (incl. trashed split), living 1,7xx, placements total vs export counts, notebook rows, 3,741 commands with 0 missing note refs, 8 works/72 sections, spot-check a known note's text + a command's context. Any mismatch → restore snapshot, diagnose. Success → the fresh world IS the world.

---

### Task 4: Deletion dividend + closeout

After the drill proves reproducibility: delete `MigrateBlueprintFamilyCommand`, `WritingFamilyMigrationService` + DTO classes + their two test files; remove WritingDeskSeeder's migration-replay fallback (export path only; keep the loud absent-file message); note in the commit body that git history (pre-deletion sha) is the Import Studio's reference. Full app suite green. Roadmap + memory + guard-memory updates (corpus now seeder-reproducible; export-before-fresh becomes belt-and-braces).

## Plan self-review notes

- batch_id decision in Task 1 must be verified against the review-phase UI/consumer before choosing regenerate-vs-preserve.
- The seeder's already-exists guard keys on local_import notes — the same signal the CorpusFreshGuard uses; consistent.
- NDJSON line order must be deterministic (ORDER BY id) or the content hash flaps.
