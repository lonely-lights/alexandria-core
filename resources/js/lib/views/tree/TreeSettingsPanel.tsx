import type { CSSProperties } from 'react';
import useT from '@alexandria/hooks/useT';
import type { ViewSettingsProps } from '../types';

/**
 * Tree has no per-view settings yet — the existing
 * BlueprintSettingsModal manages tree structure via its own panels.
 * This stub exists so the registry contract is satisfied;
 * when tree-specific view settings are added, replace with real UI.
 */
const stubStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

export default function TreeSettingsPanel(_: ViewSettingsProps) {
    const t = useT();
    return (
        <div className="p-4 text-xs" style={stubStyle}>
            {t('views.tree.placeholder')}
        </div>
    );
}
