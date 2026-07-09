# Stage 11.5 Task 2 — Anchored Comments Backend: Implementation Report

## Migration / Model Home Decision

Migration lands in `alexandria-core/database/migrations/` (sequence `000935`, after `000930_create_work_entry_pins_table`), loaded by `AlexandriaServiceProvider` via `loadMigrationsFrom`. The model lives beside its parent in `src/Models/Writing/WorkSectionComment.php`.

This is the same boundary that `WorkSection` and `Work` use — the schema is framework-level and must exist in any consumer that mounts the writing surface. App-level concerns (controller logic, permission checks) stay in `alexandria-app`.

## Endpoint Shapes

All comment endpoints are under the `/works` prefix group in `alexandria-app/routes/web.php`, registered **before** the `/{project:slug}/{work:slug}/{section?}` catch-all.

| Method | Path | Route name | Auth |
|--------|------|------------|------|
| GET | `/works/{project}/{work}/sections/{section}/comments` | `works.sections.comments.index` | `can:view,work` |
| POST | `/works/{project}/{work}/sections/comments` | `works.sections.comments.store` | `can:update,work` |
| PATCH | `/works/{project}/{work}/sections/comments/{comment}` | `works.sections.comments.update` | `can:view,work` + owner inline |
| DELETE | `/works/{project}/{work}/sections/comments/{comment}` | `works.sections.comments.destroy` | `can:view,work` + owner inline |
| POST | `/works/{project}/{work}/sections/comments/{comment}/resolve` | `works.sections.comments.resolve` | `can:view,work` + (owner OR work.edit) |
| POST | `/works/{project}/{work}/sections/comments/{comment}/unresolve` | `works.sections.comments.unresolve` | `can:view,work` + (owner OR work.edit) |

### JSON response shape

`index` returns `{"comments": [...]}` ordered `created_at` asc.
Each comment: `{id, body, author: {id, name}, resolved_at, resolved_by, created_at, updated_at}`.
`store` returns 201. `destroy` returns `{"deleted": true}` 200.

`section_id` for `store` comes from the request body (not the URL). The controller validates `exists:work_sections,id` then does a same-work guard (`abort_unless $section->work_id === $work->id, 404`).

## Permission Matrix Results (9 authorization tests, all green)

| Actor | Action | Result |
|-------|--------|--------|
| Viewer (work.view) | list | 200 |
| Viewer (work.view) | store | 403 |
| Collaborator (work.edit) | store | 201 |
| Author (Collaborator) | update own | 200 |
| Interloper (Collaborator) | update other's | 403 |
| Author (Collaborator) | delete own | 200 |
| Interloper (Collaborator) | delete other's | 403 |
| Viewer — own comment | resolve | 200 (author bypass) |
| Collaborator (work.edit) | resolve other's | 200 |
| Viewer (work.view) | resolve other's | 403 |

## Test Coverage Summary

- `WorkSectionCommentTest` (11 tests, Gate bypass): list shape, resolved comments included, store + author attribution, empty-body validation, update, soft-delete, resolve/unresolve cycle, cross-work 404s, undo-rule proof (content update does not cascade-delete comments).
- `WorkSectionCommentAuthorizationTest` (9 tests, no bypass): full permission matrix.
- Total new tests: 20 / 20 passing. Full WorkSection regression (49 tests) green.

## Self-Review Notes

- `config('alexandria.models.user')` pattern (same as AiTransaction) keeps model/factory decoupled from app-level User.
- `WorkSection::comments()` orders by `created_at` at the relation level; controllers add no redundant sort.
- `resolve`/`unresolve` use `Gate::allows('update', $work)` which invokes `WorkPolicy::update` -> Spatie `work.edit`.
- `parent_id` uses `nullOnDelete` on the self-FK — deleted parent comments orphan children rather than cascading, safest for schema stability while the feature is v1.

## Commits

- Core (`alexandria-core` branch `feat/stage-11-5-planning-layer`): `575c412` — `feat(writing): work-section comment model + migration`
- App (`alexandria-app` branch `feat/stage-11-5-planning-layer`): `1dd9b12` — `feat(writing): comments endpoints + policy + coverage`
