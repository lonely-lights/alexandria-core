# Sorting Workbench (Design)

**Owner direction (2026-07-10, verbatim intent):** the level-2 pilot pauses until this tool is right. A KEEPER surface — not a throwaway console: the review-console decision DESIGN (keyboard-first A/S/G verdicts, versus-style cards, tabs between groups, bulk rules after sampling) **mixed with the app's real aesthetic** (theme tokens, native components). Purpose: "bring in a bunch of notes on an area and test how your prompt is written so that you can work with AI to hone it" — user-friendly for people making THEIR OWN structures, available when running the app self-hosted ("from the root folder like we are here").

## Shape

An in-app Inertia page (core, `pages/AI/Workbench.tsx` + sections), routed app-side under the AI area (e.g. `/projects/{project}/ai/workbench`), gated by a config flag `alexandria.workbench.enabled` (default: enabled when `app()->environment('local')`; self-hosted users flip it on; SaaS keeps it off until productized) + `is_admin`/project-owner.

**Three panes, one loop — run → inspect → hone → review → execute:**

1. **Run pane:** pick blueprint → see pending-note count (52 for location today) → batch size/limit → [Preview prompt] (server renders the Level2ContextBuilder prompt, NO AI call — the dry-run surfaced as JSON) → [Run batch] (real AI call via the existing drain path, queued, progress via the existing AI-dashboard mechanisms).
2. **Hone pane (the differentiator):** the rendered prompt shown with its SOURCES mapped — blueprint description, field schema, relationship edges + their `ai_instruction`s, the entity indexes (with prematch hits highlighted). Each source links to where it's edited (blueprint settings, relationship blueprint settings). Edit → re-preview → diff against the previous render. This is "working with the AI to hone it": the user tunes THEIR structure's instructions and immediately sees the prompt change.
3. **Review pane (console DNA):** TABS per group (batch × blueprint). Command cards grouped BY NOTE: the note text on one side, the proposed commands on the other (entry name + fields + relationships as chips, copy/transfer targets) — versus-box lineage. Keyboard: A approve · G reject · S skip · arrows navigate; bulk approve/reject per group; running counts; malformed (`is_active=false`) commands in a collapsed strap. [Execute approved] uses the existing executor (now dedup-guarded) with per-batch results reported back into the cards.

## Grounding

- All server machinery EXISTS: list/approve/reject/execute endpoints (`AiCommandController`), the executor + dedup guard, Level2ContextBuilder/Agent + `process-blueprint` (extract its prompt-render + note-selection into service methods the new endpoints share). New endpoints needed: preview-prompt (JSON), run-batch (dispatch), pending-notes summary per blueprint.
- The old `CommandsTab` in the AI dashboard is the seed of the review pane — extend or supersede it (decide during build; do not maintain two review surfaces).
- Radar item folds in naturally later: separating sorter-facing instructions from public blueprint descriptions gets an editing home here.
- Andrew's 52 location notes are the acceptance dataset: the phase itself (processing his backlog) begins only when he can run it comfortably through this tool.

## Round-2 (owner-approved 2026-07-10): TWO LEVELS, Level 1 leads

**Level 1 — Routing pane (build first; real results exist):**
- Sort roster: every blueprint + notebook as cards — live toggles (blueprints.allow_ai_sorting / notebooks.allow_ai_sort), catch-all badge, per-target routed-note counts.
- Routing text surfaced per target (the classifier-facing description) — view + edit inline (writes the same field the classifier reads; eventual home for the sorter-text/public-description separation radar item).
- L1 prompt preview: the classifier's rendered prompt (roster + descriptions), no AI call.
- Routing review: routed notes grouped by destination, A/S/G keyboard verdicts + a re-route picker (single-note re-route via the existing placement mechanics).

**MVP cut (approved):** (1) shell + config gate + L1 roster w/ toggles + counts; (2) routing text view/edit + L1 prompt preview; (3) L1 routing review + re-route; (4) L2 Run + Review (preview/run/tabbed review/execute) with Hone read-only (prompt + source map + links).

**Future-planned (explicitly deferred):** golden-note regression sets; in-pane editing of AI outputs; prompt version history/diffs; AI-suggested routing-text improvements; sorter-text schema separation; entity-merge review; Phase-2 relationship-proposal review; cost dashboards/budget caps; Reverb live progress; Import Studio integration; SaaS gating (Stage 13).

## Out of scope (v1)

SaaS exposure/billing gates (Stage 13), prompt A/B history beyond the last-render diff, editing AI outputs inline (approve/reject only), mobile.
