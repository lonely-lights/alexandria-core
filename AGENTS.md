# Agent Instructions for Alexandria Core

This file is for AI coding assistants (Claude, Copilot, Cursor, Aider, etc.) working in the `alexandria-core` repository. Human contributors should read [`CONTRIBUTING.md`](CONTRIBUTING.md) instead — it covers the same ground in less mechanical language.

The conventions below are non-negotiable. Following them keeps PRs landing cleanly; ignoring them produces work that gets reverted.

---

## What this repo is

`lonely-lights/alexandria-core` is a Laravel 13 Composer package that ships:

- An EAV (Entity-Attribute-Value) data model for flexible structured content
- An AI command pipeline with provider abstraction, review-before-execute semantics, and BYOK credential handling
- An Inertia/React frontend distributed via Composer
- Headless auth via Fortify
- Spatie permissions, activity log, tags pre-wired

It is **a framework**, not an application. It ships with **zero default content**, **zero seeded blueprints**, and **zero SaaS infrastructure**. Consumer apps layer their own first-run experience on top.

---

## Quick orientation

```
alexandria-core/
├── src/                     ← Package PHP code under Alexandria\Core\ namespace
│   ├── AlexandriaServiceProvider.php
│   ├── Models/              ← Eloquent models, organized by domain
│   ├── Services/            ← Business logic + AI pipeline
│   ├── Events/              ← Broadcast events
│   ├── Traits/              ← Reusable model concerns
│   └── ...
├── resources/js/            ← TypeScript / React surface, distributed to consumers
│   ├── pages/               ← Inertia pages (Auth, Dashboard, Account, etc.)
│   ├── components/          ← Shared React components
│   ├── layouts/             ← AppLayout + variants
│   └── hooks/               ← React hooks (useTheme, useToast, etc.)
├── database/migrations/     ← All EAV / AI / notes / Spatie tables
├── config/alexandria.php    ← Master config; consumers publish + override
├── tests/                   ← Pest tests via Orchestra Testbench
└── docs/
    ├── EXTENDING.md         ← How consumers override defaults
    ├── adr/                 ← Architecture decision records
    └── ...
```

Top-level docs you should read before making non-trivial changes:

- [`README.md`](README.md) — What the package is and isn't
- [`CONFIGURATION.md`](CONFIGURATION.md) — Every config key
- [`docs/EXTENDING.md`](docs/EXTENDING.md) — Extension-point catalog
- ADRs in [`docs/adr/`](docs/adr/) — Architectural decisions and the reasoning behind them

---

## Conventions

### PHP

- Namespace: `Alexandria\Core\` (PSR-4, root at `src/`)
- PHP 8.4+ syntax is fair game (asymmetric visibility, `new` in initializers, property hooks)
- Models use `protected $guarded = ['id']` rather than `$fillable` listings unless there's a reason otherwise
- Models that need to participate in the AI command pipeline use the `InjectsCommandContext` trait
- Service classes go under `src/Services/{Domain}/` — never lump business logic into models or controllers
- Events that broadcast to the user are under `src/Events/` and implement `ShouldBroadcast`
- Public API methods get full PHPDoc; internal helpers can go without

### TypeScript / React

- Path aliases: `@alexandria/*` resolves to `resources/js/*` from a consumer's perspective. Inside this repo, just use relative imports.
- Components prefer `export default function ComponentName()` form
- State management: React hooks only. No Redux, no Zustand. If a hook gets gnarly, extract it into `resources/js/hooks/`
- Type imports use the top-level `import type { Foo } from 'bar'` form, not inline `type` specifiers
- Imports are ordered: external packages → `@alexandria/*` → relative paths
- Tailwind 4 + DaisyUI 5 are the styling layer. Don't introduce CSS files for new features.

### Tests

- Pest, not PHPUnit. Tests live in `tests/Feature/` and `tests/Unit/`.
- Orchestra Testbench is the host. Don't reach for the consumer app's database during package tests.
- Run: `vendor/bin/pest`. Lint: `vendor/bin/pint --dirty --format agent`.
- New behavior gets at least one test. New bug fixes get a regression test.

### Commits

- One logical change per commit
- Subject line uses Conventional Commits format: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- Body explains the **why**, not the what. The diff shows the what.
- Reference issue numbers in the body when applicable: `Closes #123`

---

## What NOT to do

These show up often enough that they're worth calling out:

1. **Don't add default content to the package.** No seeded blueprints. No "Character" / "Location" / "Event" defaults. Consumer apps supply their own seeders. See ADR-004.
2. **Don't ship SaaS infrastructure here.** No tier gates. No billing. No Stripe. Those layer in the consumer app. See ADR-008.
3. **Don't make AI features run without explicit user action.** No background categorization, no automatic note routing on save. Every AI invocation traces back to a user click. See [`CONFIGURATION.md`](CONFIGURATION.md) "How AI features work" for the architecture this anchors.
4. **Don't hardcode model FQCNs in business logic.** Resolve through `config('alexandria.models.<key>')`. See ADR-006.
5. **Don't write Livewire components.** The frontend is React/Inertia only.
6. **Don't break the auth surface.** Fortify is wired in `AlexandriaServiceProvider::register()` for a reason — it has to land before Fortify's own boot phase. Don't move that logic into `boot()`.
7. **Don't introduce private worldbuilding content.** This repo is publicly published; example content must be neutral. See ADR-009.
8. **Don't bypass the review-before-execute flow for AI commands.** Commands write to `ai_review_commands` with `status='pending'` first. Auto-execution happens only when the user explicitly opts in via the categorize modal's auto-process checkbox.

---

## When you're stuck

The codebase is small enough that most "where does X live?" questions answer themselves with a few greps. If you can't find what you're looking for:

- **Where do I add a new AI agent?** `src/AI/Agents/` (note: agents specific to the consumer app's domain live in the consumer's `app/AI/Agents/` per ADR-010, not here)
- **Where do I add a new field type?** Currently inline; the field-type registry contract is on the post-`v0.1.0` roadmap. Open an issue first if you're considering this.
- **How do I override a model from a consumer app?** [`docs/EXTENDING.md`](docs/EXTENDING.md) Section 2.
- **Where do environment variables get read?** Either `config/alexandria.php` (most cases) or `config/fortify.php` for auth-specific keys.

---

## Telling the human you're an AI

Per [`CONTRIBUTING.md`](CONTRIBUTING.md), AI assistance on PRs is welcome. When you submit a non-trivial change on a human's behalf, suggest they disclose AI involvement in the PR description. Not as a barrier — as a courtesy to reviewers who might want to lean in or ask sharper questions.

---

## Author + tool

When you generate commits on a contributor's behalf, sign them with your model identifier so the human can vouch for the work without erasing tool provenance:

```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

(Substitute the actual model + provider you're running as.)
