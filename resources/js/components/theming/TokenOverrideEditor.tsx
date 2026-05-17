import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import ActionButton from '@alexandria/components/ui/ActionButton';
import useT from '@alexandria/hooks/useT';
import {
    hasPath,
    setPath,
    unsetPath,
    type ThemeOverridePatch,
} from '@alexandria/lib/themeOverride';
import { useThemePreview } from '@alexandria/lib/themePreview';

import ColorAnchorEditor from './ColorAnchorEditor';
import ColorAnchorMapEditor from './ColorAnchorMapEditor';
import EnumSelect from './EnumSelect';
import FontStackEditor from './FontStackEditor';
import NullableColorAnchorEditor from './NullableColorAnchorEditor';
import NumberInput from './NumberInput';
import TextInput from './TextInput';
import TokenCategoryRow from './TokenCategoryRow';
import TokenLeafRow from './TokenLeafRow';
import {
    TOKEN_CATEGORIES,
    readProvenanceScope,
    readResolvedLeaf,
    type TokenCategory,
    type TokenLeaf,
} from './tokenCategories';

/**
 * The full token-tree override editor. Stage 8b M1.C.1.
 *
 * Owned by `<ThemeSection>` in Project Settings → Theme tab. Renders an
 * accordion of all token categories; user expands one at a time, sees
 * each leaf's current value + provenance badge + appropriate input,
 * commits changes on blur. Live preview pushes the WIP override
 * through `useThemePreview()` so the rest of the page repaints as the
 * user edits.
 *
 * Maintains its own dirty WIP-override state separate from the
 * persisted `initialOverride`. Save fires the parent's `onSave` with
 * the final shape; Cancel rolls back to the initial value and clears
 * the preview.
 */

interface TokenOverrideEditorProps {
    /** Persisted override the user is editing on top of. */
    initialOverride: ThemeOverridePatch | null;
    /** Called on Save with the final override (null = no overrides). */
    onSave: (next: ThemeOverridePatch | null) => void;
}

const footerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.75rem',
    paddingTop: '1rem',
    marginTop: '0.75rem',
    borderTop:
        '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const dirtyHintStyle: CSSProperties = {
    fontSize: '0.6875rem',
    color: 'color-mix(in srgb, var(--theme-status-warning-stroke) 80%, transparent)',
};

const placeholderStyle: CSSProperties = {
    padding: '0.5rem 0',
    fontSize: '0.75rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
    fontStyle: 'italic',
};

export default function TokenOverrideEditor({
    initialOverride,
    onSave,
}: TokenOverrideEditorProps) {
    const t = useT();
    const { setPreviewOverride, resolvedContentTheme } = useThemePreview();

    // WIP override the user is editing — independent from persisted.
    const [wip, setWip] = useState<ThemeOverridePatch | null>(initialOverride);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Resync if the persisted override changes externally (e.g. after Save
    // the server reloads with the new value).
    useEffect(() => {
        setWip(initialOverride);
    }, [initialOverride]);

    // Live-preview wiring — every WIP change pushes through the context.
    // Cleared on unmount so closing the editor doesn't leave the preview
    // active (which would mismatch the persisted value).
    useEffect(() => {
        setPreviewOverride(wip);
        return () => {
            setPreviewOverride(null);
        };
    }, [wip, setPreviewOverride]);

    const dirty = useMemo(
        () => JSON.stringify(wip) !== JSON.stringify(initialOverride),
        [wip, initialOverride],
    );

    function commitLeaf(leaf: TokenLeaf, raw: string) {
        // Editors emit strings for keyboard-handling simplicity; some
        // token types want their override JSON to hold a richer value
        // (numbers for `number`, parsed objects for `font-stack`, null
        // for cleared nullable colors). Translate per type.
        let value: unknown = raw;
        if (leaf.type === 'number') {
            const parsed = parseFloat(raw);
            if (Number.isNaN(parsed)) {
                return;
            }
            value = parsed;
        } else if (leaf.type === 'font-stack') {
            // FontStackEditor emits JSON; decode so the override stores
            // a real object the resolver can merge into a FontStack.
            try {
                value = raw ? JSON.parse(raw) : null;
            } catch {
                return;
            }
        } else if (leaf.type === 'nullable-color-anchor' && raw === '') {
            // Empty string = the user toggled the color OFF. Persist
            // null so the resolver renders the "no tint" branch.
            value = null;
        } else if (leaf.type === 'color-anchor-map') {
            // ColorAnchorMapEditor commits the full intended map as
            // JSON. Decode so the override stores a real Record the
            // resolver can replace wholesale (NON_MERGING_PATHS).
            try {
                value = raw ? JSON.parse(raw) : {};
            } catch {
                return;
            }
            // Empty map = "cleared back to inherited" — prune the
            // override path so the cascade falls through.
            if (
                value &&
                typeof value === 'object' &&
                Object.keys(value as Record<string, unknown>).length === 0
            ) {
                setWip((prev) => unsetPath(prev, leaf.path));
                return;
            }
        }
        setWip((prev) => setPath(prev, leaf.path, value));
    }

    function resetLeaf(path: string) {
        setWip((prev) => unsetPath(prev, path));
    }

    function handleSave() {
        onSave(wip);
        // Preview gets cleared by the effect cleanup when initialOverride
        // updates from the server reload — no need to clear here.
    }

    function handleCancel() {
        setWip(initialOverride);
    }

    function countOverridden(category: TokenCategory): number {
        return category.leaves.reduce(
            (acc, leaf) => acc + (hasPath(wip, leaf.path) ? 1 : 0),
            0,
        );
    }

    function renderLeaf(leaf: TokenLeaf) {
        const overridden = hasPath(wip, leaf.path);
        const scope = readProvenanceScope(resolvedContentTheme, leaf.path);
        const value = readResolvedLeaf(resolvedContentTheme, leaf.path);

        let editor;
        switch (leaf.type) {
            case 'color-anchor':
                editor = (
                    <ColorAnchorEditor
                        value={value}
                        overridden={overridden}
                        onCommit={(next) => commitLeaf(leaf, next)}
                    />
                );
                break;
            case 'text':
                editor = (
                    <TextInput
                        value={value}
                        overridden={overridden}
                        onCommit={(next) => commitLeaf(leaf, next)}
                        placeholder={leaf.textPlaceholder}
                    />
                );
                break;
            case 'number':
                editor = (
                    <NumberInput
                        value={value}
                        overridden={overridden}
                        onCommit={(next) => commitLeaf(leaf, next)}
                        unit={leaf.numberUnit}
                        min={leaf.numberMin}
                        max={leaf.numberMax}
                    />
                );
                break;
            case 'enum':
                editor = leaf.enumOptions ? (
                    <EnumSelect
                        value={value}
                        overridden={overridden}
                        onCommit={(next) => commitLeaf(leaf, next)}
                        options={leaf.enumOptions}
                    />
                ) : (
                    <span style={placeholderStyle}>
                        {t('theming.token_editor.leaf.editor_pending')}
                    </span>
                );
                break;
            case 'nullable-color-anchor':
                editor = (
                    <NullableColorAnchorEditor
                        value={value}
                        overridden={overridden}
                        onCommit={(next) => commitLeaf(leaf, next)}
                    />
                );
                break;
            case 'font-stack':
                editor = (
                    <FontStackEditor
                        value={value}
                        overridden={overridden}
                        onCommit={(next) => commitLeaf(leaf, next)}
                    />
                );
                break;
            case 'color-anchor-map':
                editor = (
                    <ColorAnchorMapEditor
                        value={value}
                        overridden={overridden}
                        onCommit={(next) => commitLeaf(leaf, next)}
                    />
                );
                break;
            default:
                editor = (
                    <span style={placeholderStyle}>
                        {t('theming.token_editor.leaf.editor_pending')}
                    </span>
                );
        }

        return (
            <TokenLeafRow
                key={leaf.path}
                label={t(leaf.labelKey)}
                description={leaf.descriptionKey ? t(leaf.descriptionKey) : undefined}
                scope={scope}
                overridden={overridden}
                onReset={() => resetLeaf(leaf.path)}
            >
                {editor}
            </TokenLeafRow>
        );
    }

    return (
        <div className="space-y-3">
            <div className="space-y-2">
                {TOKEN_CATEGORIES.map((category) => {
                    const overriddenCount = countOverridden(category);
                    const totalCount = category.leaves.length;
                    const expanded = expandedId === category.id;
                    return (
                        <TokenCategoryRow
                            key={category.id}
                            label={t(category.labelKey)}
                            description={
                                category.descriptionKey
                                    ? t(category.descriptionKey)
                                    : undefined
                            }
                            icon={category.icon}
                            expanded={expanded}
                            onToggle={() =>
                                setExpandedId(expanded ? null : category.id)
                            }
                            overriddenCount={overriddenCount}
                            totalCount={totalCount}
                        >
                            {category.placeholder ? (
                                <p style={placeholderStyle}>
                                    {t(
                                        'theming.token_editor.category.placeholder',
                                    )}
                                </p>
                            ) : (
                                category.leaves.map(renderLeaf)
                            )}
                        </TokenCategoryRow>
                    );
                })}
            </div>

            <div style={footerStyle}>
                <span style={dirtyHintStyle}>
                    {dirty
                        ? t('theming.token_editor.dirty')
                        : t('theming.token_editor.no_changes')}
                </span>
                <div className="flex gap-2">
                    <ActionButton
                        icon="fa-solid fa-xmark"
                        label={t('common.cancel')}
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={!dirty}
                    />
                    <ActionButton
                        icon="fa-solid fa-check"
                        label={t('common.save')}
                        onClick={handleSave}
                        disabled={!dirty}
                    />
                </div>
            </div>
        </div>
    );
}
