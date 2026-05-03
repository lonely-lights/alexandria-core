import type { ViewSettingsProps } from '../types';

/**
 * Timeline's existing configuration modal is managed by
 * BlueprintSettingsModal's Timeline panel. Once that panel is
 * migrated into the registry settings flow, replace this stub
 * with the full config UI.
 */
export default function TimelineSettingsPanel(_: ViewSettingsProps) {
    return (
        <div className="rounded-lg border border-base-content/10 bg-base-100 p-4 text-xs text-base-content/50">
            Timeline configuration is managed in the Timeline settings panel.
        </div>
    );
}
