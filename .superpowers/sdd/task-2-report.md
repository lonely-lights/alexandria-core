### Task 2 Report: Writing File/Edit/View bounded additions

**Status:** Complete

**Commits:**
- `alexandria-core`: `feat(writing): File/Edit/View ribbon additions (bounded)` — lang key + `writingRibbonTabs.tsx`
- `alexandria-app`: test commit for `writing-ribbon-tabs.test.ts` — 7 new tests

**Test summary:** 25 passing (18 pre-existing + 7 new), 0 failures. Full Vitest suite: 1 pre-existing failure in `token-usage.test.ts` (vendor doc sync, unrelated to this work). `npm run build` clean.

**Per-area verdicts:**

- **File / sections group (ADDED):** `work-settings` (openSettings, canUpdate-gated), `add-section` (addSection, canUpdate-gated), `add-inside` (addInside, canUpdate-gated, disabled when !hasSection). All three actions pre-existed in `WritingRibbonContext.actions`.
- **File / export group (ADDED stub):** `export-stub` button — always disabled, labeled `writing.ribbon.export_coming`. Lang key added.
- **File / rename section (SKIPPED):** `RenameSectionModal` is owned internally by `Navigator` (`renameTarget` state, lines 205/373 of Navigator.tsx). Workspace owns the add/delete modals (the pattern for ribbon exposure) but does NOT own the rename modal. Lifting it would require new state + prop threading — new work outside bounded scope.
- **Edit / scene-link management (SKIPPED):** `WritingEditorBridge` has no scene-link editing commands. Interface exposes: toggleMark/List/Heading, isMarkActive, setBlockStyle, currentBlockStyle, setElement, currentElement, insertEntryLink, openHelp, toggleCodeView, isCodeView, undo/redo, canUndo/canRedo, focus. No editDisplayText / convertToCanonical / removeLink methods exist.
- **View panel toggles (NOTHING ADDED):** ReferencePanel tabs are `browse`, `pins`, `section`, `scene-links` (screenplay only). View tab already covers all: `panel` (general show/hide), `scene-links-panel` (screenplay scene-links tab opener). Fully covered.

**Self-review:** read-only users (`canUpdate=false`) see none of the three sections controls (verified by test). Export stub is visible to all but always disabled. No existing View controls duplicated.
