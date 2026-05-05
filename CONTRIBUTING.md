# Contributing to Alexandria Core

Alexandria Core is the open-source half of an AI-aware framework for structured creative work — worldbuilding, narrative archives, RPG campaigns, family histories, research notebooks, anything where a flexible Entity-Attribute-Value graph and a keep-the-author-in-control AI workflow earn their keep. We're building this in the open because the people most likely to extend it well — curious writers and curious coders — overlap more than the software industry usually assumes. If you find this kind of project special, you're who we built it for.

This document covers what kinds of contributions are welcome, how to get a local environment running, and the few conventions we ask you to follow.

---

## Who this is for

You don't need to be a Laravel expert, an AI researcher, or a published author to contribute. The project welcomes:

- **Writers** who notice the worldbuilding tools they wish existed and can describe the gap precisely. Good issues are worth as much as good code.
- **Educators** evaluating Alexandria for classroom use, especially in creative-writing / narrative-design / RPG / digital-humanities settings. Your feedback on what AI affordances feel honest vs. crutch-shaped directly shapes the architecture.
- **Coders** comfortable with Laravel + React + TypeScript who want to work on a non-trivial open-source codebase that's actually useful to someone outside their own dev loop.
- **Translators** willing to add a locale once the Prosetta translation surface is wired in.
- **AI-tool power users** who want to shape how we surface model choice, prompt visibility, and review-before-execute flows. We try hard to keep the user as the author and the source of choices; help us hold that line.

If you're none of the above but the project still resonates — open an issue describing what you'd want to do, and let's see if there's a fit.

---

## Ground rules

A few principles shape how we make decisions. Worth reading before opening a big PR.

1. **The user is the author.** AI tools that take agency away from the user are out of scope. AI features land as opt-in, review-before-execute, transparent-prompt, BYOK-by-default. If a contribution would compromise that, expect pushback.
2. **The package ships with zero defaults.** Alexandria Core is a framework; consumer apps supply their own first-run experience. PRs adding seeded blueprints, default content, or "out of the box" flows that lock consumers into one shape of project will be redirected.
3. **Public API stability matters once we hit `v1.0`.** Until then, we're happy to ship breaking changes — pin to an exact version while you experiment.
4. **Architectural decisions get recorded.** When something non-obvious is decided, we add an ADR (`docs/adr/ADR-XXX-...md`) so the reasoning survives the conversation. PRs that change architecture should include or update an ADR.
5. **Tests run on changes.** Pest (PHP) and ESLint/Prettier (JS) are required to be green. We're not strict about coverage percentages but we are strict about not regressing the suite.

---

## Getting set up

[`INSTALL.md`](INSTALL.md) walks through standing up Alexandria Core in a fresh Laravel 13 app. For contributing to *the package itself* (not building on top), the key extra step is setting up the package's own test suite via Orchestra Testbench:

```bash
git clone https://github.com/lonely-lights/alexandria-core
cd alexandria-core
composer install
vendor/bin/pest
```

Frontend tooling lives in the consumer app, not the package. To exercise frontend changes, point a consumer app at your local clone via Composer's path repo (see `INSTALL.md` Section 2) and develop against that.

---

## What to work on

Open issues tagged [`good first issue`](https://github.com/lonely-lights/alexandria-core/issues?q=label%3A%22good+first+issue%22) are scoped to land in a single PR without needing to read the whole codebase. They're the best way to feel out the shape of the project.

Larger pieces are tracked in [`docs/superpowers/`](docs/superpowers/) — the master spec for the package extraction is at `docs/superpowers/specs/2026-04-29-package-extraction-pivot.md` (in the legacy repo). Read that if you want to understand the trajectory.

If you have a pet feature you want to build, open an issue *first* before writing code. We'd rather steer scope early than reject a PR after you've put work in.

---

## Pull request workflow

1. Fork the repo, branch from `main`.
2. Make focused commits — one logical change per commit. We squash-merge most PRs but readable history during review matters.
3. Run `vendor/bin/pint --dirty --format agent` and `vendor/bin/pest` locally before pushing.
4. Open the PR with a description that answers: **what problem this solves** and **what tradeoffs you considered**. The "why" beats the "what" — the diff already shows the what.
5. Be patient on review. The maintainer set is small; we'd rather respond thoughtfully than fast.

---

## AI assistance is welcome

We use AI coding assistants (Claude, Copilot, Cursor, etc.) on this project ourselves. If you do too, we ask that you:

- Read the diff yourself before submitting it. AI is a force multiplier for typing, not for thinking.
- Make sure the change actually compiles and tests pass — we've seen plausible-looking AI-generated PRs that didn't run.
- Disclose AI use in the PR if a non-trivial portion was AI-generated. Not as a barrier — as a courtesy to reviewers who might want to lean in or ask sharper questions.

The repo includes an [`AGENTS.md`](AGENTS.md) at the root with project-specific guidance for AI coding tools. It tells your assistant where to look first, what conventions to follow, and what to avoid. Point your tool at it.

---

## Community

- **Issues** on the GitHub repo are the right place for bug reports, feature requests, and design questions.
- **Discussions** (when enabled) are for "I'm thinking about doing X" conversations that aren't quite issues yet.
- **PRs** are welcome from forks; you don't need to ask permission first for small fixes.

We're at the early end of the project's lifespan. The conventions on this page will evolve as the contributor base grows; if you bump into something that isn't covered, file an issue and we'll write it down.

Welcome aboard.
