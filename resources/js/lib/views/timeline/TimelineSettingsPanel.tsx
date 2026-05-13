import type { CSSProperties } from 'react';
import type { ViewSettingsProps } from '../types';

/**
 * Timeline's existing configuration modal is managed by
 * BlueprintSettingsModal's Timeline panel. Once that panel is
 * migrated into the registry settings flow, replace this stub
 * with the full config UI.
 */
const stubStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

export default function TimelineSettingsPanel(_: ViewSettingsProps) {
    return (
        <div className="p-4 text-xs" style={stubStyle}>
            Timeline configuration is managed in the Timeline settings panel.
        </div>
    );
}
