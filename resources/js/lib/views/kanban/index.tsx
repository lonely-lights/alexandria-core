import type { BlueprintViewDefinition, ViewRenderProps, ViewSettingsProps } from '../types';
import KanbanView from './KanbanView';
import type { KanbanConfig } from './types';
import { defaultKanbanConfig } from './types';

/**
 * Registry adapter for Kanban. Unlike Tree/Timeline (which still render
 * through the legacy hardcoded path in Show.tsx), Kanban's render IS live
 * via the registry — Show.tsx's new registry-render branch invokes this.
 */
function KanbanRender({ blueprint, projectSlug, config }: ViewRenderProps) {
    const kanbanConfig = config as unknown as KanbanConfig;
    // Project id + blueprint id are needed by the fetcher. Show.tsx
    // passes them through in the render props; we widen the type at
    // the call site since the registry's baseline ViewRenderProps is
    // intentionally minimal.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const widened = blueprint as any;

    return (
        <KanbanView
            projectId={widened.projectId}
            projectSlug={projectSlug}
            blueprintId={blueprint.id}
            blueprintSlug={blueprint.slug}
            config={kanbanConfig}
            onOpenSettings={() => {
                window.dispatchEvent(
                    new CustomEvent('alexandria:open-blueprint-settings', { detail: { menu: 'kanban' } }),
                );
            }}
        />
    );
}

/**
 * Registry-level settings panel — an informational pointer, NOT the
 * real configuration UI. Kanban's real settings live in
 * `pages/Blueprints/Sections/modals/settings/KanbanPanel.tsx` as a
 * dedicated menu item in the BlueprintSettingsModal (same pattern as
 * Timeline). This placeholder exists because the registry contract
 * requires a settingsPanel, but any future generic "view settings"
 * flow should route users to the dedicated Kanban menu rather than
 * render this component.
 */
function KanbanRegistryPanelPlaceholder(_: ViewSettingsProps) {
    return (
        <div className="rounded-lg border border-base-content/10 bg-base-100 p-4 text-xs text-base-content/50">
            Kanban is configured via the dedicated <span className="font-semibold">Kanban</span> menu
            item in Blueprint Settings.
        </div>
    );
}

export const KanbanViewDef: BlueprintViewDefinition = {
    type: 'kanban',
    label: 'Board',
    icon: 'fa-solid fa-table-columns',
    access: { type: 'tier', minTier: 'starter' },
    supportedClassifications: ['standard', 'list'],
    render: KanbanRender,
    settingsPanel: KanbanRegistryPanelPlaceholder,
    defaultConfig: () => defaultKanbanConfig() as unknown as Record<string, unknown>,
};
