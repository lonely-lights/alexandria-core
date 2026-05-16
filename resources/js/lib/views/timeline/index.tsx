import TimelineView from '@alexandria/pages/Blueprints/Sections/TimelineView';
import type { BlueprintViewDefinition, ViewRenderProps } from '../types';
import TimelineSettingsPanel from './TimelineSettingsPanel';

/**
 * Registry adapter for the existing TimelineView component.
 * Note: in Phase 0, this render stub is not actually invoked — the
 * Blueprints Show page still renders <TimelineView> directly. The registry
 * uses the metadata (`type`, `label`, `icon`, `access`, classifications)
 * to drive <ViewToggle>. Timeline's render flow migrates into the
 * registry in a follow-up task (bundled with the first greenfield view).
 */
function TimelineRender(_: ViewRenderProps) {
    // @ts-expect-error — Phase 0 render stub; TimelineView requires many
    // props that the current ViewRenderProps doesn't carry. Full prop
    // passing lands when Timeline is migrated into the registry render flow.
    return <TimelineView />;
}

export const TimelineViewDef: BlueprintViewDefinition = {
    type: 'timeline',
    label: 'Timeline',
    icon: 'fa-solid fa-timeline',
    access: { type: 'free' },
    supportedClassifications: ['standard', 'list'],
    render: TimelineRender,
    settingsPanel: TimelineSettingsPanel,
    defaultConfig: () => ({ date_field: null, display_start_year: null, display_end_year: null }),
};
