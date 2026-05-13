/**
 * Shared form element sizing to ensure inputs, selects, and textareas
 * render at the same height when placed side by side.
 */
export type FormSize = 'xs' | 'sm' | 'md';

export const FORM_SIZES = {
    xs: { height: 'h-8', text: 'text-xs', padding: 'px-2', iconSize: 'text-xs', iconPadding: 'pl-8', iconPaddingPx: '2.25rem' },
    sm: { height: 'h-9', text: 'text-sm', padding: 'px-3', iconSize: 'text-sm', iconPadding: 'pl-9', iconPaddingPx: '2.5rem' },
    md: { height: 'h-11', text: 'text-base', padding: 'px-4', iconSize: 'text-base', iconPadding: 'pl-10', iconPaddingPx: '2.75rem' },
} as const;
