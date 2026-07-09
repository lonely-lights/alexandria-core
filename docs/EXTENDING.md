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
        labelKey: 'craft::sidebar.mode_label',     // useT key (craft:: lang group)
        icon: 'fa-solid fa-pen-nib',
        component: CraftSidebarPanel,              // ComponentType<SidebarModeContext>
        requires: { entitlement: 'craft_suite' },  // optional gate
    },
]);
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

A user whose entitlement is revoked mid-session will see the mode button locked; their previously persisted mode preference is reset to `'linked'` on next workspace load.

### Persistence

The workspace persists the active mode to `localStorage` per work. If a user has mode `'craft'` persisted but opens the workspace without the `craft_suite` entitlement, `normalizePanelMode` silently falls back to `'linked'` — no stale or broken state.

---

## 8. What's *not* an extension point yet

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
