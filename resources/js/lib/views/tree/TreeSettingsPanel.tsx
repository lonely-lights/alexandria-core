import type { ViewSettingsProps } from '../types';

/**
 * Tree has no per-view settings yet — the existing
 * BlueprintSettingsModal manages tree structure via its own panels.
 * This stub exists so the registry contract is satisfied;
 * when tree-specific view settings are added, replace with real UI.
 */
export default function TreeSettingsPanel(_: ViewSettingsProps) {
    return (
        <div className="rounded-lg border border-base-content/10 bg-base-100 p-4 text-xs text-base-content/50">
            Tree view uses the Structure settings panel for configuration.
        </div>
    );
}
