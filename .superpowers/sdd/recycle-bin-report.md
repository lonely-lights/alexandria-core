# Recycle Bin + Danger Contrast — SDD Report

**Branch:** `feat/stage-11-slice-4` | **Date:** 2026-07-08

## Gate decisions

- **GET `projects.recycle-bin`:** `can:update,project` (ProjectPolicy::update → `project.settings.edit` Spatie permission). Same tier as project settings and member-management routes — recycle bin is a management action, not a general-member view.
- **POST `entries.restore`:** `can:delete,entry` (EntryPolicy::delete → `soft_delete` ACL or `entry.delete` Spatie). No `restore` ability exists in EntryPolicy; spec says reuse delete — the user who soft-deleted can reverse it. Controller also calls `Gate::authorize('delete', $entry)` explicitly, matching `EntryController::destroy()` style.
- Non-trashed entry → `abort(404)` (not a no-op). Cross-project entry → `abort(404)`.

## Route ordering fix

The recycle-bin GET route must be registered **before** `/{project:slug}/{blueprint:slug}` (blueprints.show). If placed after, the wildcard matches `blueprint:slug = "recycle-bin"`, finds no Blueprint, and 404s. Fix: moved both recycle-bin routes above the Blueprint-level (VL-D) block. Confirmed in `php artisan route:list`.

## Sidebar placement

"Tools" section, after Archive (both surface hidden/removed content), before List Manager. Icon: `fa-solid fa-trash-can`. No count badge (keeping minimal — Archive has the live-count complexity).

## Contrast tokens chosen

| Property | Before | After |
|---|---|---|
| At-rest danger text | `color-mix(--theme-status-error-stroke 80%, transparent)` | `var(--theme-status-error-stroke)` (full opacity) |
| At-rest danger icon | `color-mix(stroke 70%, transparent)` | `color-mix(--theme-status-error-stroke 75%, transparent)` |
| Hover bg (danger) | `color-mix(stroke 12%, transparent)` (ad-hoc) | `var(--theme-status-error-subtle)` (pre-baked fill@10%) |

Text at full stroke opacity is now visually distinct from muted non-danger items. Hover bg uses the dedicated subtle token for consistency. No hardcoded hex.

## Test evidence

- App: `php artisan test --compact --filter="Recycle|EntryDelete|Entry"` → **74 passed / 0 failed**
- Core: `vendor/bin/pest --compact` → **575 passed, 2 skipped** (pre-existing skips)
- Build: `npm run build` → **✓ built in 33.67s** (no TS errors)

## Commits

- Core `917dce6` — `feat(entries): project recycle bin + sidebar access; danger-item contrast`
- App `f41e45f` — `test(entries): recycle bin coverage`

## Concerns / open items

None. Route ordering was the only unexpected blocker (caught by the first test run, fixed immediately). The `final readonly class` cannot extend non-readonly `Controller` — removed the `extends Controller` to match `EntryController` convention.

---

## Visual parity + controls pass — 2026-07-08

**Commits:** Core `24a0229` · App `d39b1de`

**Tests:** 15 recycle-bin tests / 15 passed (6 new bulk-restore cases). Vitest 398/398. Build clean.

**Sibling pattern matched:** `Blueprints/Show.tsx` — font-serif 3xl/4xl h1 + count subtitle inside PageHeader children; `container mx-auto max-w-7xl px-4 py-8` body wrapper; theme-token CSS vars throughout (no zinc Tailwind classes).

**Changes:**
- Header: upgraded `text-xl` title → `font-serif text-3xl md:text-4xl font-bold` with icon box + count subtitle; eliminates the excess vertical dead space.
- Container: `max-w-4xl` → `max-w-7xl` (matches every other project page).
- Toolbar: name search (client-side, clears selection on change) + blueprint filter select (hidden unless 2+ blueprints present) + "Restore Selected (N)" button right-aligned, disabled at 0.
- Checkboxes: per-row + header select-all with indeterminate state; selection resets after successful bulk restore.
- Bulk route: `POST /p/{project}/recycle-bin/restore` (entries.restore-bulk, can:update,project); registered before the per-entry restore so "restore" is not captured as {entry:slug}. Non-trashed + foreign-project ids silently ignored; per-entry Gate::allows('delete') filter inside the method.
- Lang: 12 new `entries.recycle_bin.*` keys; flash messages use inline strings matching existing `__('Entry restored.')` pattern.
- THEMING-TOKEN-USAGE.md regenerated (was drifted before this PR).
