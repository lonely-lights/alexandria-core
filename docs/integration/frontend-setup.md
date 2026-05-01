# Frontend integration

> **Status:** Stage 1 / FE-F2 complete. Path-alias plumbing, the
> framework-generic TypeScript surface (types, lib utilities, config
> registries, generic hooks), the theme system (FE-C), the stateless
> UI + form primitives (FE-D), the navigation chrome + layout shell
> (FE-E — `AppLayout`, `Navbar`, `Sidebar`, `BottomNav`,
> `CommandPalette`, `ThemePicker`, `useCmdK`), the Fortify auth pages
> (FE-F1), the rich-text editor surface (FE-H — `RichTextEditor`,
> `AiWritingModal`, `tiptap-bio-editor/` subtree), and the Account
> Settings page + six framework-generic sections (FE-F2 — `Account`,
> `ProfileSection`, `PreferencesSection`, `LinksSection`,
> `AiSections`, `PrivacySections`) are now in place.
> Consumers do not need to revisit this recipe — the alias keeps
> working as core grows; install the additional peer deps below as
> new primitives land. No new peer deps at FE-F2.

`alexandria-core` ships TypeScript and React components alongside the
PHP package, under `resources/js/`. Composer packages cannot publish to
npm, so consumer Laravel apps reach into `vendor/lonely-lights/alexandria-core/resources/js/`
directly via a path alias. This document is the canonical recipe.

The reference implementation lives in [`alexandria-app`](https://github.com/lonely-lights/alexandria-app)
— if anything below diverges from that app's `vite.config.ts` /
`tsconfig.json` / `resources/css/app.css`, the app is the source of
truth.

---

## What you need

- **Vite 8+** (Laravel 13's default scaffold)
- **Tailwind CSS 4** with `@tailwindcss/vite`
- **DaisyUI 5.5.19+** (v5 is Tailwind-4 native; v4 will not work)
- **TypeScript** with `moduleResolution: bundler` or `node16`+
- **`@vitejs/plugin-react`** plus React 19+

`alexandria-core` itself does not ship a `package.json` — versions are
the consumer app's responsibility. The combinations above are what the
extraction was tested against.

---

## Required peer dependencies

`alexandria-core`'s TypeScript surface imports a handful of npm packages
that the consumer app must install. Versions below match what legacy was
tested against and are the floor we recommend; newer minors should be
backwards-compatible.

| Package | Used by | Recommended version |
|---|---|---|
| `react` | hooks, `lib/hoverPosition` (React.CSSProperties) | `^19.2.4` |
| `react-dom` | `Modal`, `DropdownMenu`, `ToastProvider` (`createPortal`) | `^19.2.4` |
| `@types/react-dom` (dev) | type-checking `createPortal` | `^19.2.0` |
| `@inertiajs/react` | `types/index.d.ts` (PageProps declaration merge), `ToastProvider` (`usePage`) | `^2.3.18` |
| `@floating-ui/react` | `Tooltip` (positioning + interactions) | `^0.27.19` |
| `@headlessui/react` | `components/navigation/Sidebar` (Transition mount/unmount) | `^2.2.9` |
| `clsx` | `lib/utils.ts` (`cn` helper) | `^2.1.1` |
| `gsap` | `hooks/useEnterAnimation`, `Modal`, `HeroRotator`, `CommandPalette` | `^3.14.2` |
| `sortablejs` | `hooks/useSortableReorder` | `^1.15.6` |
| `@types/sortablejs` (dev) | type-checking `useSortableReorder` | `^1.15.9` |
| `@tiptap/core` | `RichTextEditor`, `tiptap-bio-editor/extensions/entry-link`, `tiptap-bio-editor/utils/wiki-serializer` | `^3.14.0` |
| `@tiptap/react` | `RichTextEditor` (`useEditor`, `EditorContent`) | `^3.20.5` |
| `@tiptap/starter-kit` | `RichTextEditor` | `^3.14.0` |
| `@tiptap/extension-link` | `RichTextEditor` | `^3.14.0` |
| `@tiptap/extension-mention` | `tiptap-bio-editor/extensions/mention` | `^3.14.0` |
| `@tiptap/extension-placeholder` | `RichTextEditor` | `^3.14.0` |
| `@tiptap/extension-underline` | `RichTextEditor` | `^3.14.0` |
| `@tiptap/pm` | `tiptap-bio-editor/extensions/entry-link` (`Plugin`, `PluginKey`) | `^3.14.0` |
| `@tiptap/suggestion` | transitive peer of `@tiptap/extension-mention`'s `suggestion` plugin | `^3.14.0` |

`RichTextEditor` and the `tiptap-bio-editor/` subtree call several
backend endpoints — consumer apps must expose these (or override the
endpoint via the relevant prop):

- `POST /api/v1/ai/write` — AI writing-assistant action when
  `enableAi` is set. Body `{ action, text, prompt, project_id,
  instruction_id }`, response `{ result: string }` (wiki markup).
- `GET /api/v1/users/search?q=…&limit=…` — `@mention` autocomplete.
  Override via the `mentionSearchEndpoint` prop.
- `GET /api/v1/entries/search?q=…&limit=…&project_id=…` —
  `[[entry-link]]` autocomplete (when entry-links are enabled via
  the `createEntryLinkExtension` factory).
- `GET`/`POST`/`DELETE` `/api/v1/ai/prompts[/{id}]` — saved-prompt
  CRUD used by the AI writing modal.

The Account Settings page (`pages/Settings/Account.tsx`, FE-F2) hits a
broader set of `/account/*` routes — consumer apps should expose the
following Fortify-paired surface alongside Fortify's own auth routes:

- `PUT /account/profile` — profile fields incl. bio (HTML/wiki markup
  from `RichTextEditor`).
- `PUT /account/username`, `POST /account/username/check`,
  `POST /account/username/revert` — username change + availability
  check + revert recent change.
- `POST/DELETE /account/avatar`, `POST/DELETE /account/banner` —
  media upload / removal (Spatie Media Library payload).
- `PUT /account/avatar-ring` — avatar-ring decoration selection.
- `PUT /account/preferences` — bulk + partial preference updates
  (theme, font size, notifications, accessibility).
- `POST/PUT/DELETE /account/links[/{id}]` — profile-link CRUD.
- `PUT /account/field-visibility` — field-level privacy.
- `POST/PUT/DELETE /account/privacy-lists[/{id}]` — privacy lists CRUD.
- `POST/PUT/DELETE /account/ai/keys[/{id}]` — BYOK API-key CRUD,
  paired with core's `CredentialResolver` + `UserApiKey` model.
- `POST /account/ai/keys/validate` — pre-save provider key validation.
- `PUT /account/ai/keys/{id}/activate` — activate a stored key.
- `PUT /account/ai/models` — per-task model selection (analyst /
  creative / image / video).
- `PUT /account/ai/preferences` — AI response style + assistant flags.

The Settings page deliberately does **not** ship email-change,
password-change, or account-deletion UI in core — those flows often
need to interleave with billing, paid-tier reactivation, or app-
specific data-handling flows, which are SaaS concerns per ADR-010.
Consumer apps render their own AccountManagementSection by passing
an `accountManagementSlot` render-prop:

```tsx
import Account from '@alexandria/pages/Settings/Account';
import AccountManagementSection from '@/components/Settings/AccountManagementSection';

export default function Settings() {
    return (
        <Account
            accountManagementSlot={({ email, emailVerified }) => (
                <AccountManagementSection email={email} emailVerified={emailVerified} />
            )}
            applyViewPreferences={(prefs) => {
                // Mirror onto <html> as data-* attributes for optimistic UI.
                // Implementation lives APP-side (FE-B audit / ADR-008).
            }}
        />
    );
}
```

When the slot is omitted, the `account` sub-section renders a
"managed by the consumer app" placeholder. The app is expected to
own `PUT /account/email`, `PUT /account/password`, and any
account-deletion endpoint it exposes.

Notes on what core deliberately does **not** depend on:

- **No `tailwind-merge`.** `cn()` is just `clsx`. DaisyUI's component
  classes generally don't conflict with Tailwind utilities, so the
  added merge step isn't worth the bundle cost. Consumers that want
  Tailwind class-conflict resolution can wrap or replace `cn` in their
  own app code.
- **No `dayjs`.** `formatDate()` uses native `Intl.DateTimeFormat` —
  zero runtime dependency.
- **No `@dnd-kit/*`.** `useSortableReorder` is a thin SortableJS
  wrapper, not a dnd-kit hook. SortableJS is smaller and the existing
  reorder UX is built around it.

---

## 1. Vite alias

Add `@alexandria` to `resolve.alias` in your `vite.config.ts`:

```ts
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [/* … laravel(), react(), tailwindcss(), … */],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'resources/js'),
            '@alexandria': resolve(
                __dirname,
                'vendor/lonely-lights/alexandria-core/resources/js',
            ),
        },
    },
});
```

The standard Laravel `@/*` alias is preserved alongside it. From the
consumer's code, `import Foo from '@alexandria/components/Foo'`
resolves to `vendor/lonely-lights/alexandria-core/resources/js/components/Foo.tsx`.

## 2. tsconfig path

Mirror the alias under `compilerOptions.paths` so the editor and
`tsc --noEmit` resolve `@alexandria/*` the same way Vite does:

```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["./resources/js/*"],
            "@alexandria/*": ["./vendor/lonely-lights/alexandria-core/resources/js/*"]
        }
    }
}
```

## 3. Tailwind 4 source scanning

Tailwind 4 needs to know that core's component files exist, otherwise
the utility classes those components use will not be included in the
final bundle. Add a fourth `@source` directive to your `app.css`
alongside the standard ones:

```css
@import 'tailwindcss';

@source '../views';
@source '../../vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php';
@source '../../vendor/lonely-lights/alexandria-core/resources/js/**/*.{ts,tsx}';
```

The path is relative to the `app.css` location — adjust if your CSS
entrypoint is elsewhere.

## 4. DaisyUI 5

Install:

```bash
npm install -D daisyui@^5.5.19
```

Register it in `app.css` via Tailwind 4's `@plugin` directive (DaisyUI 5
no longer touches `tailwind.config.js`):

```css
@plugin "daisyui/index.js" {
    themes: light --default, dark --prefersdark, tf-light, tf-dark;
}
```

> **Vite-8 / rolldown workaround.** The bare `@plugin "daisyui"` form
> the DaisyUI docs show currently crashes under Vite 8 + rolldown's
> Node ESM resolver, with `ERR_UNKNOWN_FILE_EXTENSION` on
> `daisyui.css`. DaisyUI 5's `package.json` declares
> `"browser": "./daisyui.css"`, and rolldown picks up that condition
> when loading the plugin. Pointing at the JS entry directly
> (`daisyui/index.js`) sidesteps the resolution. Same applies to
> `daisyui/theme/index.js` below.
>
> Tracked upstream: [vitejs/vite#22323](https://github.com/vitejs/vite/issues/22323)
> (Closed — maintainers consider it a DaisyUI package-exports issue.)
> Drop the `/index.js` suffix once either Vite reverts the resolver
> behavior or DaisyUI ships a fix to its `browser`/`main`/`exports`
> fields.

The `--default` and `--prefersdark` modifiers replace DaisyUI 4's
`darkTheme:` and the boolean-flagged theme objects. Built-in `light`
and `dark` are included by name; custom themes are declared separately
via `@plugin "daisyui/theme/index.js"`:

```css
@plugin "daisyui/theme/index.js" {
    name: "tf-dark";
    default: false;
    prefersdark: false;
    color-scheme: dark;

    --color-base-100: #1c1416;
    --color-primary: #ffd166;
    /* … etc */

    --radius-selector: 0.5rem;
    --radius-field: 0.625rem;
    --radius-box: 1rem;
    --border: 1px;
    --depth: 1;
    --noise: 0;
}
```

Notes on the DaisyUI 4 → 5 token rename, in case you are porting an
existing DaisyUI 4 config:

| DaisyUI 4 | DaisyUI 5 |
|---|---|
| `'primary': '#hex'` | `--color-primary: #hex;` |
| `'base-content': '#hex'` | `--color-base-content: #hex;` |
| `'--rounded-box': '1rem'` | `--radius-box: 1rem;` |
| `'--rounded-btn': '0.5rem'` | `--radius-field: 0.5rem;` |
| `'--rounded-badge': '1.9rem'` | `--radius-selector: 1.9rem;` |
| `'--border-btn': '1px'` | `--border: 1px;` |
| `'--btn-text-case'`, `'--btn-focus-scale'`, `'--animation-btn'`, `'--tab-*'`, `'--navbar-padding'` | dropped — DaisyUI 5 controls these via component classes |

Custom non-DaisyUI variables (e.g. `--tf-pencil`, `--tf-paper-cream`)
can stay as-is; they are passed through unchanged.

`alexandria-core` does not require any specific theme set — consumers
override or extend the example above as needed. Components shipped by
core only depend on standard DaisyUI semantic tokens (`primary`,
`base-100`, `base-content`, etc.) so any v5-conformant theme works.

---

## Verification

Once FE-B has shipped some content and you have wired all four pieces
above, this import should resolve in your IDE and at build time:

```ts
import { cn } from '@alexandria/lib/utils';
```

If it does not:

1. **Editor only fails** → check `tsconfig.json` `paths` (and restart
   the TS server in your editor).
2. **Build fails** → check `vite.config.ts` `resolve.alias`. Make sure
   you ran `composer install` so the path actually exists.
3. **Build succeeds but classes missing** → check the fourth
   `@source` directive. Tailwind silently skips paths that do not
   exist or yield no files.
4. **DaisyUI components unstyled** → confirm `daisyui@^5.5.19` is in
   `package.json` and the `@plugin "daisyui"` directive is at the top
   of `app.css`, after `@import 'tailwindcss';`.
