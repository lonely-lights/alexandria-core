import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';

/**
 * Enum-valued leaf editor — Stage 8b M1.C.2. Used for tokens that
 * pick from a fixed set of strings: radius style (sharp/soft/...),
 * border treatment (none/glow/...), motion style (subtle/standard/...),
 * etc. The registry passes in the option list as `options`, each with
 * a translation key for its display label.
 *
 * Commits immediately on change — enums don't have an intermediate
 * "drafting" state the way text inputs do. Reset-to-inherited still
 * lives on the parent TokenLeafRow.
 */

interface EnumOption {
    value: string;
    labelKey: string;
}

interface EnumSelectProps {
    value: string;
    overridden: boolean;
    onCommit: (next: string) => void;
    options: EnumOption[];
}

const selectBaseStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-input)',
    padding: '0.25rem 1.75rem 0.25rem 0.5rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
    appearance: 'auto',
};

const overriddenSelectStyle: CSSProperties = {
    ...selectBaseStyle,
    borderColor: 'color-mix(in srgb, var(--theme-brand-primary-500) 40%, transparent)',
    background:
        'color-mix(in srgb, var(--theme-brand-primary-500) 5%, var(--theme-base-100))',
};

export default function EnumSelect({
    value,
    overridden,
    onCommit,
    options,
}: EnumSelectProps) {
    const t = useT();

    return (
        <select
            value={value}
            onChange={(e) => onCommit(e.target.value)}
            style={overridden ? overriddenSelectStyle : selectBaseStyle}
            aria-label={t('theming.token_editor.enum_value_aria')}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                </option>
            ))}
        </select>
    );
}
