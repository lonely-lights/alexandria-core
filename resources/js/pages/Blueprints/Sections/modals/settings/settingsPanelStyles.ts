/**
 * Shared style recipes for the blueprint settings panels (Tree, Kanban,
 * Timeline, Graph, Subtitle Builder). All 5 panels share the same chrome
 * vocabulary — activation toggle card, form labels, required-asterisk
 * coloring, helper text, select dropdowns, footer save bar.
 *
 * Theme-token first: every color routes through `var(--theme-*)` so a
 * preset swap repaints the panels without touching this file.
 */
import type { CSSProperties } from "react";

/* ── Activation toggle card (top of each panel) ─────────────────── */

export const toggleCardStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "var(--theme-base-100)",
    borderRadius: "var(--theme-radius-card)",
    transition:
        "background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

/* ── Form-control surface ────────────────────────────────────────── */

export const inputStyle: CSSProperties = {
    background: "var(--theme-base-100)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
    color: "var(--theme-base-content)",
    borderRadius: "var(--theme-radius-input)",
};

export const selectStyle: CSSProperties = {
    ...inputStyle,
    appearance: "auto",
};

/* ── Text colors ─────────────────────────────────────────────────── */

export const labelStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};

export const helperStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

export const helperSoftStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};

export const helperFainterStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};

export const requiredAsteriskStyle: CSSProperties = {
    color: "var(--theme-status-error-stroke)",
};

export const warningTextStyle: CSSProperties = {
    color: "var(--theme-status-warning-stroke)",
};

/* ── Footer divider (save bar) ───────────────────────────────────── */

export const footerDividerStyle: CSSProperties = {
    borderTop:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
};

/* ── Soft divider (between form groups) ──────────────────────────── */

export const softDividerStyle: CSSProperties = {
    border: "none",
    borderTop:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
};

/* ── Segmented orientation buttons (used in Timeline panel) ─────── */

export const segmentBtnActiveStyle: CSSProperties = {
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
    borderRadius: "var(--theme-radius-button)",
};

export const segmentBtnIdleStyle: CSSProperties = {
    background: "transparent",
    color: "var(--theme-base-content)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-button)",
};

/* ── Native toggle accent ────────────────────────────────────────── */
/* Set via `style={{ accentColor: 'var(--theme-brand-primary-500)' }}`
   directly on the input. Exported here for grep-ability. */
export const TOGGLE_ACCENT_COLOR = "var(--theme-brand-primary-500)";
