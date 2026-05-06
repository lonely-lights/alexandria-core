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
    const style: CSSProperties = {
        background: `var(--theme-status-${role}-subtle)`,
        color: `var(--theme-status-${role}-content)`,
        border: `1px solid var(--theme-status-${role}-stroke)`,
        borderInlineStartWidth: '4px',
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
                    }}
                >
                    {title}
                </div>
            )}
            <div style={{ fontSize: '0.875rem' }}>{children}</div>
        </div>
    );
}
