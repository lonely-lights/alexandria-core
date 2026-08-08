# Continuous Manuscript Scene Flow

**Date:** 2026-08-08
**Status:** APPROVED (design), pending implementation plan
**Origin:** owner flag, 2026-07-29 (verbatim in `alexandria-app/docs/REMAINING-ROADMAP.md` Stage 11.6): "scene deep-link lands in the FULL work text at the right spot, visual scene dividers, screenplay new-scene-line anchors, sidebar refreshes contextually on scene-to-scene movement."
**Prior art:** `pages/Writing/Workspace.tsx` (single-section workspace), `Sections/useSectionAutosave.ts` (per-section autosave contract), `editor/screenplay/sceneLinks.ts` `sceneBounds()` (slugline scan), `CommentRail.tsx` (per-section anchor + seen-set contracts), `WorkController@show` (tree + one `currentSection` payload).

---

## Goal

The writing workspace gains a **continuous flow** view: the whole work reads as one manuscript, scene deep-links land in the full text at the right spot, and the sidebar follows the scene under the reader's eyes. Editing stays live everywhere — the flow is a stack of the editors we already have, not a new editor.

### Owner decisions (2026-08-08)

- **Editable stack**, not a merged document and not a read-only flow. Each section renders as its own editor stacked vertically; autosave, anchored comments, and mention indexing keep their existing per-section contracts untouched. (The merged-doc alternative silently mis-anchors comments: `anchor_offset_hint` and text-quote matching are section-relative, and a repeated phrase in another chapter becomes a false anchor candidate.)
- **Windowed lazy-load.** Deep-link hydrates the target section + neighbors; scrolling fetches more via a new batch endpoint. Unloaded sections render as measured placeholders so the scrollbar is honest. Never ship the whole novel in one payload — that protects the deliberate `WorkController@show` design (tree titles only + ONE section's content).
- **Toggle, continuous default.** The workspace opens in continuous flow; a **Focus** toggle narrows to the existing single-section view. Per-work persistence in localStorage (same pattern as `panelMode`). One URL shape across both modes and external deep-links.
- **Typeset by depth** dividers: container sections render as real inline headings; leaf scenes separate with a quiet ornament; screenplay sluglines carry their own visual weight already.
- **Slugline anchors.** In screenplay sections, individual sluglines are anchor targets: deep-links can land on a scene line, and in-section scrolling refines the sidebar context per slugline. Sections stay the storage unit.

### Out of scope

- Any change to section content storage (still `work_sections.content` longText, wiki markup / Fountain codec).
- Cross-section editing operations (merge/split scenes by dragging text across a divider) — the stack keeps editors independent; structural moves stay in the Navigator.
- A work-scoped comments endpoint or multi-section comment rail — the rail stays scoped to the active section (see §5).
- Export/compile of the full manuscript — the batch endpoint is windowed by design; export is separate future work.
- Virtualized unmounting of hydrated sections — once hydrated, sections stay mounted (revisit only if a real memory problem appears in practice).

---

## 1. Architecture

A new **`ContinuousFlow`** container (new file — `Workspace.tsx` is already 1,153 lines and must not grow) renders the work's flattened section order (depth-first, matching the server flatten) as a column of **`FlowSection`** wrappers. Each wrapper is in one of three states:

- **Placeholder** — divider + title + estimated-height spacer derived from `word_count` (already in the tree payload).
- **Hydrated** — the real `ManuscriptEditor` or `ScreenplayEditor` mounted with the section's content, chosen per-section by `format` exactly as the single view does today. Hydrated sections stay mounted.
- **Active** — the hydrated section the viewport is centered on; drives URL, Navigator highlight, and sidebar context.

**Active-scene tracking:** one `IntersectionObserver` over the `FlowSection` wrappers against the workspace scroll container, with a center-band root margin (~middle 40% of the viewport) so "active" means "what you're reading." Inside hydrated screenplay sections, slugline DOM nodes join the same observer (each slugline gets a stable `data-scene-anchor` + ordinal id within its section), refining the active scene to `{sectionId, sluglineIndex}`. Prose needs no finer grain — its leaf sections are the scenes.

A debounced `activeScene` state lives in `ContinuousFlow` and flows up to `Workspace` (URL + Navigator highlight) and down to the sidebar panels.

**Focus mode** is the existing single-section view behind a toggle. Continuous is the default. The toggle persists per work in localStorage.

## 2. Server: batch content endpoint (app)

The "give me multiple sections' content" capability does not exist and is the only new server surface:

```
GET /works/{project}/{work}/sections/content?around={slug}&radius=N
GET /works/{project}/{work}/sections/content?ids=1,2,3
```

- Returns an ordered array of the existing `sectionPayload()` shape (content included), ordered by the shared depth-first flatten. `around+radius` serves deep-link landing (target ± N in flat order); `ids` serves scroll-driven fill-in.
- Lives in a small new controller beside `WorkSectionController` (which handles per-section CRUD; don't grow it), behind the same project + `WorkPolicy` view gates; cross-project ids 404 in the established style.
- Batch size capped at 20 sections per request; `radius` capped correspondingly.
- **Targeted cleanup:** the three near-duplicate depth-first `flatten()` helpers (`WorkController`, `WorkPanelController:222-228`, `WorkReportController:74-85`) consolidate into one shared implementation this endpoint also uses — this feature would otherwise mint a fourth copy.
- `WorkController@show` is unchanged in shape: continuous mode treats the served `currentSection` as the first hydrated block and fetches neighbors after mount. No schema changes, no migrations.

## 3. Scroll ↔ URL ↔ sidebar sync

- **URL:** `history.replaceState` only — scrolling never triggers an Inertia visit or server round-trip. The address bar tracks `/works/{p}/{w}/{active-section-slug}`, plus `#scene-{n}` inside a multi-scene screenplay section, so copying the URL always deep-links to the reading position. Focus mode, continuous mode, and external deep-links share this one shape.
- **Sidebar:** panels (`ReferencePanel`, `SidebarNotesPanel`, `CommentRail`) currently key refetch effects on `currentSection?.id`; they instead receive an **`activeSectionId`** prop. In focus mode it equals `currentSection.id` — zero behavioral change there. One shared debounce (~600 ms of scroll-rest) lives in `ContinuousFlow` so flicking through five chapters costs one refetch per panel, not five.
- **Scene links:** `SceneLinksTab` follows `sluglineIndex` client-side via the existing `sceneBounds()` computation — per-slugline context with no new fetches.
- **Navigator:** highlights the active section as you scroll; clicking a tree node in continuous mode scrolls the flow (hydrating on demand) instead of swapping `currentSection`.

## 4. Deep-link landing & dividers

**Landing sequence:** server renders tree + target `currentSection` as today → `ContinuousFlow` mounts placeholders for all sections in flat order → hydrates the target → scrolls it into view (instant, not smooth — arrive, don't tour) → fetches `around={slug}&radius=3`. Placeholder heights estimate from word count × measured line metrics; when a section above the viewport hydrates, scroll offset compensates by the height delta so the reading position never jumps.

**Dividers (typeset by depth):**

- Container sections (with children): inline heading — label + title in the manuscript's typography, sized by depth.
- Leaf scenes: quiet centered ornament (`* * *`) with the scene title on hover, always exposed as aria-label + `data-` attribute.
- Screenplay sluglines: anchor treatment only; no added chrome.
- Empty sections: divider + a ghost "Begin writing…" line that focuses the editor on click — the flow shows the work's full skeleton, including unwritten scenes.

All divider strings are flat dot-keys in core `lang/en/writing.php`, rendered via `useT()`.

## 5. Contracts preserved (and the one new wiring)

- **Autosave:** `useSectionAutosave` stays keyed on `section.id` per editor instance; the flush-on-unmount contract is untouched because editors don't unmount on scroll.
- **Comments:** anchors, offset hints, seen-set reset, and fetch remain per-section. The rail binds to the *active* section's editor bridge instead of "the one editor," swapping bridges as the active section changes — the only new wiring.
- **Mentions/scene-link index:** written per-section on save, unchanged.

## 6. Edge cases

- Navigator tree mutations (add/move/delete) already partial-reload the `sections` prop; `ContinuousFlow` re-derives its flat order from that prop.
- A section deleted while hydrated unmounts after its autosave flush (existing contract).
- Mixed-format works stack heterogeneous editors; nothing assumes uniformity.
- The 2 MB per-section content validation cap is untouched.
- A deep-link to a slug that no longer exists 404s server-side exactly as today.

## 7. Testing

- **Feature (app):** batch endpoint — around/radius windows, ids form, order matches the shared flatten, batch cap enforced, cross-project 404, viewer-role read parity, `has_content` honesty.
- **Vitest (core):** flat-order derivation + placeholder height estimation; active-scene reducer (observer entries → debounced id, slugline refinement); URL builder incl. fragment.
- **Browser smokes (~4):** deep-link lands scrolled to the target in continuous mode; scrolling updates URL + Navigator + notes panel; Focus toggle round-trips and persists; screenplay slugline deep-link lands on the line.
- **Owner visual/behavior checkpoint before the smokes** (standing practice): flow rendering, dividers, landing, sidebar follow, toggle.

## 8. Boundaries

- **Core:** `ContinuousFlow.tsx`, `FlowSection.tsx`, active-scene hook, divider styles, panel `activeSectionId` prop, Focus toggle + persistence, slugline anchor decoration, lang keys, vitest.
- **App:** batch content controller + route, flatten consolidation, feature tests, browser smokes.
- No SaaS concerns, no schema changes, no new migrations, AI-sort code untouched.
