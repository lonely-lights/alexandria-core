# Frontend integration

> **Status:** Stage 1 / FE-A complete. The path-alias plumbing described
> here is in place; the `resources/js/` directory is scaffolded but not
> yet populated. FE-B onwards lifts the actual TypeScript/React surface
> (types, lib, hooks, components, layouts, pages). Once those land,
> consumers do not need to revisit this recipe — the alias keeps working.

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
> `daisyui/theme/index.js` below. Drop the `/index.js` suffix once
> daisyui or `@tailwindcss/vite` ships a fix.

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
