import type { CSSProperties } from 'react';

/**
 * Inline styles shared by LinkMoveModal and its WorkSectionPicker step, so
 * the destination list and the section list read as one control.
 */
export const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
export const muteText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };

export const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.375rem 0.75rem',
};

export const selectedChipStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-brand-primary-500) 30%, transparent)',
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

export const listWrapperStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    overflow: 'hidden',
};

/**
 * Same wrapper, but scrolling in place. A shorthand `overflow: hidden`
 * inline beats the Tailwind `overflow-y-auto` class, so a capped list
 * that must scroll splits the axes instead (see ContextSwitchModal).
 */
export const scrollingListWrapperStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    overflowX: 'hidden',
    overflowY: 'auto',
};

export const changeButtonStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
};

export const rowDivider = '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)';
