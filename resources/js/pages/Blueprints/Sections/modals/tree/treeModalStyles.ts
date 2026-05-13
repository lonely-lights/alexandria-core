/**
 * Shared style recipes for the tree-add / convert-stub / child-blueprint
 * modals. Same shape across all three (header bar, subtitle fades, input
 * surface, list shell, row separator, circle close button) — extracted
 * here so the modals stay focused on their unique JSX and the duplicate-
 * code detector stays quiet.
 *
 * Theme-token first: every color routes through `var(--theme-*)` so a
 * preset swap repaints the modals without touching this file.
 */
import type { CSSProperties } from "react";

export const headerStyle: CSSProperties = {
    background: "var(--theme-base-300)",
};

/* Subtitle fade ladder — call-site picks the opacity step that
   matches the text's information hierarchy. */
export const subtitle60: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};
export const subtitle50: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};
export const subtitle40: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};
export const subtitle30: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};

export const inputStyle: CSSProperties = {
    background: "var(--theme-base-100)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
    color: "var(--theme-base-content)",
    borderRadius: "var(--theme-radius-input)",
};

/* Wraps a scrollable list (blueprint picker, search results) — gives
   it the outer card surface; rows inside use rowBorderStyle for the
   dashed separators. */
export const listShellStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-input)",
    overflow: "hidden",
};

export const rowBorderStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
};

/* Circle close button — used in modal headers + on selected-entry
   chips for the "clear selection" affordance. */
export const closeBtnStyle: CSSProperties = {
    borderRadius: "9999px",
    width: "1.5rem",
    height: "1.5rem",
};

/* Selected-row tint — primary at 5% opacity. Applied inline because
   it's a state, not a class. */
export const selectedRowStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)",
};

/* Selected-entry chip — the highlighted card that appears after the
   user picks a search result. Border + matching tint. */
export const selectedChipStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)",
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};
