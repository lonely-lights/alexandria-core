import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';

import EnumSelect from './EnumSelect';

/**
 * Compact editor for a `FontStack` token — Stage 8b M1.C.3.
 *
 * FontStack shape from the theming module:
 *   { family: string; fallback: string[]; source: FontSource; url?: string }
 *
 * Renders 3 (sometimes 4) coordinated inputs:
 *   - family — text input for the primary font family name
 *   - source — enum select (system / bunny / self-hosted)
 *   - url — text input, shown only when source !== 'system'
 *   - fallback — comma-separated text input
 *
 * Each sub-field commits independently. The parent receives the WHOLE
 * resolved FontStack object on each commit since the override JSON
 * stores the full shape (a partial FontStack would be ambiguous —
 * "did the user explicitly clear fallback or leave it inherited?").
 *
 * Because the parent's `value` prop arrives as a stringified record
 * (everything in tokenCategories flows through `readResolvedLeaf` which
 * stringifies), we receive a JSON-encoded blob and emit one back. Not
 * the cleanest contract — fine for M1.C.3, ripe for a future cleanup
 * that adds typed-leaf editor support.
 */

interface FontStack {
    family: string;
    fallback: string[];
    source: 'system' | 'bunny' | 'self-hosted';
    url?: string;
}

interface FontStackEditorProps {
    value: string;
    overridden: boolean;
    onCommit: (next: string) => void;
}

const SOURCE_OPTIONS = [
    { value: 'system', labelKey: 'theming.token_editor.font_source.system' },
    { value: 'bunny', labelKey: 'theming.token_editor.font_source.bunny' },
    {
        value: 'self-hosted',
        labelKey: 'theming.token_editor.font_source.self_hosted',
    },
];

const containerStyle: CSSProperties = {
    display: 'grid',
    gap: '0.375rem',
    minWidth: '14rem',
};

const inputBaseStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-input)',
    padding: '0.25rem 0.5rem',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    fontSize: '0.75rem',
    width: '100%',
};

const overriddenInputStyle: CSSProperties = {
    ...inputBaseStyle,
    borderColor: 'color-mix(in srgb, var(--theme-brand-primary-500) 40%, transparent)',
    background:
        'color-mix(in srgb, var(--theme-brand-primary-500) 5%, var(--theme-base-100))',
};

const microLabelStyle: CSSProperties = {
    fontSize: '0.625rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    marginBottom: '0.0625rem',
};

/**
 * Decode the incoming `value` — the registry stringifies all resolved
 * leaves to strings, so a FontStack arrives as a JSON-encoded object
 * or as `[object Object]` if String() didn't go through JSON.stringify.
 * Both are handled defensively.
 */
function parseFontStack(value: string): FontStack {
    if (!value) {
        return { family: '', fallback: [], source: 'system' };
    }
    try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') {
            return {
                family: typeof parsed.family === 'string' ? parsed.family : '',
                fallback: Array.isArray(parsed.fallback)
                    ? parsed.fallback.map(String)
                    : [],
                source:
                    parsed.source === 'bunny' ||
                    parsed.source === 'self-hosted'
                        ? parsed.source
                        : 'system',
                url: typeof parsed.url === 'string' ? parsed.url : undefined,
            };
        }
    } catch {
        /* fall through to default below */
    }
    return { family: value, fallback: [], source: 'system' };
}

export default function FontStackEditor({
    value,
    overridden,
    onCommit,
}: FontStackEditorProps) {
    const t = useT();
    const initial = useMemo(() => parseFontStack(value), [value]);
    const [stack, setStack] = useState<FontStack>(initial);

    // Resync when the resolved value changes externally.
    useEffect(() => {
        setStack(parseFontStack(value));
    }, [value]);

    function emit(next: FontStack) {
        setStack(next);
        // Strip undefined url before serializing to keep the override
        // JSON tidy — the resolver treats absent and undefined the same.
        const serialised: FontStack = { ...next };
        if (!serialised.url) {
            delete serialised.url;
        }
        onCommit(JSON.stringify(serialised));
    }

    const inputStyle = overridden ? overriddenInputStyle : inputBaseStyle;

    return (
        <div style={containerStyle}>
            <div>
                <div style={microLabelStyle}>
                    {t('theming.token_editor.font_stack.family_label')}
                </div>
                <input
                    type="text"
                    value={stack.family}
                    onChange={(e) =>
                        setStack({ ...stack, family: e.target.value })
                    }
                    onBlur={() => emit(stack)}
                    placeholder="Inter"
                    spellCheck={false}
                    style={inputStyle}
                />
            </div>

            <div>
                <div style={microLabelStyle}>
                    {t('theming.token_editor.font_stack.source_label')}
                </div>
                <EnumSelect
                    value={stack.source}
                    overridden={overridden}
                    onCommit={(next) =>
                        emit({
                            ...stack,
                            source: next as FontStack['source'],
                        })
                    }
                    options={SOURCE_OPTIONS}
                />
            </div>

            {stack.source !== 'system' && (
                <div>
                    <div style={microLabelStyle}>
                        {t('theming.token_editor.font_stack.url_label')}
                    </div>
                    <input
                        type="text"
                        value={stack.url ?? ''}
                        onChange={(e) =>
                            setStack({ ...stack, url: e.target.value })
                        }
                        onBlur={() => emit(stack)}
                        placeholder="https://…"
                        spellCheck={false}
                        style={inputStyle}
                    />
                </div>
            )}

            <div>
                <div style={microLabelStyle}>
                    {t('theming.token_editor.font_stack.fallback_label')}
                </div>
                <input
                    type="text"
                    value={stack.fallback.join(', ')}
                    onChange={(e) =>
                        setStack({
                            ...stack,
                            fallback: e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                        })
                    }
                    onBlur={() => emit(stack)}
                    placeholder="ui-sans-serif, system-ui, sans-serif"
                    spellCheck={false}
                    style={inputStyle}
                />
            </div>
        </div>
    );
}
