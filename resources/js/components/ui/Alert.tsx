/**
 * Alert — message block keyed to a status role (info/success/warning/error).
 *
 * Consumed for:
 *   - Form validation summaries (error)
 *   - Inertia status / flash messages (success or info)
 *   - Inline disclosures the user should notice (warning)
 *
 * Reads --theme-status-{role}-{subtle,stroke,content} for background,
 * border, and text. The 4px inline-start accent stripe matches the
 * legal-page placeholder callout pattern from Stage 1.
 */

import type { CSSProperties, ReactNode } from 'react';

export type AlertRole = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
    role: AlertRole;
    children: ReactNode;

    /** Optional bold prefix label (e.g. "Heads up", "Error"). */
    title?: string;

    /** Tailwind layout classes — never theme-token consumers. */
    className?: string;
}

export default function Alert({ role, title, children, className = '' }: AlertProps) {
    // Body sits on plain `--theme-base-surface` so the panel reads as
    // a normal card on every theme — no tinted background. The role
    // identity rides on just two accents: the 4px leading edge stripe
    // and the icon-color title prefix (when present).
    //
    // This is a deliberate retreat from tinting the whole panel — on
    // high-chroma palettes (cyberpunk's neon-green success / magenta
    // error / acid-yellow warning) any percentage of role color across
    // the full panel reads as garish; on default's quiet paper palette
    // the same percentage reads as washed-out. A neutral surface +
    // saturated accent works on both ends of the chroma spectrum.
    const style: CSSProperties = {
        background: 'var(--theme-base-surface)',
        color: 'var(--theme-base-content)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
        borderInlineStartWidth: '4px',
        borderInlineStartColor: `var(--theme-status-${role}-fill)`,
        borderRadius: 'var(--theme-radius-card)',
        padding: '0.875rem 1rem',
    };

    return (
        <div role={role === 'error' ? 'alert' : 'status'} className={className} style={style}>
            {title && (
                <div
                    style={{
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.25rem',
                        color: `var(--theme-status-${role}-fill)`,
                    }}
                >
                    {title}
                </div>
            )}
            <div style={{ fontSize: '0.875rem' }}>{children}</div>
        </div>
    );
}
