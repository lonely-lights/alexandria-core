# Ribbon Plan 4 - Quick Action Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or equivalent task-by-task execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the final deferred ribbon phase from `docs/superpowers/specs/2026-06-12-ribbon-transitions-design.md` section 6: a compact, server-persisted Quick Action Toolbar (QAT) that renders user-pinned ribbon controls and user bookmarks beside the tab row, with right-click pin/unpin on controls and a small editor for ordering/removal/bookmark creation.

**Architecture:** Core owns the generic QAT types, rendering, editor popover, and ribbon integration. The app owns persistence on `user_preferences.ribbon_quick_actions`, shared through `auth.preferences` and saved by a narrow JSON endpoint. The QAT reads the same declarative `RibbonControl` objects already used by the renderer and shortcut binder; there is no second action registry.

**Tech Stack:** React 19 + TypeScript in `alexandria-core/resources/js/ribbon/`; Laravel 13 app persistence under `alexandria-app`; Vitest through the `@alexandria` alias; Pest feature + browser coverage in the app. No new dependencies.

**Branches:** `feat/ribbon-transitions` in both repos. Verification commands run from `C:\Websites\alexandria\alexandria-app`. Core and app commits stay separate.

**House facts verified at plan time:**
- Existing ribbon modes are now `expanded | collapsed`, not the original comfortable/slim split. QAT must fit the current icon-only ribbon.
- `Ribbon.tsx` already supports `leading`, `trailing`, and `headerRow`; in workspace merged-header mode, QAT should render as a sibling before the `tablist`, not inside the `tablist`.
- Existing `RibbonControl.id` values are stable and unique within the writing set. Select controls such as `work-status` need a value and should not be pinnable in v1.
- `user_preferences` already uses JSON casts for theme overrides and is shared through `auth.preferences` in `HandleInertiaRequests`.
- The app has `PUT /account/preferences` for broad settings, but QAT should use a narrow endpoint because it is a small app-chrome preference saved from core UI.
- Core already hardcodes app-level URLs in writing pages (`/writing`, `/works/...`); the QAT save URL will still be configurable on `<Ribbon>` and default to `/account/ribbon/quick-actions`.

---

## File Structure

```
alexandria-core/resources/js/ribbon/
|-- quickActions.ts                  # Task 1 - types + pure helpers
|-- QuickActionBar.tsx               # Task 2 - render pinned controls/bookmarks
|-- QuickActionEditor.tsx            # Task 2 - order/remove/add bookmark popover
|-- Ribbon.tsx                       # Task 3 - QAT mount + right-click control menu
`-- controls/*.tsx                   # Task 3 - no direct changes expected; context menu is delegated

alexandria-core/resources/css/components/ribbon.css
alexandria-core/lang/en/ribbon.php

alexandria-app/database/migrations/*_add_ribbon_quick_actions_to_user_preferences_table.php
alexandria-app/app/Models/Account/UserPreference.php
alexandria-app/app/Http/Middleware/HandleInertiaRequests.php
alexandria-app/app/Http/Requests/UpdateRibbonQuickActionsRequest.php
alexandria-app/app/Http/Controllers/Settings/AccountController.php
alexandria-app/routes/web.php
alexandria-app/resources/js/ribbon/tests/quick-actions.test.ts
alexandria-app/tests/Feature/Auth/RibbonQuickActionsTest.php
alexandria-app/tests/Browser/Writing/RibbonQuickActionsTest.php
```

---

### Task 1: Core QAT types and pure helpers (TDD)

**Files:**
- Create: `alexandria-core/resources/js/ribbon/quickActions.ts`
- Test: `alexandria-app/resources/js/ribbon/tests/quick-actions.test.ts`

- [ ] **Step 1: Write the failing Vitest**

`alexandria-app/resources/js/ribbon/tests/quick-actions.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import {
    canPinControl,
    findControlById,
    moveQuickAction,
    normalizeQuickActions,
    nextQuickActionId,
    type RibbonQuickAction,
} from '@alexandria/ribbon/quickActions';
import type { RibbonTab } from '@alexandria/ribbon/types';

const tabs: RibbonTab[] = [
    {
        id: 'write',
        labelKey: 'writing.ribbon.tab_write',
        groups: [
            {
                id: 'text',
                labelKey: 'writing.ribbon.group_text',
                controls: [
                    { id: 'bold', type: 'toggle', icon: 'fa-solid fa-bold', labelKey: 'writing.ribbon.bold', onAction: vi.fn() },
                    { id: 'work-status', type: 'select', icon: 'fa-solid fa-flag', labelKey: 'writing.ribbon.status', onAction: vi.fn() },
                ],
            },
        ],
    },
];

describe('quick action helpers', () => {
    it('finds controls across tabs and groups', () => {
        expect(findControlById(tabs, 'bold')?.icon).toBe('fa-solid fa-bold');
        expect(findControlById(tabs, 'missing')).toBeNull();
    });

    it('pins button/toggle/menu controls but not select controls', () => {
        expect(canPinControl(findControlById(tabs, 'bold')!)).toBe(true);
        expect(canPinControl(findControlById(tabs, 'work-status')!)).toBe(false);
    });

    it('normalizes persisted quick actions and drops invalid rows', () => {
        const input = [
            { id: 'a', type: 'control', setKey: 'writing', controlId: 'bold' },
            { id: 'b', type: 'bookmark', url: '/writing', icon: 'fa-solid fa-pen', label: 'Writing' },
            { id: 'bad', type: 'bookmark', url: 'https://example.com', icon: 'x', label: 'External' },
            { id: 'also-bad', type: 'control', setKey: '', controlId: '' },
        ];

        expect(normalizeQuickActions(input)).toEqual([
            { id: 'a', type: 'control', setKey: 'writing', controlId: 'bold' },
            { id: 'b', type: 'bookmark', url: '/writing', icon: 'fa-solid fa-pen', label: 'Writing' },
        ]);
    });

    it('moves actions up and down without mutating the original array', () => {
        const actions: RibbonQuickAction[] = [
            { id: 'a', type: 'control', setKey: 'writing', controlId: 'bold' },
            { id: 'b', type: 'bookmark', url: '/writing', icon: 'fa-solid fa-pen', label: 'Writing' },
        ];

        expect(moveQuickAction(actions, 'b', -1).map((a) => a.id)).toEqual(['b', 'a']);
        expect(actions.map((a) => a.id)).toEqual(['a', 'b']);
        expect(moveQuickAction(actions, 'a', -1).map((a) => a.id)).toEqual(['a', 'b']);
    });

    it('creates stable client ids with a prefix', () => {
        expect(nextQuickActionId('control')).toMatch(/^control-/);
        expect(nextQuickActionId('bookmark')).toMatch(/^bookmark-/);
    });
});
```

- [ ] **Step 2: Run it to verify failure**

Run from app:

```powershell
npx.cmd vitest run resources/js/ribbon/tests/quick-actions.test.ts
```

Expected: fail because `@alexandria/ribbon/quickActions` does not exist.

- [ ] **Step 3: Implement `quickActions.ts`**

```ts
import type { RibbonControl, RibbonTab } from './types';

export type RibbonQuickAction =
    | {
        id: string;
        type: 'control';
        setKey: string;
        controlId: string;
    }
    | {
        id: string;
        type: 'bookmark';
        url: string;
        icon: string;
        label: string;
    };

const INTERNAL_URL = /^\/(?!\/)/;
const MAX_ITEMS = 12;

export function nextQuickActionId(prefix: 'control' | 'bookmark'): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function findControlById<Ctx>(tabs: RibbonTab<Ctx>[], controlId: string): RibbonControl<Ctx> | null {
    for (const tab of tabs) {
        for (const group of tab.groups) {
            const control = group.controls.find((item) => item.id === controlId);

            if (control) {
                return control;
            }
        }
    }

    return null;
}

export function canPinControl(control: RibbonControl | null): boolean {
    return control !== null && control.type !== 'select';
}

export function normalizeQuickActions(input: unknown): RibbonQuickAction[] {
    if (!Array.isArray(input)) {
        return [];
    }

    const normalized: RibbonQuickAction[] = [];

    for (const item of input) {
        if (normalized.length >= MAX_ITEMS || item === null || typeof item !== 'object') {
            continue;
        }

        const row = item as Record<string, unknown>;

        if (row.type === 'control'
            && typeof row.id === 'string'
            && typeof row.setKey === 'string'
            && row.setKey.length > 0
            && typeof row.controlId === 'string'
            && row.controlId.length > 0) {
            normalized.push({
                id: row.id,
                type: 'control',
                setKey: row.setKey,
                controlId: row.controlId,
            });
        }

        if (row.type === 'bookmark'
            && typeof row.id === 'string'
            && typeof row.url === 'string'
            && INTERNAL_URL.test(row.url)
            && typeof row.icon === 'string'
            && typeof row.label === 'string'
            && row.label.trim().length > 0) {
            normalized.push({
                id: row.id,
                type: 'bookmark',
                url: row.url,
                icon: row.icon,
                label: row.label.trim(),
            });
        }
    }

    return normalized;
}

export function moveQuickAction(actions: RibbonQuickAction[], id: string, delta: -1 | 1): RibbonQuickAction[] {
    const index = actions.findIndex((item) => item.id === id);
    const nextIndex = index + delta;

    if (index === -1 || nextIndex < 0 || nextIndex >= actions.length) {
        return actions;
    }

    const next = [...actions];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);

    return next;
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
npx.cmd vitest run resources/js/ribbon/tests/quick-actions.test.ts
npm.cmd run types:check
```

Expected: pass.

---

### Task 2: App persistence endpoint and shared preference

**Files:**
- Create migration: `alexandria-app/database/migrations/*_add_ribbon_quick_actions_to_user_preferences_table.php`
- Modify: `app/Models/Account/UserPreference.php`
- Modify: `app/Http/Middleware/HandleInertiaRequests.php`
- Create: `app/Http/Requests/UpdateRibbonQuickActionsRequest.php`
- Modify: `app/Http/Controllers/Settings/AccountController.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/Auth/RibbonQuickActionsTest.php`

- [ ] **Step 1: Write the feature tests first**

`alexandria-app/tests/Feature/Auth/RibbonQuickActionsTest.php`:

```php
<?php

declare(strict_types=1);

use App\Models\Account\UserPreference;
use App\Models\User;

it('guards ribbon quick actions behind auth', function () {
    $this->patchJson('/account/ribbon/quick-actions', ['items' => []])
        ->assertUnauthorized();
});

it('persists normalized ribbon quick actions', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patchJson('/account/ribbon/quick-actions', [
            'items' => [
                [
                    'id' => 'control-bold',
                    'type' => 'control',
                    'setKey' => 'writing',
                    'controlId' => 'bold',
                ],
                [
                    'id' => 'bookmark-writing',
                    'type' => 'bookmark',
                    'url' => '/writing',
                    'icon' => 'fa-solid fa-pen-nib',
                    'label' => 'Writing',
                ],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('items.0.controlId', 'bold')
        ->assertJsonPath('items.1.url', '/writing');

    $prefs = UserPreference::query()->where('user_id', $user->id)->firstOrFail();

    expect($prefs->ribbon_quick_actions)->toHaveCount(2);
});

it('rejects external bookmark urls', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patchJson('/account/ribbon/quick-actions', [
            'items' => [
                [
                    'id' => 'external',
                    'type' => 'bookmark',
                    'url' => 'https://example.com',
                    'icon' => 'fa-solid fa-arrow-up-right-from-square',
                    'label' => 'External',
                ],
            ],
        ])
        ->assertUnprocessable();
});

it('shares ribbon quick actions through auth preferences', function () {
    $user = User::factory()->create();
    $user->getPreferencesWithDefaults()->update([
        'ribbon_quick_actions' => [
            [
                'id' => 'control-bold',
                'type' => 'control',
                'setKey' => 'writing',
                'controlId' => 'bold',
            ],
        ],
    ]);

    $this->actingAs($user)
        ->get('/settings')
        ->assertInertia(fn ($page) => $page
            ->where('auth.preferences.ribbon_quick_actions.0.controlId', 'bold'));
});
```

- [ ] **Step 2: Run it to verify failure**

```powershell
php artisan test --compact tests/Feature/Auth/RibbonQuickActionsTest.php
```

Expected: fail because route/column do not exist.

- [ ] **Step 3: Add the migration**

Use Artisan from app:

```powershell
php artisan make:migration add_ribbon_quick_actions_to_user_preferences_table --table=user_preferences --no-interaction
```

Migration body:

```php
public function up(): void
{
    Schema::table('user_preferences', function (Blueprint $table) {
        $table->json('ribbon_quick_actions')->nullable()->after('compact_mode');
    });
}

public function down(): void
{
    Schema::table('user_preferences', function (Blueprint $table) {
        $table->dropColumn('ribbon_quick_actions');
    });
}
```

- [ ] **Step 4: Update model defaults/casts**

`app/Models/Account/UserPreference.php`:

```php
/**
 * Ribbon chrome
 * @property array|null $ribbon_quick_actions
 */
```

Add cast:

```php
'ribbon_quick_actions' => 'array',
```

Add default:

```php
'ribbon_quick_actions' => [],
```

- [ ] **Step 5: Add the request**

`app/Http/Requests/UpdateRibbonQuickActionsRequest.php`:

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRibbonQuickActionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['array', 'max:12'],
            'items.*.id' => ['required', 'string', 'max:80'],
            'items.*.type' => ['required', 'string', 'in:control,bookmark'],
            'items.*.setKey' => ['required_if:items.*.type,control', 'string', 'max:80'],
            'items.*.controlId' => ['required_if:items.*.type,control', 'string', 'max:120'],
            'items.*.url' => ['required_if:items.*.type,bookmark', 'string', 'max:500', 'regex:/^\/(?!\/)/'],
            'items.*.icon' => ['required_if:items.*.type,bookmark', 'string', 'max:80', 'regex:/^[a-z0-9\-\s]+$/i'],
            'items.*.label' => ['required_if:items.*.type,bookmark', 'string', 'max:40'],
        ];
    }
}
```

- [ ] **Step 6: Add controller route and shared prop**

`AccountController.php` imports:

```php
use App\Http\Requests\UpdateRibbonQuickActionsRequest;
use Illuminate\Http\JsonResponse;
```

Method:

```php
public function updateRibbonQuickActions(UpdateRibbonQuickActionsRequest $request): JsonResponse
{
    /** @var User $user */
    $user = $request->user();
    $items = $request->validated('items', []);

    $user->getPreferencesWithDefaults()->update([
        'ribbon_quick_actions' => $items,
    ]);

    return response()->json(['items' => $items]);
}
```

`routes/web.php` inside the authenticated group:

```php
Route::patch('/account/ribbon/quick-actions', [AccountController::class, 'updateRibbonQuickActions'])
    ->name('account.ribbon.quick-actions.update');
```

`HandleInertiaRequests.php`, add to the `auth.preferences` allow-list:

```php
'ribbon_quick_actions',
```

- [ ] **Step 7: Verify**

```powershell
php artisan test --compact tests/Feature/Auth/RibbonQuickActionsTest.php
vendor/bin/pint --dirty --format agent
```

Expected: feature tests pass and Pint is clean.

---

### Task 3: QAT rendering, editor popover, and right-click pinning

**Files:**
- Create: `alexandria-core/resources/js/ribbon/QuickActionBar.tsx`
- Create: `alexandria-core/resources/js/ribbon/QuickActionEditor.tsx`
- Modify: `alexandria-core/resources/js/ribbon/Ribbon.tsx`
- Modify: `alexandria-core/resources/css/components/ribbon.css`
- Modify: `alexandria-core/lang/en/ribbon.php`

**Interaction decisions:**
- QAT renders before the tab strip, never inside `role="tablist"`.
- Pinned controls are icon-only buttons using the underlying `RibbonControl`'s icon, active/disabled state, and `onAction(ctx)`.
- Select controls are not pinnable in v1 because their action requires a chosen value.
- Bookmarks are internal URLs only and use Inertia `router.visit(url)`.
- Right-click on a visible ribbon control opens a small pointer-positioned context menu with Add/Remove. The event is delegated from group containers using `data-ribbon-control`, so existing control renderers stay mostly untouched.
- The editor popover opens from a small QAT gear button and supports move up/down, remove, and add bookmark (label/url/icon).
- Saves are optimistic in core state and persisted by `fetch` to `quickActionSaveUrl` with CSRF headers.

- [ ] **Step 1: Implement `QuickActionBar.tsx`**

Core shape:

```tsx
import { router, usePage } from '@inertiajs/react';
import useT from '@alexandria/hooks/useT';

import QuickActionEditor from './QuickActionEditor';
import {
    findControlById,
    normalizeQuickActions,
    type RibbonQuickAction,
} from './quickActions';
import type { RibbonTab } from './types';

interface QuickActionBarProps<Ctx> {
    setKey: string;
    tabs: RibbonTab<Ctx>[];
    context: Ctx;
    actions: RibbonQuickAction[];
    onChange: (next: RibbonQuickAction[]) => void;
}

export default function QuickActionBar<Ctx>({
    setKey,
    tabs,
    context,
    actions,
    onChange,
}: QuickActionBarProps<Ctx>) {
    const t = useT();
    const visibleActions = normalizeQuickActions(actions).filter(
        (item) => item.type === 'bookmark' || item.setKey === setKey,
    );

    return (
        <div className="ribbon-qat" aria-label={t('ribbon.qat_label')}>
            {visibleActions.map((item) => {
                if (item.type === 'bookmark') {
                    return (
                        <button
                            key={item.id}
                            type="button"
                            className="ribbon-qat-item alex-toolbar-btn"
                            title={item.label}
                            onClick={() => router.visit(item.url)}
                        >
                            <i className={item.icon} aria-hidden="true" />
                        </button>
                    );
                }

                const control = findControlById(tabs, item.controlId);
                if (!control || control.visible?.(context) === false) {
                    return null;
                }

                const label = t(control.labelKey);
                const disabled = control.disabled?.(context) ?? false;
                const active = control.active?.(context) ?? false;

                return (
                    <button
                        key={item.id}
                        type="button"
                        className={`ribbon-qat-item alex-toolbar-btn ${active ? 'alex-toolbar-btn--active' : ''}`}
                        title={label}
                        aria-label={label}
                        aria-pressed={control.type === 'toggle' ? active : undefined}
                        disabled={disabled}
                        onClick={() => control.onAction(context)}
                    >
                        <i className={control.icon} aria-hidden="true" />
                    </button>
                );
            })}

            <QuickActionEditor actions={visibleActions} onChange={onChange} />
        </div>
    );
}
```

Implementation should wrap QAT items in `Tooltip` if the component remains under 250 lines after the editor split. Otherwise use `title` in v1 and keep the richer tooltip as polish.

- [ ] **Step 2: Implement `QuickActionEditor.tsx`**

Core shape:

```tsx
import { useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';

import {
    moveQuickAction,
    nextQuickActionId,
    type RibbonQuickAction,
} from './quickActions';

interface QuickActionEditorProps {
    actions: RibbonQuickAction[];
    onChange: (next: RibbonQuickAction[]) => void;
}

export default function QuickActionEditor({ actions, onChange }: QuickActionEditorProps) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [label, setLabel] = useState('');
    const [url, setUrl] = useState('');
    const [icon, setIcon] = useState('fa-solid fa-bookmark');

    function addBookmark(): void {
        if (!label.trim() || !url.startsWith('/')) {
            return;
        }

        onChange([
            ...actions,
            {
                id: nextQuickActionId('bookmark'),
                type: 'bookmark',
                label: label.trim(),
                url,
                icon,
            },
        ]);
        setLabel('');
        setUrl('');
        setIcon('fa-solid fa-bookmark');
    }

    const panelStyle: CSSProperties = {
        background: 'var(--theme-base-surface)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
    };

    return (
        <div className="relative">
            <button
                type="button"
                data-ribbon-qat-editor
                className="ribbon-qat-item alex-toolbar-btn"
                aria-label={t('ribbon.qat_edit')}
                onClick={() => setOpen((current) => !current)}
            >
                <i className="fa-solid fa-gear" aria-hidden="true" />
            </button>

            {open && (
                <div className="ribbon-qat-editor" style={panelStyle}>
                    {/* Render rows: icon/label, up/down, remove. */}
                    {/* Render add-bookmark form: label, url, icon, add button. */}
                </div>
            )}
        </div>
    );
}
```

Keep the final file under the repo's size threshold by extracting tiny `EditorRow` and `BookmarkForm` functions if needed.

- [ ] **Step 3: Integrate into `Ribbon.tsx`**

Add imports:

```tsx
import { useEffect, useMemo } from 'react';
import QuickActionBar from './QuickActionBar';
import {
    canPinControl,
    findControlById,
    normalizeQuickActions,
    nextQuickActionId,
    type RibbonQuickAction,
} from './quickActions';
```

Extend props:

```ts
quickActions?: RibbonQuickAction[];
quickActionSaveUrl?: string;
```

Inside `Ribbon`:

```tsx
const pagePrefs = (usePage().props as {
    auth?: { preferences?: { ribbon_quick_actions?: unknown } };
}).auth?.preferences?.ribbon_quick_actions;
const initialQuickActions = useMemo(
    () => normalizeQuickActions(quickActions ?? pagePrefs),
    [quickActions, pagePrefs],
);
const [quickActionItems, setQuickActionItems] = useState<RibbonQuickAction[]>(initialQuickActions);

useEffect(() => setQuickActionItems(initialQuickActions), [initialQuickActions]);

function persistQuickActions(next: RibbonQuickAction[]): void {
    setQuickActionItems(next);
    void fetch(quickActionSaveUrl ?? '/account/ribbon/quick-actions', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
        },
        body: JSON.stringify({ items: next }),
    });
}
```

Render QAT as a sibling before `tabStrip` in both header paths:

```tsx
<QuickActionBar
    setKey={setKey}
    tabs={tabs}
    context={context}
    actions={quickActionItems}
    onChange={persistQuickActions}
/>
```

Add delegated context-menu handling on each visible group control row:

```tsx
onContextMenu={(event) => {
    const trigger = (event.target as Element).closest('[data-ribbon-control]');
    if (!trigger) return;
    const controlId = trigger.getAttribute('data-ribbon-control');
    const control = controlId ? findControlById(tabs, controlId) : null;
    if (!canPinControl(control)) return;
    event.preventDefault();
    // open pointer menu with Add/Remove quick action
}}
```

The pointer menu can be a small inline/portaled panel in `Ribbon.tsx` because it only has one or two items and depends on pointer coordinates. Store `{x, y, controlId}` in state. Add/remove item by `controlId` and `setKey`.

- [ ] **Step 4: CSS and translations**

`resources/css/components/ribbon.css` additions:

```css
.ribbon-qat {
    display: flex;
    align-items: center;
    gap: 0.125rem;
    flex-shrink: 0;
    padding-right: 0.375rem;
    border-right: 1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent);
}

.ribbon-qat-item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    font-size: 0.75rem;
}

.ribbon-qat-editor {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    z-index: 60;
    width: min(22rem, calc(100vw - 1rem));
    padding: 0.75rem;
}

.ribbon-context-menu {
    position: fixed;
    z-index: 9999;
    min-width: 11rem;
    overflow: hidden;
}
```

`lang/en/ribbon.php` additions:

```php
'qat_label' => 'Quick actions',
'qat_edit' => 'Edit quick actions',
'qat_empty' => 'No quick actions pinned',
'qat_add' => 'Add to quick actions',
'qat_remove' => 'Remove from quick actions',
'qat_move_up' => 'Move up',
'qat_move_down' => 'Move down',
'qat_bookmark_label' => 'Label',
'qat_bookmark_url' => 'URL',
'qat_bookmark_icon' => 'Icon',
'qat_bookmark_add' => 'Add bookmark',
```

- [ ] **Step 5: Verify compile**

```powershell
npm.cmd run types:check
npm.cmd run build
```

---

### Task 4: Browser coverage for pinning, persistence, and action behavior

**Files:**
- Create: `alexandria-app/tests/Browser/Writing/RibbonQuickActionsTest.php`

- [ ] **Step 1: Add browser smoke helpers**

Reuse the seed/setup style from `tests/Browser/Writing/RibbonTest.php`. Keep this file focused on QAT behavior.

- [ ] **Step 2: Pin Bold and verify persistence**

Core test flow:

```php
it('pins a ribbon control to quick actions and persists it', function () {
    $work = ribbonQuickActionsSeedProseWork();

    $page = visit("/works/{$this->project->slug}/{$work->slug}")
        ->resize(1600, 1000);

    ribbonQuickActionsWaitForCount($page, '[data-ribbon-control="bold"]', 1);
    $page->rightClick('[data-ribbon-control="bold"]');
    $page->click('Add to quick actions');
    ribbonQuickActionsWaitForCount($page, '[data-ribbon-quick-action="bold"]', 1);

    $page->refresh();
    ribbonQuickActionsWaitForCount($page, '[data-ribbon-quick-action="bold"]', 1);
});
```

- [ ] **Step 3: QAT pinned control invokes the same action**

```php
it('runs a pinned ribbon control from the quick action bar', function () {
    $work = ribbonQuickActionsSeedProseWork();
    $this->user->getPreferencesWithDefaults()->update([
        'ribbon_quick_actions' => [
            ['id' => 'control-bold', 'type' => 'control', 'setKey' => 'writing', 'controlId' => 'bold'],
        ],
    ]);

    $page = visit("/works/{$this->project->slug}/{$work->slug}")
        ->resize(1600, 1000);

    $page->click('[data-ribbon-quick-action="bold"]')
        ->click('.ProseMirror')
        ->typeSlowly('.ProseMirror', 'Pinned bold', 15);

    ribbonQuickActionsWaitForCount($page, '.ProseMirror strong', 1);
});
```

- [ ] **Step 4: Bookmark creation and navigation**

```php
it('adds an internal bookmark from the quick action editor', function () {
    $work = ribbonQuickActionsSeedProseWork();
    $page = visit("/works/{$this->project->slug}/{$work->slug}")
        ->resize(1600, 1000);

    $page->click('[data-ribbon-qat-editor]');
    $page->fill('[name="qat_label"]', 'Writing');
    $page->fill('[name="qat_url"]', '/writing');
    $page->fill('[name="qat_icon"]', 'fa-solid fa-pen-nib');
    $page->click('Add bookmark');
    ribbonQuickActionsWaitForCount($page, '[data-ribbon-quick-bookmark="/writing"]', 1);

    $page->click('[data-ribbon-quick-bookmark="/writing"]');
    $page->waitForUrl('**/writing');
});
```

- [ ] **Step 5: Verify**

```powershell
php artisan test --compact tests/Browser/Writing/RibbonQuickActionsTest.php
```

---

### Task 5: Required sweep and commits

- [ ] Run from `alexandria-app`:

```powershell
npm.cmd run build
npm.cmd run types:check
npx.cmd vitest run resources/js/ribbon
php artisan test --compact tests/Feature/Auth/RibbonQuickActionsTest.php
php artisan test --compact tests/Browser/Writing/RibbonQuickActionsTest.php
vendor/bin/pint --dirty --format agent
```

- [ ] If `ribbon.css` token usage changes, regenerate and review:

```powershell
$env:UPDATE_USAGE='1'
npx.cmd vitest run resources/js/theming/tests/styles/token-usage.test.ts
Remove-Item Env:\UPDATE_USAGE
```

- [ ] Commit split:

Core:

```powershell
git -C C:\Websites\alexandria\alexandria-core add resources/js/ribbon resources/css/components/ribbon.css lang/en/ribbon.php docs/superpowers/plans/2026-06-13-ribbon-plan-4-quick-actions.md
git -C C:\Websites\alexandria\alexandria-core commit -m "feat(ribbon): add quick action toolbar"
```

App:

```powershell
git -C C:\Websites\alexandria\alexandria-app add database/migrations app/Models/Account/UserPreference.php app/Http/Middleware/HandleInertiaRequests.php app/Http/Requests/UpdateRibbonQuickActionsRequest.php app/Http/Controllers/Settings/AccountController.php routes/web.php resources/js/ribbon/tests/quick-actions.test.ts tests/Feature/Auth/RibbonQuickActionsTest.php tests/Browser/Writing/RibbonQuickActionsTest.php docs/frontend/THEMING-TOKEN-USAGE.md
git -C C:\Websites\alexandria\alexandria-app commit -m "test(ribbon): cover quick action persistence"
```

After app commit, inspect hook output and `git status --short` for unexpected deletes.

---

## Self-Review

- Spec section 6 coverage: QAT location, pinned control ids, bookmarks, right-click pin/unpin, editor popover, ordering/removal, server persistence on `user_preferences`.
- Core remains generic enough for app chrome: QAT save URL is configurable, and item rendering depends on declarative `RibbonControl` definitions instead of writing-specific logic.
- App owns persistence and validation; external bookmark URLs are rejected.
- Risk: the editor popover can grow too large. Keep it split into `QuickActionEditor` subfunctions and avoid folding persistence into the editor component.
- Risk: context-menu browser tests can be finicky. Use stable `data-ribbon-control`, visible menu text, and QAT data hooks (`data-ribbon-quick-action`, `data-ribbon-quick-bookmark`) as the behavioral contract.
