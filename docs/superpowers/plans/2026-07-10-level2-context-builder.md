# Level-2 Generation Revision — Relationship-Aware Context Builder

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. Owner-approved design (2026-07-10 conversation): the OLD stage-2 generation was premature (its 3,741 commands dumped; baseline `baseline-level2-clean`); the command INFRASTRUCTURE (ai_review_commands, AiCommandExecutor, endpoints, CommandsTab) is solid and stays. The revision is the GENERATION layer.

**Goal:** processing notes routed to a blueprint produces consistent, relationship-aware creation commands — solo note or batch — without blowing up prompt cost.

**The design (owner + assistant, binding):**
1. **The relationship graph scopes context.** `relationship_blueprints` (31 edges, from/to blueprint + relationship_name + ai_priority required|preferred|optional + ai_instruction) decides which FOREIGN blueprints' context a target blueprint's processing pulls. location→location only = the easy case falls out naturally; character pulls its required/preferred edges (character/affinity/…).
2. **Context is an index, not a corpus.** Per relevant blueprint: entity index lines `name | slug | one-line summary` (truncate summaries ~100 chars). The TARGET blueprint's own index is always included and doubles as the dedup guard at prompt time (instruction: these exist — reference by slug/attach, never recreate).
3. **Deterministic prematch prunes.** Before the AI call, scan the batch's note texts (case-insensitive word-boundary) against candidate entity names: required-edge blueprints keep prematch HITS + (if hits < 10) pad with nothing extra; preferred-edge blueprints include ONLY prematch hits; optional edges skipped. Target-blueprint index is NOT pruned (dedup needs it whole) unless > 300 entries (then prematch + note-text hits only).
4. **One machine, any batch size** — same context bundle for batch of 1 or 30 (default --batch=25).

## Tasks (app repo, branch feat/level2-context; ADR-010: agents/orchestrators live app-side)

### Task 1: Level2ContextBuilder + prematch (pure, heavily tested)
`app/Services/AI/Level2/Level2ContextBuilder.php`: `build(Project $project, Blueprint $target, Collection $notes): Level2Context` — DTO carrying: target field schema (blueprint field definitions incl. types/options — find how BlueprintCommandAgent/BatchedCommandAgent rendered fields and reuse), target entity index, related contexts [{blueprint_slug, relationship_name, ai_priority, ai_instruction, index (pruned per rule 3)}], and the notes payload (id/title/text). Prematch helper as a pure class `EntityPrematcher` (word-boundary, case-insensitive, name + aliases if entries carry them). Pest: fixture graph (location self-edge; character→affinity required + character→location preferred), prematch hit/miss/pruning rules, >300 fallback, empty graph = target index only.

### Task 2: Level2CommandAgent + drain command
`app/Services/AI/Level2/Level2CommandAgent.php` (laravel/ai, mirror BatchedCommandAgent's structured-output plumbing — read it + ADR-010 wiring): prompt = the context bundle rendered compactly (indexes as pipe-tables) + STRICT output contract emitting existing action_types ONLY (create_entry with attributes incl. blueprint fields; copy_note/transfer_note; create_relationship with parent/child as slug-or-temp_id + relationship_type from the provided edge names). Dedup instruction per design rule 2. `local:notes:process-blueprint {blueprint} {--project=undaunted} {--batch=25} {--dry-run} {--limit=}` — chunks the blueprint's PENDING routed notes (notables processing_status — check how the old drain selected), builds context per chunk, calls the agent, persists via the existing persist path (reuse EavAiCategorizationOrchestrator::persistBatchedNoteCommands or extract it — do NOT fork a second persist). --dry-run prints the rendered prompt + would-persist counts for ONE batch and stops (cost preview!). Pest with laravel/ai fakes: agent prompted with index content; commands persisted with correct shapes incl. create_relationship; dry-run persists nothing.

### Task 3: Executor dedup guard
`AiCommandExecutor`/`EntryActionService` (core): before create_entry, if a live entry with the same (blueprint, slug-of-name) exists → skip creation, map its temp_id to the EXISTING id (so downstream copy_note/create_relationship still resolve), mark command executed with a note in failure_reason=null + reasoning appended '[dedup: matched existing #id]' (find the cleanest field). Pest: duplicate create resolves to existing + relationship still lands.

### Verification
Full app suite (non-browser) + core pest. LIVE pilot (operator-gated with Andrew): `--dry-run` on location first (cost + prompt inspection together), then a real small batch, review via CommandsTab/console, execute, verify entries + relationships in the tree.

Constraints: UTF-8 no BOM; no PowerShell writes; NEVER migrate:fresh/refresh; never call live AI in tests (fakes only); Andrew's test style; pint; trailers:
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n
