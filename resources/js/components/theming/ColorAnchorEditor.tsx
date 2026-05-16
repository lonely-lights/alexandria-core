import type { CSSProperties } from 'react';

import { useCommitOnBlur } from '@alexandria/hooks/useCommitOnBlur';
import useT from '@alexandria/hooks/useT';

/**
 * Leaf editor for `ColorAnchor` tokens (brand colors, status colors,
 * surface base, etc.). Stage 8b M1.C.1.
 *
 * Two coordinated inputs:
 *   - Native `<input type="color">` for hex picking — commits
 *     immediately on the picker change.
 *   - `<input type="text">` for any CSS color string (OKLCH, hex,
 *     `color(...)`, named colors, etc.). Commits on blur or Enter
 *     via the shared `useCommitOnBlur` state machine.
 *
 * Color anchors in the resolved theme can be OKLCH or hex; we accept
 * whatever the user types verbatim and let the CSS pipeline handle it.
 * Invalid CSS color strings render the swatch as transparent — visual
 * cue without throwing.
 */

interface ColorAnchorEditorProps {
    /** Current resolved value (post-cascade) — used to seed the input. */
    value: string;
    /** User has overridden this token at the editor's scope. */
    overridden: boolean;
    /** Commits a new value (fired on blur or Enter). */
    onCommit: (next: string) => void;
}

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-input)',
    padding: '0.25rem 0.5rem',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    fontSize: '0.75rem',
    width: '8rem',
};

const overriddenInputStyle: CSSProperties = {
    ...inputStyle,
    borderColor: 'color-mix(in srgb, var(--theme-brand-primary-500) 40%, transparent)',
    background:
        'color-mix(in srgb, var(--theme-brand-primary-500) 5%, var(--theme-base-100))',
};

const swatchStyle = (color: string): CSSProperties => ({
    width: '1.75rem',
    height: '1.75rem',
    background: color,
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    cursor: 'pointer',
    flexShrink: 0,
});

export default function ColorAnchorEditor({
    value,
    overridden,
    onCommit,
}: ColorAnchorEditorProps) {
    const t = useT();
    const { draft, setDraft, commit, handleKey } = useCommitOnBlur(
        value,
        onCommit,
    );

    // `<input type="color">` only accepts #rrggbb. If the current draft
    // isn't that shape, the picker falls back to its own remembered
    // value. We still commit hex into the text input when the picker
    // changes — text input is the source of truth.
    const hexForPicker = /^#[0-9a-fA-F]{6}$/.test(draft) ? draft : '#000000';

    return (
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={hexForPicker}
                onChange={(e) => {
                    setDraft(e.target.value);
                    onCommit(e.target.value);
                }}
                style={swatchStyle(draft)}
                aria-label={t('theming.token_editor.color_picker_aria')}
            />
            <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={handleKey}
                spellCheck={false}
                style={overridden ? overriddenInputStyle : inputStyle}
                aria-label={t('theming.token_editor.color_value_aria')}
            />
        </div>
    );
}
