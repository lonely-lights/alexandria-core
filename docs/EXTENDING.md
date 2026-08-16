# Extending Alexandria

Alexandria Core ships as a Composer package that aims to be the *framework* — the EAV system, the AI orchestration scaffolding, the auth surface, the React/Inertia page library — and stays out of the way of the *product*. This guide is for consumer apps (alexandria-app, future tenants) that need to swap a default for something else without forking the package.

The package's three forms of override are, in order from cheapest to most invasive:

1. **Config publish** — copy a config file, edit values, you're done.
2. **Drop-in override** — file in your app's `resources/js/pages/` or `app/Models/` that takes precedence over core's same-named file.
3. **Service-provider extension** — register your own classes for things core resolves through the container.

Each section below walks one extension point.

---

## 1. Publishing the config file

Core's master config lives at `config/alexandria.php` inside the package and is merged into your app's `config()` repository at boot. To override values without forking:

```bash
php artisan vendor:publish --tag=alexandria-config
```

That copies `vendor/lonely-lights/alexandria-core/config/alexandria.php` to your app's `config/alexandria.php`. From then on the file is yours — Laravel reads your local copy, not the package's. Edit any of the keys below and reload.

The file groups overrides into three sections:

- `media` — image dimensions per media collection (page_image / banner / gallery), accepted MIME types, crop ratios.
- `ai` — currently `allow_env_fallback`. `false` (default) makes CredentialResolver throw when a user has no BYOK key — appropriate for SaaS. `true` falls back to `ai.providers.<sdk-key>.key` from the laravel/ai SDK config — appropriate for self-hosted.
- `models` — see Section 2.

---

## 2. Overriding a model

Every public Eloquent model in core is resolvable through `config('alexandria.models.<key>')`. To swap one:

1. Publish the config (Section 1) if you haven't yet.
2. Extend the default class:
   ```php
   namespace App\Models;
   class Project extends \Alexandria\Core\Models\Framework\Project
   {
       public function customAccessor(): string { /* … */ }
   }
   ```
3. Replace the binding in your `config/alexandria.php`:
   ```php
   'models' => [
       'project' => \App\Models\Project::class,
   ],
   ```

Where to call into the resolver in your own code:

```php
$projectClass = config('alexandria.models.project');
$project = $projectClass::create(['name' => 'New project']);
```

Any model not listed under `'models'` falls back to its default class.

The full list of resolvable keys is at the top of `config/alexandria.php`. Add a new one when extending a model that isn't yet in the list — pull requests welcome.

---

## 3. Overriding a React/Inertia page

Core ships every UI surface as an Inertia page under `vendor/lonely-lights/alexandria-core/resources/js/pages/`. The consumer app's `resources/js/app.tsx` resolves a page by name in this order:

1. **Local override** — `resources/js/pages/<Name>.tsx` in the consumer app
2. **Core default** — `vendor/lonely-lights/alexandria-core/resources/js/pages/<Name>.tsx`

To override `Auth/Login`, drop a file at `resources/js/pages/Auth/Login.tsx`. Vite's `import.meta.glob` picks it up automatically; no Inertia config edit, no re-export stub.

The pattern works because both globs are wired in `app.tsx`:

```ts
const localPages = import.meta.glob('./pages/**/*.tsx');
const corePages  = import.meta.glob(
    '../../vendor/lonely-lights/alexandria-core/resources/js/pages/**/*.tsx',
);

resolve: (name) => {
    const localKey = `./pages/${name}.tsx`;
    const coreKey  = `../../vendor/lonely-lights/alexandria-core/resources/js/pages/${name}.tsx`;
    const importer = localPages[localKey] ?? corePages[coreKey];
    if (!importer) throw new Error(`Page not found: ${name}`);
    return importer().then(m => m.default);
},
```

This is the recommended override pattern. **Do not** vendor-publish core pages — copies fall out of sync. **Do** drop a same-named file in the consumer.

---

## 4. Overriding a layout, component, or hook

Core's React surface uses path aliases:

- `@alexandria/layouts/AppLayout` → `vendor/lonely-lights/alexandria-core/resources/js/layouts/AppLayout.tsx`
- `@alexandria/components/ui/*` → `vendor/lonely-lights/alexandria-core/resources/js/components/ui/*`
- `@alexandria/hooks/*` → `vendor/lonely-lights/alexandria-core/resources/js/hooks/*`

Imports in core's pages resolve through these aliases. If you need a different `AppLayout`, the cleanest pattern is to override the *page* (Section 3) and have your local copy import from `@/layouts/AppLayout` instead — that gives you a layout file under your direct control without disturbing core.

The placeholder alias `@alexandria/components/ui/Logo` is wired in `vite.config.ts` + `tsconfig.json` as a precedent: it points at `resources/js/components/ui/Logo.tsx` in the consumer rather than core, so consumer's brand mark always wins. Same shape applies to anything else you want to slot in — add the override path to the alias map.

---

## 5. Overriding Fortify auth views

Core auto-registers Fortify with an Inertia-aware view layer (`Auth/Login`, `Auth/Register`, `Auth/ForgotPassword`, etc.). Each view is registered via `Fortify::loginView(fn () => Inertia::render('Auth/Login', [...]))` inside core's `AlexandriaServiceProvider::bindFortifyViews()`.

To replace one, override the page (Section 3). Core's view registration passes the view name; Inertia resolves it through the page resolver, which honors the local override.

To replace the entire flow (e.g., custom routes, alternate provider), override Laravel Fortify from the consumer app's own config/provider layer and unregister core's view bindings by extending `AlexandriaServiceProvider` and skipping the `bindFortifyViews()` call. This is the heavier path — most consumers should override individual pages.

---

## 6. Service-provider extensions

Core's `AlexandriaServiceProvider` registers:

- The migrations from `vendor/lonely-lights/alexandria-core/database/migrations`
- The auth routes from `vendor/lonely-lights/alexandria-core/routes/auth.php`
- Fortify view + action bindings
- The publishable `config/alexandria.php`

If you need to bind your own services on top of what core registers (e.g., a custom credential resolver, a different prompt repository), do so in your app's `AppServiceProvider::register()`. Laravel's container resolves the most-recently-bound implementation, so a later binding wins:

```php
// AppServiceProvider::register()
$this->app->bind(
    \Alexandria\Core\Services\AI\Prompts\PromptService::class,
    \App\Services\AI\Prompts\TenantAwarePromptService::class,
);
```

---

## 7. Registering a writing workspace sidebar mode

Core's writing workspace right-rail ships three built-in modes (Linked items, Notes, Comments). Sibling packages — such as `lonely-lights/alexandria-craft` — can contribute additional modes that appear after the built-ins in the mode switcher.

### API

```ts
import {
    registerSidebarModes,
    type RegisteredSidebarMode,
    type SidebarModeContext,
} from '@alexandria/pages/Writing/sidebarModeRegistry';

// Call once at package boot (e.g. from the package's setup file or
// the entry-point imported by the consumer app's app.tsx):
registerSidebarModes([
    {
        id: 'craft',
        labelKey: 'craft.panel.title',    // bag-key form: group 'craft', key 'panel.title'
        icon: 'fa-solid fa-pen-nib',
        component: CraftSidebarPanel,     // ComponentType<SidebarModeContext>
        requires: { entitlement: 'craft_suite' },  // optional gate
    },
]);

// Translation keys use the flat bag-key form ('craft.panel.title'), not the
// Laravel package namespace ('craft::panel.title'). The host app wires the
// package's lang group into the shared Inertia bag in HandleInertiaRequests
// (e.g. adding 'craft' => trans('craft::craft') to the translations array),
// after which useT() resolves 'craft.*' keys exactly like any app key.
```

`registerSidebarModes` is idempotent by `id` — calling it multiple times with the same id is safe (first registration wins). Multiple packages may each call it at boot; they accumulate in order.

### Context

Your component receives `SidebarModeContext`:

| Prop | Type | Description |
|---|---|---|
| `project` | `{ id, name, slug }` | The active project. |
| `work` | `{ id, title, slug }` | The active work. |
| `currentSection` | `{ id, title, slug } \| null` | The section open in the editor, or `null`. |
| `editorBridge` | `WritingEditorBridge \| null` | Live editor API — use for reading/manipulating doc content. |
| `editorTick` | `number` | Bumped on every editor transaction so your component can re-read the bridge. |
| `canUpdate` | `boolean` | Whether the current user has write permission on the work. |

### Entitlement gating

The `requires` field on a registered mode follows the same rules as ribbon controls (see `ribbonGates.ts`):

- `requires.permission` falsy → button is **hidden** from the switcher.
- `requires.entitlement` not held → button is **disabled** with a padlock badge and a "Available in the store" tooltip (same locked treatment as ribbon controls).
- Both checks pass (or no `requires`) → button is **visible** and active.

A user whose entitlement is revoked will see the mode button locked after their next page navigation (entitlements travel via Inertia shared props, which refresh on server-driven visits — not live mid-session); their previously persisted mode preference resets to `'linked'` on the next workspace load. Note this is CLIENT-SIDE packaging, not a security boundary — gate any server data your mode fetches separately.

Register modes synchronously at package boot (a module-level call in the entry your consumer app imports). Deferred/async registration still adds the button when it lands, but the user's persisted mode preference falls back to `'linked'` for that session because the preference is validated once at workspace mount.

### Persistence

The workspace persists the active mode to `localStorage` per work. If a user has mode `'craft'` persisted but opens the workspace without the `craft_suite` entitlement, `normalizePanelMode` silently falls back to `'linked'` — no stale or broken state.

### Ribbon value controls: `'select'` and `'combo'`

Custom ribbon tabs (registered through `registerRibbonTabs`) can declare two
kinds of value control. `'select'` is the classic picker. `'combo'`
(added 2026-08-09 for the manuscript font-size control) is a Word-style
combo box: an editable value field plus a separate arrow button that alone
opens the preset list. `onAction(ctx, raw)` receives typed values as well as
picked presets — the HOST owns clamping/validation; the framework stays dumb.
Both controls derive their disabled state, resolved option labels, and
shortcut tooltip from the shared `useRibbonControlMeta` hook, so a third
value control should consume it too. In the collapsed tab-menu rendering a
combo degrades to its preset submenu.

### The sheet footprint (`.alex-sheet-footprint`)

Anything that must sit edge-aligned with the manuscript paper — the
continuous flow's begin-writing CTA, the proportional ruler's strip — wears
`.alex-sheet-footprint` (defined in `resources/css/components/manuscript.css`)
instead of restating the sheet's width expression. Consumer surfaces that
render inside the workspace and want paper alignment should do the same;
duplicated width math is exactly how the sheet and its furniture drift apart.

---

## 8. URL segments (the `urls` Inertia share)

Every project-scoped surface lives under `/p/{project-slug}/…`, and the literal
word after the slug — `pages`, `images`, `ai`, `notes`, `writing`, `works`,
`capture` — is the host app's to name. A wiki-flavored consumer can serve
`/p/atlas/wiki/character/mira`; a screenwriting one can serve
`/p/atlas/scripts/…`. Route **names** never change, only paths.

### The contract

The host owns a segment map and hands it to core twice: once to Laravel (route
prefixes) and once to the frontend (the `urls` Inertia share).

```php
// config/urls.php — the host's map. Each key defaults to its own name.
return [
    'segments' => [
        'pages' => 'pages',
        'images' => 'images',
        'ai' => 'ai',
        'notes' => 'notes',
        'writing' => 'writing',
        'works' => 'works',
        'capture' => 'capture',
    ],
];
```

```php
// routes/web.php — routes read the map, so the path moves and the name stays.
Route::prefix(config('urls.segments.pages'))->group(function () {
    Route::get('{blueprint:slug}/{entry:slug}', [EntryController::class, 'show'])
        ->name('entries.show');
});
```

```php
// HandleInertiaRequests::share() — the same map, handed to the frontend.
'urls' => config('urls.segments'),
```

```tsx
// app.tsx setup() — install it into core's builders once at boot.
import { configureUrls, type UrlSegments } from '@alexandria/lib/urls';

configureUrls((props.initialPage.props as { urls?: Partial<UrlSegments> }).urls);
```

### Core's side: `lib/urls.ts`

Core builds every project-scoped URL through `@alexandria/lib/urls` —
`projectUrl`, `pagesBase`, `pageUrl`, `newBlueprintUrl`, `newEntryUrl`,
`entryEditUrl`, `imagesUrl`, `newImageUrl`, `aiBase`, `aiUrl`, `workbenchUrl`,
`notesUrl`, `writingUrl`, `worksBase`, `workUrl`, `captureUrl`, plus the two
fixed-word helpers `recycleBinUrl` and `projectSearchUrl`. The module is
deliberately Inertia-free: it holds a module-level segment map that
`configureUrls()` installs, which keeps it unit-testable and usable from plain
fetch helpers and event handlers as well as components.

`configureUrls()` resets to the defaults before merging, so a **partial** map
leaves untouched keys at their default word, and calling it with no argument
restores a pristine state (which is what core's own tests do). An unconfigured
host still builds valid URLs — every default is its own key.

Two segments are **not** configurable: `recycle-bin` and `search`. They are
fixed words under `/p/{slug}/`, and route registration order matters — literal
segments must register before `{blueprint:slug}`-style bindings, or the literal
gets swallowed as a slug.

### Renaming a segment

1. Edit the word in `config/urls.php`.
2. `php artisan config:clear` — the route prefixes read cached config.
3. `npm run build` — Wayfinder output and the bundled frontend both bake in the
   old word until they are regenerated.

Server and client are then in agreement by construction: both read the same
map, and nothing in core hard-codes a segment word. Consumers should keep a
test that asserts the config map and the registered routes still agree — the
reference app does this in `tests/Feature/Routing/UrlSegmentAgreementTest.php`.

---

## 9. Registering a blueprint settings section

The blueprint settings modal (`Blueprints/Sections/modals/BlueprintSettingsModal.tsx`) ships a left nav of built-in panels grouped under **General**, **Data**, and **Display**. A consumer app can append its own nav item + right-hand pane without forking the modal.

This mirrors the two existing frontend registries — `registerEntryShowSlots` (`pages/Entries/entryShowSlots.ts`) and `registerSettingsSlots.extraNav / extraSections` (`pages/Settings/settingsCache.ts`) — same register/get/reset shape, same "the consumer calls it once at boot" lifecycle.

### API

```ts
import {
    registerBlueprintSettingsSlots,
    type BlueprintSettingsSlotContext,
} from '@alexandria/pages/Blueprints/Sections/modals/settings/blueprintSettingsSlots';

registerBlueprintSettingsSlots({
    extraSections: [
        {
            key: 'image-training', // must not collide with a built-in key
            icon: 'fa-solid fa-clapperboard',
            labelKey: 'images.workbench.template.nav', // resolved with useT()
            navGroup: 'data', // 'general' | 'data' | 'display' (default 'data')
            isAvailable: (blueprint) => blueprint.classification === 'standard',
            component: ImageTrainingTemplateSection,
        },
    ],
});
```

### Context

The section component receives `{ blueprint, project, pageProps, onClose }`. `pageProps` is the host page's Inertia props verbatim, for sections whose own controller shared data; most sections are self-contained and fetch their own payload instead, so core never has to widen the blueprint page contract.

### Design fidelity

A registered section owns its whole right pane. Import the same primitives the built-ins use so the chrome matches exactly:

```ts
import PanelHeader from '@alexandria/pages/Blueprints/Sections/modals/settings/PanelHeader';
import SettingsActivationToggle from '@alexandria/pages/Blueprints/Sections/modals/settings/SettingsActivationToggle';
import { footerDividerStyle, helperStyle } from '@alexandria/pages/Blueprints/Sections/modals/settings/settingsPanelStyles';
```

The built-in shape is `<><PanelHeader …/><div className="flex-1 overflow-y-auto p-5">…</div><footer/></>`.

### Collisions and gating

Keys that match a built-in panel (`columns`, `main`, `settings`, `ai`, `theme`, `media`, `fields`, `relationships`, `infobox`, `display`, `timeline`, `kanban`, `tree`, `graph`) lose — the built-in renders and the registered section never does. `isAvailable` hides the nav item entirely for blueprints the section does not apply to.

---

## 10. Registering an entry page tab

The entry show page (`pages/Entries/Show.tsx`) pins its own tabs — Overview, Structure, Timeline, Connections — and buries the rest in the 3-dot "More options" dropdown. A consumer app can contribute a whole tab of its own: a button in that bar and a body in the content switch, hash-routed like every built-in tab.

This is the fifth member of the entry-page registry family (`pageImageManager`, `editPageImageManager`, `headerActions`, `menuActions`, `extraTabs`) and the first that contributes page-level *navigation* rather than an action or a card.

### API

```ts
import { registerEntryShowSlots } from '@alexandria/pages/Entries/entryShowSlots';
import type { EntryShowSlotContext } from '@alexandria/pages/Entries/entryShowSlots';

registerEntryShowSlots({
    extraTabs: [
        {
            key: 'image-training', // hash fragment + React key
            label: 'images.workbench.entry_tab.label', // resolved with useT()
            icon: 'fa-solid fa-person-rays',
            isAvailable: ({ blueprint }) => blueprint.slug === 'character',
            component: ImageTrainingTab,
        },
    ],
});
```

### Position

Registered tabs render AFTER core's own pinned tabs and BEFORE the 3-dot dropdown, so an app tab never displaces the established order of core's chrome.

### Self-gating

Two layers, both the consumer's:

- `isAvailable(context)` hides the **button**. Core cannot know whether an app tab applies to a given blueprint, and unlike a `menuActions` row the button is core's own markup — returning null from the component cannot remove it. Omitted means always shown.
- The **component** returns `null` for anything it will not render, exactly like `headerActions` / `menuActions` components do.

### Hash routing

`key` is the URL hash written while the tab is active (`#image-training`) and the value accepted from the hash — on load, and on every later `hashchange`. It must not collide with a core tab key (`overview`, `structure`, `attributes`, `relationships`, `connections`, `mentions`, `mentioned_in`, `media`, `history`, `timeline`) — a collision loses, because the content switch renders core's own tabs first.

Because the page reads the hash back as well as writing it, `window.location.hash = 'image-training'` from anywhere on the entry page activates the tab, and the browser's back/forward buttons move between tabs.

A hash that names no tab is left alone: the page keeps whatever tab is open rather than falling back to Overview, so an in-page anchor or a placeholder link elsewhere on the entry page cannot knock the reader off the tab they are on. An EMPTY hash is still Overview — that is the hash the page itself writes for Overview, and reading it back is what makes Back out of a tab work.

### Tabs with no button: `hideFromTabBar`

Set `hideFromTabBar: true` and the tab contributes no button to the bar at all — not even while it is the active tab. Everything else is unchanged: the hash still routes to it, and the content switch still renders its component.

```ts
registerEntryShowSlots({
    extraTabs: [
        {
            key: 'image-training',
            label: 'images.workbench.entry_tab.label',
            icon: 'fa-solid fa-person-rays',
            isAvailable: ({ blueprint }) => blueprint.slug === 'character',
            hideFromTabBar: true,
            component: ImageTrainingTab,
        },
    ],
});
```

Use it when the feature already has a door somewhere better — a `menuActions` row, a link on a card — and a second, permanently-visible entrance in core's chrome would only be noise. The consumer's own affordance then does the navigating:

```tsx
<button onClick={() => (window.location.hash = 'image-training')}>…</button>
```

`label` and `icon` are still required, and still worth setting honestly: they are what a future surface (a jump list, a command palette entry) would show, and `label` is the string a test asserts is absent from the bar.

### Context

The component receives the same `EntryShowSlotContext` every other entry slot gets: `{ project, blueprint, entry, pageProps }`. `pageProps` is the entry page's Inertia props verbatim. A tab whose data core does not ship fetches its own payload from a consumer-owned endpoint rather than expecting core to widen the entry page contract.

---

## 11. What's *not* an extension point yet

The following are deliberately out of scope for `v0.1.0`. They'll likely become extension points in a later minor version, but for now consumers either copy + modify the relevant files into their own app or vendor-fork:

- **Field type registry.** Custom EAV field types (the Stardate field, mood ring, etc.) currently require contributing back to core. A registry contract is on the roadmap.
- **Multi-theme system.** A per-user / per-blueprint / per-entry theme cascade is `#55` on the alexandria-app task list, scheduled post-`v0.1.0`.
- **Auto-generated page re-export stubs.** The current page-resolver glob pattern (Section 3) covers all known cases. If a consumer wants a stub-based override surface (à la Filament's vendor:publish), it can be added at the installer stage.
- **Per-tenant config injection.** Single-tenant first; multi-tenancy can be layered on top via standard Laravel patterns (subdomain middleware + scoped config).

---

## Tracking what you've overridden

Run `php artisan vendor:publish --provider="Alexandria\Core\AlexandriaServiceProvider" --pretend` to see every publishable artifact core exposes. Each tag (`alexandria-config`, `alexandria-translations`) is independent — publish only what you intend to override, leave the rest pulling from the package.

Core seeders are package classes and are meant to be invoked directly from the consumer app's `DatabaseSeeder`; there is no `alexandria-seeders` publish tag in the current installer surface.

If you find yourself needing to fork-and-edit a core file that isn't covered by the points above, that's a signal to open an issue on `lonely-lights/alexandria-core` — extension points exist precisely so consumers don't have to maintain forks.
