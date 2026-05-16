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

/* ── Modal chrome (BlueprintSettingsModal shell) ─────────────────── */

export const titleBarStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "var(--theme-base-300)",
};

export const navSidebarStyle: CSSProperties = {
    borderRight:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "color-mix(in srgb, var(--theme-base-200) 40%, transparent)",
};

export const rightPaneStyle: CSSProperties = { background: "var(--theme-base-100)" };

export const panelHeaderDividerStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
};

export const closeBtnStyle: CSSProperties = {
    borderRadius: "9999px",
    width: "1.5rem",
    height: "1.5rem",
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

/* ── Nav sidebar primitives ──────────────────────────────────────── */

export const navItemActiveStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)",
    color: "var(--theme-brand-primary-500)",
};

export const navItemIdleStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};

/* ── Columns panel ───────────────────────────────────────────────── */

export const columnsDividerStyle: CSSProperties = {
    borderRight: "1px solid var(--theme-base-300)",
};

export const activeColumnRowStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "var(--theme-base-200)",
    borderRadius: "var(--theme-radius-card)",
    transition:
        "border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

export const availableColumnRowStyle: CSSProperties = {
    border: "1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-input)",
    transition:
        "border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

export const dragHandleStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 25%, transparent)",
};

/* ── Badges (status + sortable indicator) ────────────────────────── */

export const badgeBase: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.125rem 0.5rem",
    fontSize: "0.625rem",
    fontWeight: 600,
    borderRadius: "var(--theme-radius-badge)",
};

export const badgeInfoStyle: CSSProperties = {
    ...badgeBase,
    background: "var(--theme-status-info-fill)",
    color: "var(--theme-status-info-content)",
};

export const badgePrimaryStyle: CSSProperties = {
    ...badgeBase,
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
};

export const badgeWarningStyle: CSSProperties = {
    ...badgeBase,
    background: "var(--theme-status-warning-stroke)",
    color: "var(--theme-status-warning-content)",
};

export const badgeSuccessStyle: CSSProperties = {
    ...badgeBase,
    background: "var(--theme-status-success-fill)",
    color: "var(--theme-status-success-content)",
};

export const badgeGhostStyle: CSSProperties = {
    ...badgeBase,
    background:
        "color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};

// Neutral chip for use inside any tinted panel (info / warning / etc.) —
// paints from base tokens so it reads as a discrete elevated item.
export const badgeOnTintedPanelStyle: CSSProperties = {
    ...badgeBase,
    background: "var(--theme-base-200)",
    color: "var(--theme-base-content)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
};

export const badgeErrorSmallStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.0625rem 0.375rem",
    fontSize: "0.5625rem",
    fontWeight: 600,
    borderRadius: "var(--theme-radius-badge)",
    background: "var(--theme-status-error-fill)",
    color: "var(--theme-status-error-content)",
};

export const sortableBadgeActiveStyle: CSSProperties = {
    ...badgeBase,
    gap: "0.25rem",
    background: "var(--theme-status-success-fill)",
    color: "var(--theme-status-success-content)",
    cursor: "pointer",
    border: "none",
};

export const sortableBadgeIdleStyle: CSSProperties = {
    ...sortableBadgeActiveStyle,
    background:
        "color-mix(in srgb, var(--theme-status-success-fill) 40%, transparent)",
    opacity: 0.4,
};

/* ── Fields panel ────────────────────────────────────────────────── */

export const fieldRowStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    overflow: "hidden",
    transition:
        "border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

export const fieldExpandedBodyStyle: CSSProperties = {
    borderTop:
        "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "var(--theme-base-200)",
};

export const violetPanelStyle: CSSProperties = {
    background: "color-mix(in srgb, #8b5cf6 5%, transparent)",
    border: "1px solid color-mix(in srgb, #8b5cf6 20%, transparent)",
    borderRadius: "var(--theme-radius-input)",
};

export const rosePanelStyle: CSSProperties = {
    background: "color-mix(in srgb, #f43f5e 5%, transparent)",
    border: "1px solid color-mix(in srgb, #f43f5e 20%, transparent)",
    borderRadius: "var(--theme-radius-input)",
};

export const addFieldBtnStyle: CSSProperties = {
    border: "2px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    transition:
        "border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

export const subtitlePickerBtnStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "var(--theme-base-200)",
    borderRadius: "var(--theme-radius-input)",
    transition:
        "background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

/* ── Relationships panel ─────────────────────────────────────────── */

export const relCardActiveStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

export const relCardIdleStyle: CSSProperties = {
    border: "1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

export const relCardIconWrapStyle: CSSProperties = {
    background: "color-mix(in srgb, #f43f5e 10%, transparent)",
    borderRadius: "var(--theme-radius-input)",
};

export const relCardIconWrapIdleStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-300) 50%, transparent)",
    borderRadius: "var(--theme-radius-input)",
};

/* ── Main panel (Identity) ───────────────────────────────────────── */

export const aboutRowStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

export const iconPreviewWrapStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

/* ── Info / status text + tinted panels ──────────────────────────── */

export const infoBoxStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-status-info-stroke) 30%, transparent)",
    background:
        "color-mix(in srgb, var(--theme-status-info-fill) 50%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

export const primaryTextStyle: CSSProperties = {
    color: "var(--theme-brand-primary-500)",
};

// Heading + icon for an info-tinted panel — uses base-content so it
// contrasts cleanly against the panel's info-fill tint instead of
// blending into the same hue family.
export const infoTextStyle: CSSProperties = {
    color: "var(--theme-base-content)",
};

export const errorTextStyle: CSSProperties = {
    color: "var(--theme-status-error-stroke)",
};

export const primaryHalfStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent)",
};

export const infoHalfStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-status-info-stroke) 60%, transparent)",
};

export const warningHalfStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-status-warning-stroke) 60%, transparent)",
};

export const fadedIconStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
};

export const veryFadedStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 25%, transparent)",
};

/* ── Field-type identity badges ──────────────────────────────────── */
/* Hardcoded RGB stays because these colors are *semantic identity
   markers* for field types (text=slate, integer=blue, date=amber, etc.),
   not theme-driven chrome. Each field type's color is its visual
   fingerprint and should NOT swap with the active preset. */
export const FIELD_TYPE_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
    text: { bg: "rgba(148,163,184,0.35)", text: "#cbd5e1" },
    textarea: { bg: "rgba(129,140,248,0.35)", text: "#c7d2fe" },
    integer: { bg: "rgba(96,165,250,0.35)", text: "#bfdbfe" },
    boolean: { bg: "rgba(52,211,153,0.35)", text: "#a7f3d0" },
    date: { bg: "rgba(251,191,36,0.35)", text: "#fde68a" },
    datetime: { bg: "rgba(251,191,36,0.35)", text: "#fde68a" },
    entry_reference: { bg: "rgba(167,139,250,0.35)", text: "#ddd6fe" },
    relationship_manager: { bg: "rgba(251,113,133,0.35)", text: "#fecdd3" },
    temporal: { bg: "rgba(45,212,191,0.35)", text: "#99f6e4" },
};
