import type { CSSProperties } from 'react';

import { useCommitOnBlur } from '@alexandria/hooks/useCommitOnBlur';
import useT from '@alexandria/hooks/useT';

/**
 * Numeric leaf editor — Stage 8b M1.C.2. Used for tokens that store a
 * plain number (motion intensity 0..10, motion durations in ms, border
 * width 1..3). Renders the value as text inside the input, with an
 * optional unit suffix shown alongside (ms, rem, …). Commit-on-blur
 * semantics shared with ColorAnchorEditor + TextInput via
 * `useCommitOnBlur`; the `transform` callback parses + clamps the
 * raw draft and aborts the commit on NaN (returning null) without
 * resetting the draft, so the user can type through invalid
 * intermediates.
 */

interface NumberInputProps {
    /** Current resolved value, stringified for display. */
    value: string;
    overridden: boolean;
    onCommit: (next: string) => void;
    /** Optional unit suffix shown to the right (e.g. "ms", "rem"). */
    unit?: string;
    /** Inclusive minimum — clamps on commit. */
    min?: number;
    /** Inclusive maximum — clamps on commit. */
    max?: number;
    /** Input step for keyboard arrows. */
    step?: number;
}

const rowStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
};

const inputBaseStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-input)',
    padding: '0.25rem 0.5rem',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    fontSize: '0.75rem',
    width: '4.5rem',
    textAlign: 'right',
};

const overriddenInputStyle: CSSProperties = {
    ...inputBaseStyle,
    borderColor: 'color-mix(in srgb, var(--theme-brand-primary-500) 40%, transparent)',
    background:
        'color-mix(in srgb, var(--theme-brand-primary-500) 5%, var(--theme-base-100))',
};

const unitStyle: CSSProperties = {
    fontSize: '0.6875rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
};

export default function NumberInput({
    value,
    overridden,
    onCommit,
    unit,
    min,
    max,
    step,
}: NumberInputProps) {
    const t = useT();
    const { draft, setDraft, commit, handleKey } = useCommitOnBlur(
        value,
        onCommit,
        (raw) => {
            const parsed = parseFloat(raw);
            if (Number.isNaN(parsed)) {
                return null;
            }
            let clamped = parsed;
            if (typeof min === 'number') clamped = Math.max(min, clamped);
            if (typeof max === 'number') clamped = Math.min(max, clamped);
            return String(clamped);
        },
    );

    return (
        <span style={rowStyle}>
            <input
                type="number"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={handleKey}
                min={min}
                max={max}
                step={step}
                style={overridden ? overriddenInputStyle : inputBaseStyle}
                aria-label={t('theming.token_editor.number_value_aria')}
            />
            {unit && <span style={unitStyle}>{unit}</span>}
        </span>
    );
}
