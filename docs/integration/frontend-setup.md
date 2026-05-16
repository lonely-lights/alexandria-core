# Frontend integration

> **Status:** Stage 1 frontend extraction complete (FE-A through
> FE-H all merged). Path-alias plumbing, the framework-generic
> TypeScript surface (types, lib utilities, config registries,
> generic hooks), the theme system (FE-C), the stateless UI + form
> primitives (FE-D), the navigation chrome + layout shell (FE-E —
> `AppLayout`, `Navbar`, `Sidebar`, `BottomNav`, `CommandPalette`,
> `ThemePicker`, `useCmdK`), the Fortify auth pages (FE-F1), the
> rich-text editor surface (FE-H — `RichTextEditor`,
> `AiWritingModal`, `tiptap-bio-editor/` subtree), the Account
> Settings page + six framework-generic sections (FE-F2 — `Account`,
> `ProfileSection`, `PreferencesSection`, `LinksSection`,
> `AiSections`, `PrivacySections`), and the media library UI
> (FE-G — `MediaSection`, `ImageUploader`, `GalleryGrid`,
> `MediaMetadataForm`, `BannerPreview`, `CropModal`) are all in
> place. Consumers do not need to revisit this recipe — the alias
> keeps working as core grows; install the additional peer deps
> below as new primitives land. FE-G adds one peer dep
> (`cropperjs`).

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
- **TypeScript** with `moduleResolution: bundler` or `node16`+
- **`@vitejs/plugin-react`** plus React 19+

> **Stage 7.1 note:** DaisyUI was removed in Stage 7.1 (closed 2026-05-15). Theme tokens (`--theme-*`) ship from core's `resources/css/app.css` via the `@source` directive below. No DaisyUI install or plugin registration is needed.

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
| `cropperjs` | `components/media/CropModal` (image crop interaction) | `^2.1.0` |

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

The media library UI (`components/media/`, FE-G) wraps Spatie Media
Library and assumes a per-model REST surface keyed by a polymorphic
`{modelType}` slug — one of `projects`, `blueprints`, `entries`
(see `MediaModelType` in `types/media.ts`; consumer apps that want
to expose other owners should extend the union). The components
hit:

- `GET /api/v1/{modelType}/{modelId}/media` — list of
  `MediaItem[]` for the owner. Used by `MediaSection` on mount /
  refresh.
- `POST /api/v1/{modelType}/{modelId}/media/{collection}` —
  multipart upload with `image` + `alt_text` + optional `caption`.
  `{collection}` is one of `page_image`, `banner`, `gallery`.
  Returns `201` with the new `MediaItem` JSON.
- `PUT /api/v1/{modelType}/{modelId}/media/{mediaId}` — metadata
  update (`alt_text`, `caption`). Used by `MediaMetadataForm`.
- `PUT /api/v1/{modelType}/{modelId}/media/{mediaId}/crop` —
  apply crop with `{ x, y, width, height }` in source pixels.
  Used by `CropModal`.
- `POST /api/v1/{modelType}/{modelId}/media/{mediaId}/promote` —
  promote a gallery image into the `page_image` or `banner`
  collection (`{ target: 'page_image' | 'banner' }`). Used by
  `GalleryGrid` for in-place re-assignment.
- `DELETE /api/v1/{modelType}/{modelId}/media/{mediaId}` —
  remove a media item. Used by `BannerPreview`, `GalleryGrid`,
  and `MediaSection`.

The PHP side of this contract is owned by the consumer app —
core ships the `HasAlexandriaMedia` trait (Spatie wrapper with
the `page_image`, `banner`, `gallery` collections + standard
conversions), but routes / controllers / form-request validation
live in the consuming application.

Notes on what core deliberately does **not** depend on:

- **No `tailwind-merge`.** `cn()` is just `clsx`. Core's `alex-*`
  component classes are scoped utilities, not Tailwind shortcuts —
  conflicts with raw Tailwind utilities are rare. Consumers that want
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

## 4. Theme tokens

Core ships its theme system as plain CSS custom properties on
`<html>`, keyed by a `data-theme` attribute. The token catalog lives
in core's `resources/css/app.css` and is reachable by the consumer
through the `@source` directive registered in Section 3.

Token families consumers can rely on:

- `--theme-base-*` — page/surface backgrounds, text colors, neutral
  ramps
- `--theme-brand-primary-*`, `--theme-brand-secondary-*`,
  `--theme-brand-accent-*` — per-theme brand palette
- `--theme-status-{success,info,warning,error}-{fill,stroke,subtle,content}` —
  status colors
- `--theme-radius-{input,button,card,badge}` — corner radii
- `--theme-motion-{duration,easing}-*` — animation primitives
- `--theme-typography-{heading,body}-family` — font stacks

Default themes ship with core (`tf-dark`, `tf-light`). The
`ThemeProvider` (`@alexandria/hooks/useTheme`) writes `data-theme` on
`<html>` and persists user choice to localStorage + the server.

Consumers add their own theme by emitting a `:root[data-theme='your-name']`
block in their own CSS that overrides the same `--theme-*` token names —
no plugin registration, no build-step config:

```css
/* resources/css/app.css */
@import 'tailwindcss';

@source '../views';
@source '../../vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php';
@source '../../vendor/lonely-lights/alexandria-core/resources/js/**/*.{ts,tsx}';

:root[data-theme='your-brand'] {
    --theme-base-page: #f5f0e8;
    --theme-base-content: #2b1d0f;
    --theme-brand-primary-500: #c54f3e;
    /* …override only the tokens you care about; rest fall through to defaults shipped in core's app.css */
}
```

> **Why no DaisyUI?** Through Stage 7.0 alexandria-core shipped with
> DaisyUI 5 layered on Tailwind 4. Stage 7.1 (closed 2026-05-15)
> removed DaisyUI entirely in favor of native Tailwind + the
> `--theme-*` token system shown above. The motivation was that
> DaisyUI's component classes pinned us to its semantic-token names
> (`primary`, `base-100`, etc.), making per-blueprint / per-entry
> theming work for Stage 8b harder than it needed to be. See the
> Stage 7.1 closeout notes in `alexandria-app/docs/frontend/UI-REFACTOR-PLAN.md`.

Per-blueprint and per-entry theme cascades land in Stage 8b
(`#55` on the alexandria-app task list); the contract above is the
foundation that work composes on top of.

---

## Icon font (Font Awesome)

Alexandria's auth pages use Font Awesome 6 solid classes (`<i class="fa-solid fa-*">`). Consumers register Font Awesome themselves — the framework doesn't pin a license-bound dependency. Pick the path that matches your license.

### Pro via Kit (recommended for Pro consumers)

Font Awesome Pro is only sold through Kit packages now. A Kit is a CDN-hosted bundle you configure in your FA account (which families, which icons, which version). Wire it as a `<script>` in your blade template's `<head>`:

```blade
<link rel="preconnect" href="https://kit.fontawesome.com">
<script src="https://kit.fontawesome.com/YOUR_KIT_ID.js" crossorigin="anonymous"></script>
```

Get the Kit ID from <https://fontawesome.com/account>. Kits include all the FA Pro families you've enabled (solid, regular, light, thin, duotone, sharp-*, etc.) — no per-family CSS imports needed. No `npm install`, no `.npmrc`, no `@import` in `app.css`.

The kit script auto-replaces `<i>` elements with inline SVGs at runtime, so the icon classes in core's auth pages render the same way.

### Free (npm)

```bash
npm install @fortawesome/fontawesome-free@^6
```

In `resources/css/app.css`:

```css
@import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
@import '@fortawesome/fontawesome-free/css/solid.min.css';
```

### Pro (npm)

If you have a Pro license that includes the **npm package** (older licenses — new Pro licenses are kit-only) and prefer self-hosting over the kit CDN, this path requires authenticating against Font Awesome's private npm registry. One-time setup in `.npmrc` (project-local OR `~/.npmrc`):

```
@fortawesome:registry=https://npm.fontawesome.com/
//npm.fontawesome.com/:_authToken=YOUR_FA_PRO_TOKEN
```

(Get the token from <https://fontawesome.com/account>.) **Keep `.npmrc` containing the token out of git** — verify your `.gitignore` covers it.

Install:

```bash
npm install @fortawesome/fontawesome-pro@^6
```

In `resources/css/app.css`:

```css
@import '@fortawesome/fontawesome-pro/css/fontawesome.min.css';
@import '@fortawesome/fontawesome-pro/css/solid.min.css';

/* Optional Pro-only families: */
@import '@fortawesome/fontawesome-pro/css/light.min.css';
@import '@fortawesome/fontawesome-pro/css/thin.min.css';
@import '@fortawesome/fontawesome-pro/css/duotone.min.css';
@import '@fortawesome/fontawesome-pro/css/sharp-solid.min.css';
```

Pro additionally provides `light`, `thin`, `duotone`, and `sharp-*` families. The auth pages only use `fa-solid` so those imports are optional unless the consumer's own pages use the additional families.

### Switching between paths

All three paths expose the same `fa-solid` classes, so switching is just an `app.blade.php` / `app.css` / `package.json` adjustment. No code changes needed in any page. Pro Kit ↔ Pro npm ↔ Free npm all render the FA classes identically.

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
4. **Theme tokens missing / `--theme-*` values resolve to nothing**
   → confirm the `@source` directive in Section 3 points at core's
   `resources/js/**/*.{ts,tsx}` AND that core's `resources/css/app.css`
   has been imported (it ships the default `:root[data-theme='tf-*']`
   blocks). Section 4 above covers theme-token override patterns.
