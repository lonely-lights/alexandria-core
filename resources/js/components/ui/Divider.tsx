/**
 * Divider — horizontal rule, optionally with a centered label pill.
 *
 * Two consumption shapes:
 *
 *   <Divider />                          → plain rule across the full width
 *   <Divider>or</Divider>                → rule with "or" pill in the middle,
 *                                          background-masked so the line
 *                                          doesn't show through the text
 *
 * The label pill needs an explicit `labelSurface` when nested inside any
 * surface other than the page (Card, Sunken, Raised, etc.) — otherwise
 * the bg-mask won't match the parent and the rule will peek through.
 *
 * Reads --theme-neutral-300 for the line, --theme-surface-{labelSurface}
 * for the pill mask, and a color-mix on --theme-surface-on-page for the
 * dimmed label text.
 */

import type { CSSProperties, ReactNode } from 'react';

export type DividerVariant = 'solid' | 'dashed' | 'dotted';

export type DividerSurface =
    | 'page'
    | 'sunken'
    | 'raised'
    | 'card'
    | 'modal'
    | 'popover';

export interface DividerProps {
    /**
     * Optional label rendered as a masked pill in the centre of the rule.
     * When omitted, renders a plain rule (no pill, no masking).
     */
    children?: ReactNode;

    /**
     * Surface token whose value the label pill should use as its background.
     * Must match the surface the divider sits on so the pill can mask the
     * rule cleanly. Default 'page'.
     */
    labelSurface?: DividerSurface;

    /** Line style. Default 'solid'. */
    variant?: DividerVariant;

    /** Line thickness in px. Default 1. */
    thickness?: 1 | 2 | 3;

    /**
     * Pill text opacity vs the surface foreground. Default 0.5 — quieter
     * than the body but still legible.
     */
    labelOpacity?: number;

    /** Tailwind layout classes for the wrapper. */
    className?: string;
}

export default function Divider({
    children,
    labelSurface = 'page',
    variant = 'solid',
    thickness = 1,
    labelOpacity = 0.5,
    className = '',
}: DividerProps) {
    const lineColor = 'var(--theme-neutral-300)';
    const lineStyle: CSSProperties = {
        borderTopWidth: `${thickness}px`,
        borderTopStyle: variant,
        borderTopColor: lineColor,
    };

    if (!children) {
        return (
            <hr
                role="separator"
                className={className}
                style={{
                    border: 'none',
                    ...lineStyle,
                }}
            />
        );
    }

    return (
        <div role="separator" className={`relative ${className}`}>
            <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={lineStyle} />
            </div>
            <div className="relative flex justify-center text-sm">
                <span
                    className="px-4"
                    style={{
                        background: `var(--theme-surface-${labelSurface})`,
                        color: `color-mix(in srgb, var(--theme-surface-on-page) ${labelOpacity * 100}%, transparent)`,
                    }}
                >
                    {children}
                </span>
            </div>
        </div>
    );
}
