import type { CSSProperties, ReactNode } from 'react';

import useT from '@alexandria/hooks/useT';
import type { CascadeScope } from '@alexandria/lib/themePreview';

import ProvenanceBadge from './ProvenanceBadge';

/**
 * Single editable token row inside a category. Stage 8b M1.C.1.
 *
 * Shows: token label + scope badge + the appropriate value editor +
 * a reset button (only when overridden at the editor's scope).
 *
 * Stays presentational — accepts the editor as `children` so different
 * token types (ColorAnchor, RadiusSize, MotionStyleEnum, ...) can each
 * supply their own input control while reusing this row chrome.
 */

interface TokenLeafRowProps {
    /** Human-readable label, e.g. "Primary brand color". */
    label: string;
    /** Optional one-line hint shown below the label. */
    description?: string;
    /** Scope the current value comes from (for the badge). */
    scope: CascadeScope;
    /** True when the user has explicitly set this token at the editor's scope. */
    overridden: boolean;
    /** Called when the user clicks Reset — caller removes path from override. */
    onReset: () => void;
    /** The actual value editor (ColorAnchorEditor, NumberInput, etc.). */
    children: ReactNode;
}

const rowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '0.75rem',
    alignItems: 'flex-start',
    padding: '0.625rem 0',
    borderBottom:
        '1px solid color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
};

const labelStyle: CSSProperties = {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--theme-base-content)',
};

const descStyle: CSSProperties = {
    fontSize: '0.6875rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    marginTop: '0.125rem',
};

const resetBtnStyle: CSSProperties = {
    background: 'transparent',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.6875rem',
    padding: '0.125rem 0.25rem',
    borderRadius: 'var(--theme-radius-button)',
};

export default function TokenLeafRow({
    label,
    description,
    scope,
    overridden,
    onReset,
    children,
}: TokenLeafRowProps) {
    const t = useT();

    return (
        <div style={rowStyle}>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span style={labelStyle}>{label}</span>
                    <ProvenanceBadge scope={scope} />
                </div>
                {description && <p style={descStyle}>{description}</p>}
            </div>
            <div className="flex items-center gap-2">
                {children}
                {overridden && (
                    <button
                        type="button"
                        onClick={onReset}
                        title={t('theming.token_editor.reset_tooltip')}
                        aria-label={t('theming.token_editor.reset_aria')}
                        style={resetBtnStyle}
                    >
                        <i
                            className="fa-solid fa-rotate-left"
                            aria-hidden="true"
                        />
                    </button>
                )}
            </div>
        </div>
    );
}
