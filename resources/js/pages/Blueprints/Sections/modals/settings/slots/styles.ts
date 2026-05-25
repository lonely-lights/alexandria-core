import type { CSSProperties } from "react";

/**
 * Shared style tokens for the AI Sorting slot cards. Lifted from
 * BlueprintAiPanel during the per-slot extraction so every slot
 * editor references the same chrome / typography / count-badge
 * surfaces. Theming flows through CSS variables (theme-primary,
 * theme-base-content, etc.) so consumer themes apply automatically.
 */

// Slot card chrome — left-edge accent stripe in primary color
// differentiates each slot visually from the next.
export const slotCardStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-content) 3%, transparent)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
    borderLeft: "3px solid var(--theme-primary, color-mix(in srgb, var(--theme-base-content) 35%, transparent))",
    borderRadius: "var(--theme-radius-box)",
    color: "var(--theme-base-content)",
};

// Tier 1 — slot title. Uses theme-primary so the header is the strongest
// color anchor on the card, pairing with the icon + left stripe.
export const slotTitleStyle: CSSProperties = {
    color: "var(--theme-primary, var(--theme-base-content))",
};

export const slotIconStyle: CSSProperties = {
    color: "var(--theme-primary, color-mix(in srgb, var(--theme-base-content) 65%, transparent))",
};

// Tier 2 — slot description (one-line subhead under the title)
export const slotDescStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};

// Tier 3 — sub-section divider header (e.g. "Note attachment" within Creation).
// Primary-tinted divider so the section break catches the eye.
export const subSectionHeaderStyle: CSSProperties = {
    color: "var(--theme-base-content)",
    borderTop: "1px solid color-mix(in srgb, var(--theme-primary, var(--theme-base-content)) 20%, transparent)",
};

// Sub-section heading text (e.g. "Note attachment") — primary-tinted but
// slightly muted so the slot title stays the dominant header.
export const subSectionTitleStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-primary, var(--theme-base-content)) 85%, var(--theme-base-content))",
};

// Tier 4 — field label (small caps so it never collides with hint text)
export const fieldLabelStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 85%, transparent)",
    letterSpacing: "0.06em",
};

// Tier 5 — field hint (italic + faded so it reads as helper text, not label)
export const fieldHintStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 55%, transparent)",
    fontStyle: "italic",
};

export const disclosureButtonStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 80%, transparent)",
};

// Count badge for collapsible slot headers — shows "3 rules" / "none yet"
// so authors can read the slot's state without expanding.
export const countBadgeStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-primary, var(--theme-base-content)) 12%, transparent)",
    border: "1px solid color-mix(in srgb, var(--theme-primary, var(--theme-base-content)) 25%, transparent)",
    borderRadius: "var(--theme-radius-pill)",
    color: "color-mix(in srgb, var(--theme-primary, var(--theme-base-content)) 90%, var(--theme-base-content))",
};

export const emptyBadgeStyle: CSSProperties = {
    background: "transparent",
    border: "1px dashed color-mix(in srgb, var(--theme-base-content) 25%, transparent)",
    borderRadius: "var(--theme-radius-pill)",
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
    fontStyle: "italic",
};

export const chevronStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

export const aliasChipStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-primary, var(--theme-base-content)) 10%, transparent)",
    border: "1px solid color-mix(in srgb, var(--theme-primary, var(--theme-base-content)) 28%, transparent)",
    borderRadius: "var(--theme-radius-pill)",
    color: "var(--theme-base-content)",
};

export const aliasEmptyStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
    fontStyle: "italic",
};
