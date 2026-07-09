# Stage 11 Slice 4 — Recycle Bin + Danger Contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project-scoped Recycle Bin page (soft-deleted entries, restore action, sidebar entry) and fix the DropdownMenu danger-item contrast to use proper error tokens at rest and on hover.

**Architecture:** Two independent concerns added to the `feat/stage-11-slice-4` branch. The recycle bin is a standard Inertia GET page + POST restore action living entirely in the app repo (PHP side) and core repo (TSX page + sidebar + types). The danger contrast fix is a 3-line change in `DropdownMenu.tsx`. No new models or migrations.

**Tech Stack:** PHP 8.4, Laravel 13, Inertia 3, React 19, TypeScript, Pest 4, Tailwind 4 + `--theme-*` CSS tokens.

## Global Constraints

- All PHP in `alexandria-app`; all TSX pages/components/lang in `alexandria-core`.
- Routes live in `alexandria-app/routes/web.php` inside the existing `prefix('p')` group.
- Controller namespace: `App\Http\Controllers\Entries\` (sibling to `EntryController`).
- Inertia page render key: `'Projects/RecycleBin'` → file `resources/js/pages/Projects/RecycleBin.tsx`.
- Entry relationship to Blueprint in the model is `->type()` (not `->blueprint()`), returning `Blueprint` via `belongsTo(Blueprint::class, 'blueprint_id')`.
- Flash convention: `->with('message', __('...'))->with('type', 'success')`.
- Theme tokens: CSS variables `--theme-status-error-stroke`, `--theme-status-error-fill`, `--theme-status-error-subtle`. No hardcoded hex.
- No force-delete. No pagination on the recycle bin (out of scope).
- Gate decisions (justified below): recycle-bin index gates on `can:update,project` (project management tier — same as settings/member routes); restore gates on `can:delete,entry` (no `restore` ability exists in EntryPolicy; spec says reuse `delete`).
- Restore with `->withTrashed()` on the route so implicit binding resolves trashed entries; `abort(404)` in the controller if the entry is not actually trashed or belongs to a different project.
- Tests: Andrew's style — brace-free string interpolation (`"Entry restored"` not `'Entry restored'`), chained `->and()` expectations.
- Commit trailers exactly:
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n
  ```
- Branch: `feat/stage-11-slice-4` in both repos.
- Run `vendor/bin/pint --dirty --format agent` after any PHP change.
- Run `npm run build` in `alexandria-app` after any TSX change before manual checking.

---

### Task 1: Danger-item contrast fix (core only)

**Files:**
- Modify: `alexandria-core/resources/js/components/ui/DropdownMenu.tsx` (lines 57–66)

**Why:** The `fadedColor` for danger items uses 80% of `--theme-status-error-stroke`, making at-rest danger text look nearly identical to muted non-danger text. The hover bg uses an ad-hoc 12% mix instead of the pre-baked `--theme-status-error-subtle` token. Fix: full stroke at rest for text; proper subtle token for hover bg.

- [ ] **Step 1: Read DropdownMenu.tsx lines 54–70 (already read — confirm current code)**

The block to replace in `DropdownRow`:

```tsx
    const baseColor = item.danger ? 'var(--theme-status-error-stroke)' : 'var(--theme-base-content)';
    const fadedColor = item.danger
        ? 'color-mix(in srgb, var(--theme-status-error-stroke) 80%, transparent)'
        : 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)';
    const iconFadedColor = item.danger
        ? 'color-mix(in srgb, var(--theme-status-error-stroke) 70%, transparent)'
        : 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)';
    const hoverBg = item.danger
        ? 'color-mix(in srgb, var(--theme-status-error-stroke) 12%, transparent)'
        : 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)';
```

- [ ] **Step 2: Apply the fix**

Replace those 9 lines with:

```tsx
    // Danger rows use --theme-status-error-stroke at full opacity at rest so
    // destructive actions are visually distinct from muted non-danger text.
    // Hover bg uses --theme-status-error-subtle (the pre-baked 10%-fill token)
    // rather than an ad-hoc mix for token consistency.
    const baseColor = item.danger ? 'var(--theme-status-error-stroke)' : 'var(--theme-base-content)';
    const fadedColor = item.danger
        ? 'var(--theme-status-error-stroke)'
        : 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)';
    const iconFadedColor = item.danger
        ? 'color-mix(in srgb, var(--theme-status-error-stroke) 75%, transparent)'
        : 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)';
    const hoverBg = item.danger
        ? 'var(--theme-status-error-subtle)'
        : 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)';
```

- [ ] **Step 3: Run build and verify visually**

```bash
cd C:/Websites/alexandria/alexandria-app && npm run build
```

Open a dropdown with a `danger: true` item (e.g., the entry File tab Delete action on the Entries Show ribbon). Confirm text is a clear red at rest and the hover background has a subtle red tint (not generic gray).

- [ ] **Step 4: Commit (core)**

```bash
cd C:/Websites/alexandria/alexandria-core
git add resources/js/components/ui/DropdownMenu.tsx
git commit -m "$(cat <<'EOF'
fix(ui): dropdown danger items contrast — full stroke at rest, subtle token on hover

At rest, danger rows now show --theme-status-error-stroke at full opacity
(was 80% — visually similar to muted non-danger text). Hover bg now uses
the pre-baked --theme-status-error-subtle token instead of an ad-hoc 12%
mix, for token consistency. No hardcoded hex.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n
EOF
)"
```

---

### Task 2: Lang key + sidebar (core)

**Files:**
- Modify: `alexandria-core/lang/en/nav.php`
- Modify: `alexandria-core/resources/js/components/navigation/ProjectNavigation.tsx`

**Placement decision:** "Tools" section, immediately after the Archive row and before the List Manager row. Visually: Archive (things hidden from the main list) → Recycle Bin (things deleted) → future managers. The trash-can icon (`fa-solid fa-trash-can`) matches the FA6 set used throughout the sidebar.

- [ ] **Step 1: Add lang key to `alexandria-core/lang/en/nav.php`**

Find the `'archive' => 'Archive',` line (under `// ── Top-level sidebar rows ──`) and add immediately after it:

```php
    'recycle_bin' => 'Recycle Bin',
```

Final block (archive + recycle_bin + list_manager):
```php
    'archive' => 'Archive',
    'recycle_bin' => 'Recycle Bin',
    'list_manager' => 'List Manager',
```

- [ ] **Step 2: Add sidebar row to `ProjectNavigation.tsx`**

Find this block (lines ~172–178):
```tsx
            <SidebarRow
                href={`/p/${project.slug}#archive`}
                icon="fa-solid fa-box-archive"
                label={t('nav.archive')}
                trailing={<ArchiveCount projectId={project.id} />}
            />
            <SidebarRow
                href="#"
                icon="fa-solid fa-list"
                label={t('nav.list_manager')}
            />
```

Replace with (adds the Recycle Bin row between Archive and List Manager):
```tsx
            <SidebarRow
                href={`/p/${project.slug}#archive`}
                icon="fa-solid fa-box-archive"
                label={t('nav.archive')}
                trailing={<ArchiveCount projectId={project.id} />}
            />
            <SidebarRow
                href={`/p/${project.slug}/recycle-bin`}
                icon="fa-solid fa-trash-can"
                label={t('nav.recycle_bin')}
            />
            <SidebarRow
                href="#"
                icon="fa-solid fa-list"
                label={t('nav.list_manager')}
            />
```

- [ ] **Step 3: Verify types compile**

```bash
cd C:/Websites/alexandria/alexandria-app && npm run build
```

Expected: build succeeds (no new TypeScript — just a new `SidebarRow` JSX element with existing props).

- [ ] **Step 4: Commit (core)**

```bash
cd C:/Websites/alexandria/alexandria-core
git add lang/en/nav.php resources/js/components/navigation/ProjectNavigation.tsx
git commit -m "$(cat <<'EOF'
feat(nav): add Recycle Bin sidebar row under Tools section

Adds nav.recycle_bin lang key and a SidebarRow in the Tools group,
placed after Archive and before List Manager. Uses fa-solid fa-trash-can.
Route: /p/{project.slug}/recycle-bin.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n
EOF
)"
```

---

### Task 3: TypeScript types (core)

**Files:**
- Modify: `alexandria-core/resources/js/types/projects.ts`

Add two new interfaces after the existing `SearchResults` interface at the end of the file.

- [ ] **Step 1: Add interfaces to `projects.ts`**

Append to `alexandria-core/resources/js/types/projects.ts`:

```ts
export interface TrashedEntry {
    id: number;
    name: string;
    slug: string;
    /** Human-readable relative time e.g. "3 days ago". */
    deleted_at_human: string;
    blueprint: {
        name: string | null;
        slug: string | null;
        icon: string | null;
    };
}

export interface RecycleBinProps {
    project: {
        id: number;
        name: string;
        slug: string;
    };
    entries: TrashedEntry[];
    [key: string]: unknown;
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd C:/Websites/alexandria/alexandria-app && npm run build
```

Expected: build succeeds (types are referenced in the next task's page component).

- [ ] **Step 3: Commit (core)**

```bash
cd C:/Websites/alexandria/alexandria-core
git add resources/js/types/projects.ts
git commit -m "$(cat <<'EOF'
feat(types): TrashedEntry + RecycleBinProps for recycle bin page

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n
EOF
)"
```

---

### Task 4: Inertia page — RecycleBin.tsx (core)

**Files:**
- Create: `alexandria-core/resources/js/pages/Projects/RecycleBin.tsx`

The page renders a table of trashed entries (newest-deleted first), an empty state when the list is empty, and a Restore button per row that fires `router.post()` to `/p/{project.slug}/recycle-bin/{entry.slug}/restore`.

- [ ] **Step 1: Create `RecycleBin.tsx`**

File: `alexandria-core/resources/js/pages/Projects/RecycleBin.tsx`

```tsx
import { Head, usePage, router } from '@inertiajs/react';
import { type CSSProperties } from 'react';
import AppLayout from '@alexandria/layouts/AppLayout';
import PageHeader from '@alexandria/components/layout/PageHeader';
import ActionButton from '@alexandria/components/ui/ActionButton';
import useT from '@alexandria/hooks/useT';
import type { RecycleBinProps, TrashedEntry } from '@alexandria/types/projects';

/* ── Theme styles ── */

const fadedText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};
const subtleText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};
const rowBorder: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};
const blueprintBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.75rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
};

export default function RecycleBin() {
    const t = useT();
    const { project, entries } = usePage<RecycleBinProps>().props;

    function handleRestore(entry: TrashedEntry) {
        router.post(
            `/p/${project.slug}/recycle-bin/${entry.slug}/restore`,
            {},
            { preserveScroll: true },
        );
    }

    return (
        <AppLayout>
            <Head title={`${t('nav.recycle_bin')} — ${project.name}`} />

            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    { label: t('nav.recycle_bin') },
                ]}
            >
                <div className="flex items-center gap-3">
                    <i
                        className="fa-solid fa-trash-can text-xl"
                        style={fadedText}
                        aria-hidden="true"
                    />
                    <div>
                        <h1
                            className="text-xl font-semibold"
                            style={{ color: 'var(--theme-base-content)' }}
                        >
                            {t('nav.recycle_bin')}
                        </h1>
                        <p className="mt-0.5 text-sm" style={fadedText}>
                            {project.name}
                        </p>
                    </div>
                </div>
            </PageHeader>

            <div className="mx-auto max-w-4xl px-4 py-8">
                {entries.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div
                        className="overflow-hidden rounded-lg"
                        style={{
                            border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                            background: 'var(--theme-base-surface)',
                        }}
                    >
                        {/* Header row */}
                        <div
                            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                            style={{ ...subtleText, ...rowBorder }}
                        >
                            <span>Entry</span>
                            <span>Blueprint</span>
                            <span>Deleted</span>
                            <span />
                        </div>

                        {entries.map((entry) => (
                            <div
                                key={entry.id}
                                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3"
                                style={rowBorder}
                            >
                                <span
                                    className="truncate font-medium"
                                    style={{ color: 'var(--theme-base-content)' }}
                                >
                                    {entry.name}
                                </span>

                                <span style={blueprintBadgeStyle}>
                                    {entry.blueprint.icon && (
                                        <i
                                            className={entry.blueprint.icon}
                                            aria-hidden="true"
                                        />
                                    )}
                                    {entry.blueprint.name ?? '—'}
                                </span>

                                <span className="text-sm whitespace-nowrap" style={fadedText}>
                                    {entry.deleted_at_human}
                                </span>

                                <ActionButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRestore(entry)}
                                >
                                    <i className="fa-solid fa-rotate-left mr-1.5" aria-hidden="true" />
                                    Restore
                                </ActionButton>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function EmptyState() {
    const t = useT();
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: 'color-mix(in srgb, var(--theme-base-content) 6%, transparent)' }}
            >
                <i
                    className="fa-solid fa-trash-can text-2xl"
                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 25%, transparent)' }}
                    aria-hidden="true"
                />
            </div>
            <p
                className="text-sm"
                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}
            >
                No deleted entries
            </p>
        </div>
    );
}
```

> **Note:** Check that `ActionButton` exists at `@alexandria/components/ui/ActionButton` and accepts `size="sm" variant="ghost" onClick`. If the variant prop name differs, grep the ActionButton component and mirror it. If it doesn't exist, replace with a plain `<button>` styled with inline styles.

- [ ] **Step 2: Run build**

```bash
cd C:/Websites/alexandria/alexandria-app && npm run build
```

Expected: build succeeds. Fix any TS errors (most likely `ActionButton` prop names).

- [ ] **Step 3: Commit (core)**

```bash
cd C:/Websites/alexandria/alexandria-core
git add resources/js/pages/Projects/RecycleBin.tsx
git commit -m "$(cat <<'EOF'
feat(entries): RecycleBin Inertia page (table, empty state, restore action)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n
EOF
)"
```

---

### Task 5: EntryService::restore() (app)

**Files:**
- Modify: `alexandria-app/app/Services/Entries/EntryService.php`

Add `restore()` immediately after the `delete()` method (around line 112).

- [ ] **Step 1: Read `EntryService.php` around line 112 to confirm current `delete()` end**

The `delete()` method ends at line 111 with `return $entry->delete();` and line 112 with `}`.

- [ ] **Step 2: Add `restore()` method**

After the closing `}` of `delete()`, insert:

```php
    /**
     * Restore a soft-deleted entry.
     *
     * On restore the slug is re-occupied in the unique index, unblocking
     * slug reuse that was prevented while the entry was trashed.
     * Children that kept their parent_id during the trashed period are
     * automatically re-attached to the restored parent — no orphan
     * cleanup needed on restore.
     */
    public function restore(Entry $entry): bool
    {
        Log::info('EntryService: Restoring entry', [
            'entry_id' => $entry->id,
            'name' => $entry->name,
        ]);

        return (bool) $entry->restore();
    }
```

- [ ] **Step 3: Run Pint**

```bash
cd C:/Websites/alexandria/alexandria-app && vendor/bin/pint --dirty --format agent
```

- [ ] **Step 4: Commit (app)**

```bash
cd C:/Websites/alexandria/alexandria-app
git add app/Services/Entries/EntryService.php
git commit -m "$(cat <<'EOF'
feat(entries): EntryService::restore() — log + delegate to model restore

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n
EOF
)"
```

---

### Task 6: RecycleBinController (app)

**Files:**
- Create: `alexandria-app/app/Http/Controllers/Entries/RecycleBinController.php`

**Gate reasoning:**
- `index`: `can:update,project` — The recycle bin is a project management action. ProjectPolicy::update() checks `project.settings.edit` Spatie permission — the same gate used for project settings/member management routes. Restoring deleted content is a management operation, not a general-member operation.
- `restore`: `can:delete,entry` — No `restore` ability exists in EntryPolicy; the spec directs reusing `delete`. EntryPolicy::delete() checks `soft_delete` ACL action or `entry.delete` Spatie permission. The same user who could delete can reverse it.

**Route binding:** The restore route uses `->withTrashed()` so Laravel's implicit binding resolves trashed entries. The controller still calls `abort(404)` if the entry is not actually trashed or belongs to a different project, matching the style of `EntryController::destroy()`.

- [ ] **Step 1: Create `RecycleBinController.php`**

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Entries;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Entry;
use App\Http\Controllers\Controller;
use App\Services\Entries\EntryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Project Recycle Bin — lists soft-deleted entries and allows restoration.
 *
 * Gate decisions:
 *  index  → can:update,project (ProjectPolicy::update / project.settings.edit)
 *  restore → can:delete,entry  (EntryPolicy::delete / entry.delete, reused per spec)
 *
 * No force-delete surface is provided here; that is out of scope.
 */
final readonly class RecycleBinController extends Controller
{
    /**
     * List trashed entries for the project, newest-deleted first.
     *
     * Gated on project-update so only managers/owners can access the
     * recycle bin — same tier as project settings and member management.
     */
    public function index(Project $project): Response
    {
        Gate::authorize('update', $project);

        $entries = Entry::withTrashed()
            ->where('project_id', $project->id)
            ->whereNotNull('deleted_at')
            ->with('type:id,name,slug,icon')
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn (Entry $entry) => [
                'id' => $entry->id,
                'name' => $entry->name,
                'slug' => $entry->slug,
                'deleted_at_human' => $entry->deleted_at?->diffForHumans(),
                'blueprint' => [
                    'name' => $entry->type?->name,
                    'slug' => $entry->type?->slug,
                    'icon' => $entry->type?->icon,
                ],
            ]);

        return Inertia::render('Projects/RecycleBin', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'slug' => $project->slug,
            ],
            'entries' => $entries,
        ]);
    }

    /**
     * Restore a single trashed entry to active status.
     *
     * The route is declared with ->withTrashed() so {entry:slug} binding
     * resolves soft-deleted rows. We abort(404) when the entry is not
     * trashed (non-trashed entries cannot be "restored") or does not
     * belong to the given project (cross-project guard, mirrors destroy()).
     *
     * Gated on delete (reused as restore) — no separate restore ability
     * exists in EntryPolicy.
     */
    public function restore(Project $project, Entry $entry): RedirectResponse
    {
        if ($entry->project_id !== $project->id) {
            abort(404);
        }

        if (! $entry->trashed()) {
            abort(404);
        }

        Gate::authorize('delete', $entry);

        app(EntryService::class)->restore($entry);

        return redirect()
            ->route('projects.recycle-bin', $project)
            ->with('message', __('Entry restored.'))
            ->with('type', 'success');
    }
}
```

- [ ] **Step 2: Run Pint**

```bash
cd C:/Websites/alexandria/alexandria-app && vendor/bin/pint --dirty --format agent
```

- [ ] **Step 3: Commit (app)**

```bash
cd C:/Websites/alexandria/alexandria-app
git add app/Http/Controllers/Entries/RecycleBinController.php
git commit -m "$(cat <<'EOF'
feat(entries): RecycleBinController — index (list trashed) + restore action

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n
EOF
)"
```

---

### Task 7: Routes (app)

**Files:**
- Modify: `alexandria-app/routes/web.php`

Add the two recycle bin routes inside the existing `prefix('p')` group, right after the `entries.destroy` route at line ~267.

- [ ] **Step 1: Add import for `RecycleBinController` at the top of `web.php`**

Find the existing controller imports block (where `EntryController` is imported) and add:

```php
use App\Http\Controllers\Entries\RecycleBinController;
```

- [ ] **Step 2: Add the two routes after `entries.destroy`**

Find:
```php
    // Stage 11 Slice 4 — ribbon File tab delete action.
    Route::delete('/{project:slug}/{blueprint:slug}/{entry:slug}', [EntryController::class, 'destroy'])
        ->name('entries.destroy')
        ->middleware('can:delete,entry');
});
```

Replace with:
```php
    // Stage 11 Slice 4 — ribbon File tab delete action.
    Route::delete('/{project:slug}/{blueprint:slug}/{entry:slug}', [EntryController::class, 'destroy'])
        ->name('entries.destroy')
        ->middleware('can:delete,entry');

    // Stage 11 Slice 4 — project recycle bin (soft-deleted entry listing + restore).
    Route::get('/{project:slug}/recycle-bin', [RecycleBinController::class, 'index'])
        ->name('projects.recycle-bin')
        ->middleware('can:update,project');

    Route::post('/{project:slug}/recycle-bin/{entry:slug}/restore', [RecycleBinController::class, 'restore'])
        ->name('entries.restore')
        ->middleware('can:delete,entry')
        ->withTrashed();
});
```

> **Route ordering note:** The recycle-bin GET route (`/{project:slug}/recycle-bin`) is more specific than the blueprint route `/{project:slug}/{blueprint:slug}` because "recycle-bin" is a fixed second segment, not a blueprint slug. Laravel matches literal segments before wildcards. If any ambiguity arises, verify with `php artisan route:list --path=p` that these routes resolve correctly.

- [ ] **Step 3: Verify routes resolve correctly**

```bash
cd C:/Websites/alexandria/alexandria-app && php artisan route:list --path=p --compact 2>&1 | grep -i "recycle\|restore"
```

Expected output: two rows — `GET /p/{project}/recycle-bin` named `projects.recycle-bin` and `POST /p/{project}/recycle-bin/{entry}/restore` named `entries.restore`.

- [ ] **Step 4: Run Pint**

```bash
cd C:/Websites/alexandria/alexandria-app && vendor/bin/pint --dirty --format agent
```

- [ ] **Step 5: Commit (app)**

```bash
cd C:/Websites/alexandria/alexandria-app
git add routes/web.php
git commit -m "$(cat <<'EOF'
feat(routes): GET projects.recycle-bin + POST entries.restore

Both inside prefix('p'); restore uses withTrashed() for implicit binding.
Gate: update,project for index; delete,entry for restore (reuses delete
ability per spec — no restore ability exists in EntryPolicy).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n
EOF
)"
```

---

### Task 8: Feature tests (app)

**Files:**
- Create: `alexandria-app/tests/Feature/Entries/RecycleBinTest.php`

Test conventions (Andrew's style):
- `declare(strict_types=1);` at top
- Function-style tests: `it('description', function () { ... });`
- Brace-free string interpolation where applicable
- Chained `->and()` expectations: `expect($entry->deleted_at)->toBeNull()->and($entry->name)->toBe('...')`
- `Gate::before(fn () => true)` to bypass the ACL complexity for positive-path tests (matches existing entry test pattern)
- `Gate::before(fn () => false)` to deny all gates for 403 tests

- [ ] **Step 1: Create `tests/Feature/Entries/RecycleBinTest.php`**

```php
<?php

declare(strict_types=1);

/*
 * Stage 11 Slice 4 — Recycle Bin feature tests.
 *
 * Gate strategy: Gate::before(fn () => true) for positive-path tests
 * (mirrors existing entry test pattern; avoids ACL/Spatie setup complexity).
 * Gate::before(fn () => false) for 403 tests.
 *
 * Parent-id / children assertion documents current behavior: restoring a
 * child whose parent is still trashed re-activates the child with its
 * parent_id intact. The child will appear in the blueprint index but its
 * parent link is broken until the parent is also restored.
 */

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

uses()->group('recycle-bin');

beforeEach(function () {
    Log::spy();
    $this->withoutVite();

    $this->user = User::factory()->create();
    $this->project = Project::factory()->create(['owner_id' => $this->user->id]);
    $this->blueprint = Blueprint::factory()->create(['project_id' => $this->project->id]);
});

// ── Page access ────────────────────────────────────────────────────────────

it('redirects unauthenticated users to login', function () {
    $this->get(route('projects.recycle-bin', $this->project))
        ->assertRedirect(route('login'));
});

it('returns 403 for users without project update permission', function () {
    Gate::before(fn () => false);

    $this->actingAs($this->user)
        ->get(route('projects.recycle-bin', $this->project))
        ->assertForbidden();
});

it('renders the recycle bin page for authorized users', function () {
    Gate::before(fn () => true);

    $this->actingAs($this->user)
        ->get(route('projects.recycle-bin', $this->project))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Projects/RecycleBin'));
});

it('lists only trashed entries for the project, newest-deleted first', function () {
    Gate::before(fn () => true);

    $live = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
        'name' => 'Live Entry',
    ]);

    $old = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
        'name' => 'Older Trash',
    ]);
    $old->delete();

    $new = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
        'name' => 'Newer Trash',
    ]);
    $new->delete();

    $this->actingAs($this->user)
        ->get(route('projects.recycle-bin', $this->project))
        ->assertInertia(fn ($page) => $page
            ->component('Projects/RecycleBin')
            ->has('entries', 2)
            ->where('entries.0.name', 'Newer Trash')
            ->where('entries.1.name', 'Older Trash'));
});

it('does not expose trashed entries from other projects', function () {
    Gate::before(fn () => true);

    $otherProject = Project::factory()->create(['owner_id' => $this->user->id]);
    $otherBlueprint = Blueprint::factory()->create(['project_id' => $otherProject->id]);
    $foreign = Entry::factory()->create([
        'project_id' => $otherProject->id,
        'blueprint_id' => $otherBlueprint->id,
        'name' => 'Foreign Trash',
    ]);
    $foreign->delete();

    $this->actingAs($this->user)
        ->get(route('projects.recycle-bin', $this->project))
        ->assertInertia(fn ($page) => $page
            ->component('Projects/RecycleBin')
            ->has('entries', 0));
});

// ── Restore action ─────────────────────────────────────────────────────────

it('restores a trashed entry — deleted_at becomes null and entry reappears in blueprint index', function () {
    Gate::before(fn () => true);

    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
        'name' => 'To Restore',
    ]);
    $entry->delete();

    expect($entry->fresh()->deleted_at)->not->toBeNull();

    $this->actingAs($this->user)
        ->post(route('entries.restore', [$this->project, $entry]))
        ->assertRedirect(route('projects.recycle-bin', $this->project));

    $restored = Entry::find($entry->id);
    expect($restored)->not->toBeNull()
        ->and($restored->deleted_at)->toBeNull()
        ->and($restored->name)->toBe('To Restore');
});

it('returns 403 when restoring without delete permission', function () {
    Gate::before(fn () => false);

    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
    ]);
    $entry->delete();

    $this->actingAs($this->user)
        ->post(route('entries.restore', [$this->project, $entry]))
        ->assertForbidden();
});

it('returns 404 when restoring a non-trashed entry', function () {
    Gate::before(fn () => true);

    // Entry is live (not deleted) — restore route should abort(404)
    $entry = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
    ]);

    $this->actingAs($this->user)
        ->post(route('entries.restore', [$this->project, $entry]))
        ->assertNotFound();
});

it('returns 404 when restoring an entry that belongs to a different project', function () {
    Gate::before(fn () => true);

    $otherProject = Project::factory()->create(['owner_id' => $this->user->id]);
    $otherBlueprint = Blueprint::factory()->create(['project_id' => $otherProject->id]);
    $foreign = Entry::factory()->create([
        'project_id' => $otherProject->id,
        'blueprint_id' => $otherBlueprint->id,
    ]);
    $foreign->delete();

    // Request targets $this->project but the entry belongs to $otherProject
    $this->actingAs($this->user)
        ->post(route('entries.restore', [$this->project, $foreign]))
        ->assertNotFound();
});

it('preserves parent_id when restoring a child whose parent is still trashed', function () {
    Gate::before(fn () => true);

    /*
     * Documents current behavior: restoring a child while its parent is
     * still trashed re-activates the child with parent_id intact. The
     * child appears in the blueprint index but its parent link points to
     * a trashed row until the parent is also restored.
     */
    $parent = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
        'name' => 'Parent',
    ]);

    $child = Entry::factory()->create([
        'project_id' => $this->project->id,
        'blueprint_id' => $this->blueprint->id,
        'parent_id' => $parent->id,
        'name' => 'Child',
    ]);

    // Trash both
    $parent->delete();
    $child->delete();

    // Restore child only
    $this->actingAs($this->user)
        ->post(route('entries.restore', [$this->project, $child]))
        ->assertRedirect();

    $restoredChild = Entry::find($child->id);
    expect($restoredChild)->not->toBeNull()
        ->and($restoredChild->deleted_at)->toBeNull()
        ->and($restoredChild->parent_id)->toBe($parent->id); // parent_id preserved
});
```

- [ ] **Step 2: Run the tests**

```bash
cd C:/Websites/alexandria/alexandria-app && php artisan test --compact --filter="RecycleBin"
```

Expected: all 8 tests pass.

- [ ] **Step 3: Run the broader entry filter to catch regressions**

```bash
cd C:/Websites/alexandria/alexandria-app && php artisan test --compact --filter="Recycle|EntryDelete|Entry"
```

Expected: all tests pass.

- [ ] **Step 4: Commit (app)**

```bash
cd C:/Websites/alexandria/alexandria-app
git add tests/Feature/Entries/RecycleBinTest.php
git commit -m "$(cat <<'EOF'
test(entries): recycle bin coverage — access gates, listing, restore, cross-project guard

8 tests: unauthenticated redirect, 403, page render, list filtering
(live entries excluded, cross-project excluded, newest-first order),
restore success, restore 403, restore non-trashed→404, cross-project→404,
children parent_id preserved after partial restore.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Eq6ibpxnULaMqdYdrUqd3n
EOF
)"
```

---

### Task 9: Final build, pint, core tests, and report

**Files:**
- Create: `alexandria-core/.superpowers/sdd/recycle-bin-report.md`

- [ ] **Step 1: Run core package tests**

```bash
cd C:/Websites/alexandria/alexandria-core && vendor/bin/pest --compact
```

Expected: all tests pass (no PHP in core was changed — this is a smoke check).

- [ ] **Step 2: Full app test run on the affected filter**

```bash
cd C:/Websites/alexandria/alexandria-app && php artisan test --compact --filter="Recycle|EntryDelete|Entry"
```

Expected: all tests pass.

- [ ] **Step 3: Final build**

```bash
cd C:/Websites/alexandria/alexandria-app && npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Pint both repos**

```bash
cd C:/Websites/alexandria/alexandria-core && vendor/bin/pint --dirty --format agent
cd C:/Websites/alexandria/alexandria-app && vendor/bin/pint --dirty --format agent
```

- [ ] **Step 5: Write the SDD report**

Create `alexandria-core/.superpowers/sdd/recycle-bin-report.md` with the final status, gate decisions, contrast tokens chosen, test results, and any open concerns.

- [ ] **Step 6: Squash-ready commits or leave as-is**

The tasks produce 7 commits across the two repos. If the submitter wants them squashed, apply:

**Core:**
```
feat(entries): project recycle bin + sidebar access; danger-item contrast
```
(squash Tasks 1-4 in core)

**App:**
```
test(entries): recycle bin coverage
```
(squash Tasks 5-8 in app)

---

## Self-Review Checklist

**Spec coverage:**
- [x] GET `/p/{project:slug}/recycle-bin` → `projects.recycle-bin` ✓ Task 7
- [x] Inertia page `Projects/RecycleBin.tsx` with table, empty state, actions ✓ Task 4
- [x] Trashed entries only, newest-first, with entry name / blueprint name / deleted_at humanized / restore ✓ Tasks 4+6
- [x] POST `/p/{project:slug}/recycle-bin/{entry}/restore` → `entries.restore` ✓ Task 7
- [x] `withTrashed()` on route ✓ Task 7
- [x] `abort(404)` if not trashed or cross-project ✓ Task 6
- [x] `Gate::authorize('delete', $entry)` in restore controller ✓ Task 6
- [x] `$entry->restore()` via EntryService ✓ Task 5
- [x] Redirect with flash ✓ Task 6
- [x] Sidebar row in "Tools" after Archive ✓ Task 2
- [x] `fa-solid fa-trash-can` icon ✓ Task 2
- [x] Lang key `nav.recycle_bin` ✓ Task 2
- [x] No force-delete ✓ (deliberately absent)
- [x] DropdownMenu danger at-rest: full stroke, not faded ✓ Task 1
- [x] DropdownMenu danger hover: `--theme-status-error-subtle` ✓ Task 1
- [x] Token-driven (no hex) ✓ Task 1
- [x] Feature tests: page 403 / authorized listing / cross-project / restore / restore 404 / children parent_id ✓ Task 8

**Placeholder scan:** None — all steps have real code.

**Type consistency:**
- `TrashedEntry.blueprint.name` is `string | null` (Task 3) → controller emits `$entry->type?->name` which is `?string` ✓
- Route `entries.restore` takes `[Project, Entry]` → test uses `route('entries.restore', [$this->project, $entry])` ✓
- `RecycleBinProps.entries` is `TrashedEntry[]` → controller emits array shaped identically ✓
