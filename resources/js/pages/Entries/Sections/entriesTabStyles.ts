import type { CSSProperties } from 'react';

/**
 * Shared chrome for the read-display tabs of an entry's Show page —
 * AttributesTab, ConnectionsTab, RelationshipsTab, MentionsTab,
 * TimelineTab, HistoryTab. Every tab paints the same paper-board card
 * + gradient header + count badge + sort-trigger button + dashed row
 * divider, so a single change to one of these recipes ripples to all
 * six tabs.
 *
 * Two gradient flavors — primary for "this entry's own data"
 * (AttributesTab simple fields, MentionsTab groupings) and secondary
 * for "related-to-this-entry" surfaces (AttributesTab temporal,
 * ConnectionsTab, RelationshipsTab). Both paint from --theme-brand-*
 * tokens so the color of the header repaints with theme preset swaps.
 */

export const cardOuter: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

export const cardInner: CSSProperties = {
    background: 'var(--theme-base-200)',
    borderRadius: 'inherit',
};

export const emptyStateInner: CSSProperties = {
    ...cardInner,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '4rem 0',
    textAlign: 'center',
};

export const emptyIconStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

export const emptyLabelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

export const headerDivider: CSSProperties = {
    borderBottom: '1px solid var(--theme-base-300)',
};

export const gradientHeaderPrimary: CSSProperties = {
    ...headerDivider,
    background:
        'linear-gradient(90deg, color-mix(in srgb, var(--theme-brand-primary-500) 80%, transparent), color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent))',
    color: 'var(--theme-brand-primary-content)',
};

export const gradientHeaderSecondary: CSSProperties = {
    ...headerDivider,
    background:
        'linear-gradient(90deg, color-mix(in srgb, var(--theme-brand-secondary-500) 80%, transparent), color-mix(in srgb, var(--theme-brand-secondary-500) 60%, transparent))',
    color: 'var(--theme-brand-secondary-content)',
};

export const headerIconPrimaryMuted: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-brand-primary-content) 60%, transparent)',
};

export const headerIconSecondaryMuted: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-brand-secondary-content) 60%, transparent)',
};

export const headerSubtitlePrimary: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-brand-primary-content) 60%, transparent)',
};

export const headerSubtitleSecondary: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-brand-secondary-content) 60%, transparent)',
};

export const countBadge: CSSProperties = {
    marginLeft: 'auto',
    flexShrink: 0,
    borderRadius: '9999px',
    background: 'rgb(0 0 0 / 0.25)',
    color: 'white',
    padding: '0.125rem 0.625rem',
    fontSize: '0.75rem',
    fontWeight: 600,
};

export const sortTriggerBase: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.125rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    borderRadius: 'var(--theme-radius-button)',
    flexShrink: 0,
    transition: 'background-color var(--theme-motion-duration-fast, 150ms) ease, color var(--theme-motion-duration-fast, 150ms) ease',
};

export const sortTriggerPrimaryActive: CSSProperties = {
    ...sortTriggerBase,
    background: 'color-mix(in srgb, var(--theme-brand-primary-content) 15%, transparent)',
    color: 'var(--theme-brand-primary-content)',
    boxShadow: '0 0 0 1px color-mix(in srgb, var(--theme-brand-primary-content) 20%, transparent)',
};

export const sortTriggerPrimaryIdle: CSSProperties = {
    ...sortTriggerBase,
    color: 'color-mix(in srgb, var(--theme-brand-primary-content) 70%, transparent)',
};

export const sortTriggerSecondaryActive: CSSProperties = {
    ...sortTriggerBase,
    background: 'color-mix(in srgb, var(--theme-brand-secondary-content) 15%, transparent)',
    color: 'var(--theme-brand-secondary-content)',
    boxShadow: '0 0 0 1px color-mix(in srgb, var(--theme-brand-secondary-content) 20%, transparent)',
};

export const sortTriggerSecondaryIdle: CSSProperties = {
    ...sortTriggerBase,
    color: 'color-mix(in srgb, var(--theme-brand-secondary-content) 70%, transparent)',
};

/** Used on the parent of <button>s that want the .alex-row hover wash. */
export const rowDivider: CSSProperties = {
    borderTop: '1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

/** Inline-style version of `text-base-content/60` — common for column labels. */
export const labelMuted: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

/** `text-base-content/40` — most muted helper text. */
export const helperFaint: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

/** `text-base-content/30` — even more faint, used for empty hints. */
export const helperFainter: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

/** `text-base-content/70` — slightly muted body. */
export const labelMid: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

/** Base-tinted small badge used in row tag chips. */
export const chipStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.125rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 400,
    borderRadius: 'var(--theme-radius-badge)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'var(--theme-base-100)',
    color: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
};
