# Theming

> Stage 8b — landed across M1.A → M4.6 (2026-05-12 → 2026-05-16).

A cascade-aware theme system: every paintable surface in Alexandria
resolves its colors, corners, motion, and typography from a single
`Theme` preset, optionally overridden at four layered scopes. The
override JSON is a sparse `DeepPartial<ThemeTokens>` stored on each
scope's owning model. A resolver walks the cascade once per render and
emits the merged result as CSS custom properties (`--theme-*`) that
every component reads via `var(...)`.

This doc is the operator's manual for anyone landing on the stack
cold — what cascade you're looking at, where each piece lives, and
how to extend it.

---

## The cascade

```
user (account-level)
  ↓
project (per-project: `Project.theme_preset_slug` + `theme_override`)
  ↓
blueprint (per-blueprint: `Blueprint.theme_preset_slug` + `theme_override`)
  ↓
entry (per-entry: `Entry.theme_preset_slug` + `theme_override`)
```

The deepest scope wins. Each layer's override is sparse — leaves the
user hasn't touched fall through to the parent scope.

### Two emission targets — chrome vs content

```
┌──────────────────────────────────────────────┐
│  navbar + sidebar  ← chrome cascade           │
│    (capped at project; blueprint/entry ignored)│
│ ┌────────────────────────────────────────┐    │
│ │                                        │    │
│ │  page main  ← content cascade          │    │
│ │  (full cascade incl. blueprint+entry)  │    │
│ │                                        │    │
│ └────────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

- `[data-theme-target="chrome"]` — applied to `<body>`. Caps the
  cascade at project so the surrounding UI stays consistent as the
  user navigates between entries inside the same project.
- `[data-theme-target="content"]` — applied to `<main>`. Walks the
  full cascade, so per-blueprint and per-entry overrides paint just
  the page body.

The cap is structural — `resolveChromeTheme()` literally drops
`blueprint` and `entry` from its input type. Passing them through has
no effect; the type system reflects the runtime guarantee.

---

## Where the pieces live

| Concern | Repo | File |
|---|---|---|
| `ThemeTokens` type definitions | `alexandria-app` | `resources/js/theming/types.ts` |
| Preset definitions (`defaultPreset`, `cyberpunkPreset`) | `alexandria-app` | `resources/js/theming/presets/` |
| Cascade resolver | `alexandria-app` | `resources/js/theming/lib/resolve.ts` |
| `ThemeProvider` (emits CSS vars) | `alexandria-app` | `resources/js/theming/` |
| `ThemingBridge` (reads page props, mounts providers) | `alexandria-app` | `resources/js/lib/ThemingBridge.tsx` |
| `<ThemePresetPicker>` (shared preset cards + inherit button) | `alexandria-core` | `resources/js/components/theming/ThemePresetPicker.tsx` |
| `<TokenOverrideEditor>` (full token tree editor) | `alexandria-core` | `resources/js/components/theming/TokenOverrideEditor.tsx` |
| Individual leaf editors (ColorAnchor, FontStack, …) | `alexandria-core` | `resources/js/components/theming/` |
| Token category registry | `alexandria-core` | `resources/js/components/theming/tokenCategories.ts` |
| `useThemePreview()` context | `alexandria-core` | `resources/js/lib/themePreview.ts` |
| Sparse override JSON utils (`setPath` / `unsetPath` / `getPath` / `hasPath`) | `alexandria-core` | `resources/js/lib/themeOverride.ts` |
| Preset slug whitelist (server-side validation) | `alexandria-core` | `src/Support/Theming/Presets.php` |
| Per-scope panels (`ThemeSection`, `BlueprintThemePanel`, `EntryThemePanel`) | `alexandria-core` | `resources/js/pages/{Projects,Blueprints,Entries}/...` |
| Per-scope controllers (with `updateTheme` action) | `alexandria-app` | `app/Http/Controllers/{Projects,Blueprints,Entries}/` |

**Why the asymmetric split:** the framework (alexandria-core) ships
the editor surface and the slug whitelist so any consumer app can
present the same UI. The bridge, presets, and resolver stay in
alexandria-app because they own the DOM mount and the brand identity
— a consumer SaaS layering on top can register its own presets by
overriding `ThemingBridge` without touching core.

---

## Adding a new preset

1. Define the `Theme` in `alexandria-app/resources/js/theming/presets/<slug>.ts`
   with `light` and `dark` variants (each a full `ThemeTokens`).
2. Register it in `alexandria-app/resources/js/lib/ThemingBridge.tsx`:
   ```ts
   export const PRESETS: Record<string, Theme> = {
       default: defaultPreset,
       cyberpunk: cyberpunkPreset,
       mynew: mynewPreset, // ← add here
   };
   ```
3. Add a swatch row in `alexandria-core/resources/js/components/theming/ThemePresetPicker.tsx`
   (three signature hex colors that preview the preset's identity).
4. Add the slug to `alexandria-core/src/Support/Theming/Presets.php`:
   ```php
   public const SLUGS = ['default', 'cyberpunk', 'mynew']; // ← add here
   ```
5. Add lang keys for the preset name + description:
   ```php
   // lang/en/projects.php
   'settings_tab.theme.preset.mynew.name' => 'My New',
   'settings_tab.theme.preset.mynew.description' => '…',
   ```

The validation rule in the three `updateTheme` controller actions
auto-picks up the new slug via `Presets::validationRule()` — no
controller change needed.

---

## Adding a new token leaf

1. Add the field to `ThemeTokens` (or a nested sub-type) in
   `alexandria-app/resources/js/theming/types.ts`.
2. Add the value to every preset's `light` and `dark` variants.
3. Register a leaf in `alexandria-core/resources/js/components/theming/tokenCategories.ts`:
   ```ts
   {
       path: 'mycategory.myfield',
       labelKey: 'theming.token_editor.leaf.mycategory.myfield.label',
       descriptionKey: 'theming.token_editor.leaf.mycategory.myfield.description',
       type: 'color-anchor', // or 'text' | 'number' | 'enum' | 'font-stack' | …
   }
   ```
4. Add the lang keys to `alexandria-core/lang/en/theming.php`.

The dispatcher in `<TokenOverrideEditor>` reads the `type` field and
picks the right editor component. If you need a brand-new editor
shape, add a `LeafType` variant in `tokenCategories.ts`, build the
component, and wire a `case` in the dispatcher's `switch`.

---

## Non-merging paths (dynamic-keys maps)

`Record<string, T>` fields (currently `brand.extras` and `themed`) use
**replacement** semantics instead of deep-merge. Deep-merge can add
or overwrite keys in a Record but can never remove an inherited key —
non-merging fixes that.

The set lives in `alexandria-app/resources/js/theming/lib/resolve.ts`:

```ts
const NON_MERGING_PATHS = new Set<string>(['brand.extras', 'themed']);
```

When the resolver encounters an override at one of these paths, it
replaces wholesale rather than recursing. The editor side
(`<ColorAnchorMapEditor>`) reads the currently-merged map, lets the
user add / rename / remove entries, and commits the FULL intended
map back as the override value.

Adding a new non-merging path: append to the set above + add a
`color-anchor-map` leaf (or whatever map type you need) to the
relevant category in `tokenCategories.ts`.

---

## Override JSON shape

Sparse `DeepPartial<ThemeTokens>` stored as a JSON column on each
owning model (`Project.theme_override`, `Blueprint.theme_override`,
`Entry.theme_override`). Example:

```json
{
    "brand": {
        "primary": "#ff44bb"
    },
    "radius": {
        "card": "0.25rem"
    },
    "brand": {
        "extras": {
            "neonPink": "#ff00aa",
            "terminalGreen": "#00ff00"
        }
    }
}
```

Only paths the user explicitly touched appear — the resolver's
deep-merge picks up untouched paths from the parent scope.

The `lib/themeOverride.ts` utilities (`setPath` / `unsetPath` /
`getPath` / `hasPath`) maintain this shape from the editor side.
`unsetPath` prunes empty branches so the override stays minimally
sparse; if it prunes everything it returns `null`, which the
controller persists verbatim as "no overrides".

---

## Dev affordances

### `?devtheme=<slug>` URL flag

Append `?devtheme=cyberpunk` (or any registered preset slug) to any
URL to preview that preset without persisting to any scope. Read
once on mount, does not survive navigation, gated behind
`import.meta.env.DEV` so it's tree-shaken in production builds.
A `console.info` line announces when the flag is active so it's
obvious you're not seeing the persisted state.

### `useThemePreview()` context

The editor uses this React context to push a WIP override through
the cascade as the user edits. The bridge maintains the slot;
`<TokenOverrideEditor>` writes into it on every keystroke. Cleared
on Save (when the persisted value re-loads) or Cancel.

Also exposes `resolvedContentTheme` so the editor can read the
post-cascade merged value of any leaf — used for inheritance hints
(M4.4) and the merged map readback in `<ColorAnchorMapEditor>`
(M4.5).

---

## Inheritance hints

When a scope inherits (no preset set at this layer), the picker
shows a small italic line: "Inheriting the blueprint's Cyberpunk
theme". Each panel computes its own hint string by reading the
parent scope's preset slug via `usePage().props.{currentProject,
blueprint}` and passing through `getPresetName(t, slug)` for the
display name.

The Entry panel walks one level deeper (blueprint → project →
default) and picks the right translation key based on which parent
it lands on.

---

## Test bypass — Stage 8a follow-up

The three `updateTheme` Pest suites (project / blueprint / entry)
bypass the `can:update,*` middleware via `Gate::before(fn () => true)`
because the project-scoped permission `project.settings.edit` isn't
yet registered by any seeder. This is a known gap to revisit when
Stage 8a's project-scoped permission registry lands — at that point
the tests should grant the permission via Spatie + a `Role::assign`
in `beforeEach` instead of the global bypass.

---

## Known follow-ups

- **Consumer-extended preset registry.** Today `PRESETS` in
  `ThemingBridge.tsx` is a hard-coded map and `Presets::SLUGS` in
  core mirrors it. A consumer SaaS adding its own preset has to
  override the bridge. Stage 16 release-prep is a good place to add a
  proper config-publish path so consumer apps can register presets
  without forking the bridge.
- **User-level overrides.** The cascade resolver accepts a `user`
  scope but no UI emits one yet. When that lands, the inheritance
  hints in Project Settings → Theme should surface the user-default
  preset name.
- **Preset author-defined token coverage.** Today the editor
  registers every leaf statically; if a preset doesn't define a
  given leaf, `readResolvedLeaf` returns `''` and the editor renders
  an empty input. Long-term we may want preset-author hints that
  certain leaves shouldn't be exposed for editing.
- **Provenance for object paths.** The resolver tracks provenance at
  the leaf level only. Object-shaped paths (e.g. `brand.extras` as a
  whole) don't carry their own provenance entry — the inheritance
  badge code falls back to "first observed scope of any contained
  leaf" by reading a child key. Not a bug but an asymmetry worth
  knowing.

---

## Stage 8b commit map

| M | What landed |
|---|---|
| M1.A | Per-project theme foundation — column, model, bridge cascade-awareness |
| M1.B | Project Settings → Theme tab + shared `<ThemePresetPicker>` |
| M1.C.1 | `<TokenOverrideEditor>` scaffold + Brand / Status leaves |
| M1.C.2 | Radius / Motion / Border / Shadow / Surface / Neutral / Semantic leaves |
| M1.C.3 | Typography (incl. FontStack) / Effects / Layout |
| M2 | Per-blueprint content override + `<BlueprintThemePanel>` |
| M3 | Per-entry content override + `<EntrySettingsModal>` scaffold |
| M4.1 | `Presets::SLUGS` registry (controllers stop duplicating the whitelist) |
| M4.2 | Visual parity sweep across the three panels |
| M4.3 | Dev `?devtheme=` URL flag |
| M4.4 | Inheritance hints surface the parent scope's preset name |
| M4.5 | Dynamic-keys `<ColorAnchorMapEditor>` + non-merging cascade paths |
| M4.6 | This doc |
