import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import { useCommitOnBlur } from '@alexandria/hooks/useCommitOnBlur';
import useT from '@alexandria/hooks/useT';

/**
 * Leaf editor for `Record<string, ColorAnchor>` maps (currently
 * `brand.extras` and `themed`). Stage 8b M4.5.
 *
 * Behavior:
 *   - Reads the current MERGED map (post-cascade) from `value`.
 *   - User can edit existing entries (color picker + text input).
 *   - User can rename a key by editing the key input on blur.
 *   - User can add new entries via the row at the bottom.
 *   - User can remove entries via the trash button on each row.
 *   - Every change commits the FULL intended map as a JSON string.
 *
 * The resolver treats this path as non-merging (NON_MERGING_PATHS),
 * so the override stores the full intended map and the resolver
 * replaces wholesale — this is how preset-defined keys get removed.
 *
 * "Cleared back to inherited" = caller sees JSON.parse → empty
 * object {}; caller decides whether to translate that into
 * `unsetPath()` (recommended) so the override prunes back.
 */

interface ColorAnchorMapEditorProps {
    /** Current merged map (post-cascade), as a JSON string. */
    value: string;
    /** True if the user has overridden this map at the editor's scope. */
    overridden: boolean;
    /** Commits a new full map (JSON-encoded). */
    onCommit: (next: string) => void;
}

type Entry = { key: string; color: string };

const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    width: '100%',
    minWidth: '20rem',
};

const rowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr auto',
    gap: '0.375rem',
    alignItems: 'center',
};

const keyInputStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-input)',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
};

const valueInputStyle: CSSProperties = {
    ...keyInputStyle,
    flex: 1,
};

const colorPairStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
};

const swatchStyle = (color: string): CSSProperties => ({
    width: '1.5rem',
    height: '1.5rem',
    background: color,
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    cursor: 'pointer',
    flexShrink: 0,
});

const removeBtnStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-status-error-stroke) 70%, transparent)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem 0.375rem',
    borderRadius: 'var(--theme-radius-button)',
    fontSize: '0.75rem',
};

const addRowStyle: CSSProperties = {
    ...rowStyle,
    marginTop: '0.25rem',
    paddingTop: '0.5rem',
    borderTop:
        '1px dashed color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
};

const addBtnStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    borderRadius: 'var(--theme-radius-button)',
    fontSize: '0.75rem',
};

const errorTextStyle: CSSProperties = {
    color: 'var(--theme-status-error-stroke)',
    fontSize: '0.625rem',
};

function parseMap(jsonString: string): Entry[] {
    if (!jsonString) {
        return [];
    }
    try {
        const parsed = JSON.parse(jsonString);
        if (typeof parsed !== 'object' || parsed === null) {
            return [];
        }
        return Object.entries(parsed)
            .filter(([, v]) => typeof v === 'string')
            .map(([key, color]) => ({ key, color: color as string }));
    } catch {
        return [];
    }
}

function encodeMap(entries: Entry[]): string {
    const obj = entries.reduce<Record<string, string>>((acc, e) => {
        if (e.key) {
            acc[e.key] = e.color;
        }
        return acc;
    }, {});
    return JSON.stringify(obj);
}

export default function ColorAnchorMapEditor({
    value,
    overridden: _overridden,
    onCommit,
}: ColorAnchorMapEditorProps) {
    const t = useT();
    const initialEntries = useMemo(() => parseMap(value), [value]);
    const [entries, setEntries] = useState<Entry[]>(initialEntries);

    // Resync when the upstream value changes (e.g. preset switch).
    useEffect(() => {
        setEntries(parseMap(value));
    }, [value]);

    function commitEntries(next: Entry[]) {
        setEntries(next);
        onCommit(encodeMap(next));
    }

    function updateColor(index: number, color: string) {
        const next = entries.map((e, i) => (i === index ? { ...e, color } : e));
        commitEntries(next);
    }

    function renameKey(index: number, key: string) {
        const trimmed = key.trim();
        if (!trimmed) {
            return;
        }
        // Reject duplicates that aren't this row itself.
        if (entries.some((e, i) => i !== index && e.key === trimmed)) {
            return;
        }
        const next = entries.map((e, i) =>
            i === index ? { ...e, key: trimmed } : e,
        );
        commitEntries(next);
    }

    function removeEntry(index: number) {
        commitEntries(entries.filter((_, i) => i !== index));
    }

    return (
        <div style={containerStyle}>
            {entries.map((entry, i) => (
                <MapRow
                    key={`${entry.key}-${i}`}
                    entry={entry}
                    onRename={(k) => renameKey(i, k)}
                    onColorChange={(c) => updateColor(i, c)}
                    onRemove={() => removeEntry(i)}
                    removeLabel={t('theming.token_editor.color_map.remove_aria')}
                    keyAriaLabel={t('theming.token_editor.color_map.key_aria')}
                    valueAriaLabel={t(
                        'theming.token_editor.color_map.value_aria',
                    )}
                    siblingKeys={entries.map((e, j) => (j === i ? '' : e.key))}
                />
            ))}

            <AddRow
                existingKeys={entries.map((e) => e.key)}
                onAdd={(entry) => commitEntries([...entries, entry])}
                t={t}
            />
        </div>
    );
}

// ----------------------------------------------------------------------------
// MapRow — existing entry
// ----------------------------------------------------------------------------

interface MapRowProps {
    entry: Entry;
    onRename: (key: string) => void;
    onColorChange: (color: string) => void;
    onRemove: () => void;
    removeLabel: string;
    keyAriaLabel: string;
    valueAriaLabel: string;
    siblingKeys: string[];
}

function MapRow({
    entry,
    onRename,
    onColorChange,
    onRemove,
    removeLabel,
    keyAriaLabel,
    valueAriaLabel,
    siblingKeys,
}: MapRowProps) {
    const {
        draft: keyDraft,
        setDraft: setKeyDraft,
        commit: commitKey,
        handleKey: handleKeyKeydown,
    } = useCommitOnBlur(entry.key, onRename, (raw) => {
        const trimmed = raw.trim();
        if (!trimmed || siblingKeys.includes(trimmed)) {
            return null;
        }
        return trimmed;
    });

    const {
        draft: colorDraft,
        setDraft: setColorDraft,
        commit: commitColor,
        handleKey: handleColorKey,
    } = useCommitOnBlur(entry.color, onColorChange);

    const hexForPicker = /^#[0-9a-fA-F]{6}$/.test(colorDraft)
        ? colorDraft
        : '#000000';

    return (
        <div style={rowStyle}>
            <input
                type="text"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                onBlur={commitKey}
                onKeyDown={handleKeyKeydown}
                spellCheck={false}
                style={keyInputStyle}
                aria-label={keyAriaLabel}
            />
            <div style={colorPairStyle}>
                <input
                    type="color"
                    value={hexForPicker}
                    onChange={(e) => {
                        setColorDraft(e.target.value);
                        onColorChange(e.target.value);
                    }}
                    style={swatchStyle(colorDraft)}
                    aria-label={valueAriaLabel}
                />
                <input
                    type="text"
                    value={colorDraft}
                    onChange={(e) => setColorDraft(e.target.value)}
                    onBlur={commitColor}
                    onKeyDown={handleColorKey}
                    spellCheck={false}
                    style={valueInputStyle}
                    aria-label={valueAriaLabel}
                />
            </div>
            <button
                type="button"
                onClick={onRemove}
                style={removeBtnStyle}
                aria-label={removeLabel}
                title={removeLabel}
            >
                <i className="fa-solid fa-trash text-xs" aria-hidden="true" />
            </button>
        </div>
    );
}

// ----------------------------------------------------------------------------
// AddRow — new entry input
// ----------------------------------------------------------------------------

interface AddRowProps {
    existingKeys: string[];
    onAdd: (entry: Entry) => void;
    t: ReturnType<typeof useT>;
}

function AddRow({ existingKeys, onAdd, t }: AddRowProps) {
    const [newKey, setNewKey] = useState('');
    const [newColor, setNewColor] = useState('#888888');
    const [error, setError] = useState<string | null>(null);

    function attemptAdd() {
        const trimmed = newKey.trim();
        if (!trimmed) {
            setError(t('theming.token_editor.color_map.error.empty_key'));
            return;
        }
        if (existingKeys.includes(trimmed)) {
            setError(t('theming.token_editor.color_map.error.duplicate_key'));
            return;
        }
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmed)) {
            setError(t('theming.token_editor.color_map.error.invalid_key'));
            return;
        }
        onAdd({ key: trimmed, color: newColor });
        setNewKey('');
        setNewColor('#888888');
        setError(null);
    }

    return (
        <>
            <div style={addRowStyle}>
                <input
                    type="text"
                    value={newKey}
                    onChange={(e) => {
                        setNewKey(e.target.value);
                        setError(null);
                    }}
                    placeholder={t(
                        'theming.token_editor.color_map.new_key_placeholder',
                    )}
                    spellCheck={false}
                    style={keyInputStyle}
                    aria-label={t(
                        'theming.token_editor.color_map.new_key_aria',
                    )}
                />
                <div style={colorPairStyle}>
                    <input
                        type="color"
                        value={
                            /^#[0-9a-fA-F]{6}$/.test(newColor)
                                ? newColor
                                : '#888888'
                        }
                        onChange={(e) => setNewColor(e.target.value)}
                        style={swatchStyle(newColor)}
                        aria-label={t(
                            'theming.token_editor.color_map.new_value_aria',
                        )}
                    />
                    <input
                        type="text"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        spellCheck={false}
                        style={valueInputStyle}
                        aria-label={t(
                            'theming.token_editor.color_map.new_value_aria',
                        )}
                    />
                </div>
                <button type="button" onClick={attemptAdd} style={addBtnStyle}>
                    <i className="fa-solid fa-plus text-xs" aria-hidden="true" />
                </button>
            </div>
            {error && <p style={errorTextStyle}>{error}</p>}
        </>
    );
}
