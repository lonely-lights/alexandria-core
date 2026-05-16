import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';

import ColorAnchorEditor from './ColorAnchorEditor';

/**
 * Wraps ColorAnchorEditor with a null toggle — Stage 8b M1.C.3.
 *
 * For tokens that are `ColorAnchor | null` like Shadow.tint: a checkbox
 * controls whether the leaf has any color value at all. When unchecked,
 * the editor commits the empty string `''` (which the resolver treats
 * as null — DeepPartial values that are empty strings get dropped
 * upstream); when checked, the inner ColorAnchorEditor renders for
 * value selection.
 *
 * The "empty string = null" convention is a pragmatic adapter — the
 * override JSON's marshalling utility (setPath in lib/themeOverride)
 * stores whatever value the editor emits. The cascade resolver in
 * `@/theming` already special-cases falsy ColorAnchor values, so this
 * round-trips correctly.
 */

interface NullableColorAnchorEditorProps {
    value: string;
    overridden: boolean;
    onCommit: (next: string) => void;
}

const toggleRowStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
};

const toggleLabelStyle: CSSProperties = {
    fontSize: '0.6875rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    cursor: 'pointer',
};

export default function NullableColorAnchorEditor({
    value,
    overridden,
    onCommit,
}: NullableColorAnchorEditorProps) {
    const t = useT();
    // Treat empty string / undefined / "null" string as "off".
    const isOn = Boolean(value) && value !== 'null';

    function handleToggle(next: boolean) {
        if (next) {
            // Default to the current value if there was one, else a
            // neutral grey so the user sees an immediate preview.
            onCommit(value && value !== 'null' ? value : '#888888');
        } else {
            onCommit('');
        }
    }

    return (
        <div style={toggleRowStyle}>
            <label style={toggleLabelStyle}>
                <input
                    type="checkbox"
                    checked={isOn}
                    onChange={(e) => handleToggle(e.target.checked)}
                    className="mr-1.5"
                    style={{ accentColor: 'var(--theme-brand-primary-500)' }}
                />
                {isOn
                    ? t('theming.token_editor.nullable_color.on')
                    : t('theming.token_editor.nullable_color.off')}
            </label>
            {isOn && (
                <ColorAnchorEditor
                    value={value}
                    overridden={overridden}
                    onCommit={onCommit}
                />
            )}
        </div>
    );
}
