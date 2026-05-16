import type { CSSProperties, ReactNode } from 'react';

import useT from '@alexandria/hooks/useT';

/**
 * One category section in the `<TokenOverrideEditor>` accordion.
 * Stage 8b M1.C.1.
 *
 * Click the header to expand/collapse. The parent editor owns which
 * category is currently expanded (accordion behavior — only one at a
 * time) and passes `expanded` + `onToggle` in. When collapsed, only
 * the header row renders; children mount lazily when expanded.
 *
 * `overriddenCount` shows a small badge when the user has any
 * overrides at all inside this category — quick visual scan for
 * "which categories have I customized".
 */

interface TokenCategoryRowProps {
    /** Category title, e.g. "Brand colors". */
    label: string;
    /** Optional helper text under the title when expanded. */
    description?: string;
    /** Font Awesome glyph for the header (e.g. "fa-solid fa-droplet"). */
    icon: string;
    expanded: boolean;
    onToggle: () => void;
    /** Number of token leaves in this category the user has overridden. */
    overriddenCount: number;
    /** Total leaves in this category — used for the badge "n of m". */
    totalCount: number;
    children: ReactNode;
}

const categoryStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    background: 'var(--theme-base-100)',
    overflow: 'hidden',
};

const headerBaseStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition:
        'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const iconStyle: CSSProperties = {
    width: '1.25rem',
    color: 'color-mix(in srgb, var(--theme-brand-primary-500) 70%, transparent)',
    textAlign: 'center',
    flexShrink: 0,
};

const labelTextStyle: CSSProperties = {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--theme-base-content)',
};

const descTextStyle: CSSProperties = {
    fontSize: '0.6875rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    marginTop: '0.125rem',
};

const countBadgeStyle = (hasOverrides: boolean): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.125rem 0.5rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    borderRadius: 'var(--theme-radius-badge)',
    background: hasOverrides
        ? 'color-mix(in srgb, var(--theme-brand-primary-500) 15%, transparent)'
        : 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: hasOverrides
        ? 'var(--theme-brand-primary-500)'
        : 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
});

const chevronStyle = (expanded: boolean): CSSProperties => ({
    transition: 'transform var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
    transform: expanded ? 'rotate(90deg)' : 'none',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
});

const bodyStyle: CSSProperties = {
    padding: '0 1rem 0.75rem',
    borderTop:
        '1px solid color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
};

export default function TokenCategoryRow({
    label,
    description,
    icon,
    expanded,
    onToggle,
    overriddenCount,
    totalCount,
    children,
}: TokenCategoryRowProps) {
    const t = useT();
    const hasOverrides = overriddenCount > 0;
    const countText = hasOverrides
        ? `${overriddenCount} / ${totalCount}`
        : String(totalCount);

    return (
        <div style={categoryStyle}>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                style={headerBaseStyle}
            >
                <i className={`${icon} text-sm`} style={iconStyle} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span style={labelTextStyle}>{label}</span>
                        <span
                            style={countBadgeStyle(hasOverrides)}
                            aria-label={t(
                                hasOverrides
                                    ? 'theming.token_editor.category.overridden_aria'
                                    : 'theming.token_editor.category.token_count_aria',
                            )}
                        >
                            {countText}
                        </span>
                    </div>
                    {expanded && description && (
                        <p style={descTextStyle}>{description}</p>
                    )}
                </div>
                <i
                    className="fa-solid fa-chevron-right text-[10px]"
                    style={chevronStyle(expanded)}
                    aria-hidden="true"
                />
            </button>
            {expanded && <div style={bodyStyle}>{children}</div>}
        </div>
    );
}
