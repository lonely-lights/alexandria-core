/**
 * Container — max-width content wrapper with standard horizontal padding.
 *
 * Resolves `max-width` from the active theme's `layout.contentMaxWidth`
 * token (narrow / standard / wide / full). Override via the `width` prop
 * when a page wants a different scope (e.g. legal pages typically want
 * narrow; landing pages typically want standard).
 */

import type { CSSProperties, ReactNode } from 'react';

export type ContainerWidth = 'narrow' | 'standard' | 'wide' | 'full';

const WIDTHS: Record<ContainerWidth, string> = {
    narrow:   '65ch',
    standard: '80ch',
    wide:     '96rem',
    full:     '100%',
};

export interface ContainerProps {
    children: ReactNode;

    /** Override the layout-token width. Defaults to the theme value. */
    width?: ContainerWidth;

    /** Vertical padding scale. Default: standard. */
    padding?: 'tight' | 'standard' | 'generous' | 'none';

    /** Extra Tailwind classes for layout / spacing only — not theme tokens. */
    className?: string;
}

const PADDINGS: Record<NonNullable<ContainerProps['padding']>, string> = {
    none:     '0',
    tight:    '0.75rem',
    standard: '1.5rem',
    generous: '2.5rem',
};

export default function Container({
    children,
    width = 'standard',
    padding = 'standard',
    className = '',
}: ContainerProps) {
    const style: CSSProperties = {
        maxWidth: WIDTHS[width],
        marginInline: 'auto',
        paddingInline: PADDINGS[padding],
        paddingBlock: padding === 'none' ? '0' : PADDINGS[padding],
    };

    return (
        <div className={className} style={style}>
            {children}
        </div>
    );
}
