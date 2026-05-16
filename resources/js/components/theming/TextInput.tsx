import type { CSSProperties } from 'react';

import { useCommitOnBlur } from '@alexandria/hooks/useCommitOnBlur';
import useT from '@alexandria/hooks/useT';

/**
 * Generic text-input leaf editor — Stage 8b M1.C.2.
 * Covers any CSS-string-valued token: radius lengths ("0.5rem"),
 * easing functions ("cubic-bezier(0.4, 0, 0.2, 1)"), avatar shape
 * keywords ("rounded"), etc. Commit-on-blur semantics shared with
 * ColorAnchorEditor + NumberInput via `useCommitOnBlur`.
 */

interface TextInputProps {
    value: string;
    overridden: boolean;
    onCommit: (next: string) => void;
    /** Placeholder + accessibility hint. */
    placeholder?: string;
    /** Width override; defaults to 8rem to match color-anchor editor. */
    width?: string;
}

const inputBaseStyle = (width: string): CSSProperties => ({
    background: 'var(--theme-base-100)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-input)',
    padding: '0.25rem 0.5rem',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    fontSize: '0.75rem',
    width,
});

const overriddenStyle = (width: string): CSSProperties => ({
    ...inputBaseStyle(width),
    borderColor: 'color-mix(in srgb, var(--theme-brand-primary-500) 40%, transparent)',
    background:
        'color-mix(in srgb, var(--theme-brand-primary-500) 5%, var(--theme-base-100))',
});

export default function TextInput({
    value,
    overridden,
    onCommit,
    placeholder,
    width = '8rem',
}: TextInputProps) {
    const t = useT();
    const { draft, setDraft, commit, handleKey } = useCommitOnBlur(
        value,
        onCommit,
    );

    return (
        <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKey}
            placeholder={placeholder}
            spellCheck={false}
            style={overridden ? overriddenStyle(width) : inputBaseStyle(width)}
            aria-label={t('theming.token_editor.text_value_aria')}
        />
    );
}
