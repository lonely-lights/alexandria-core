import type { BlueprintViewDefinition, ViewRenderProps, ViewSettingsProps } from '../types';
import GraphView from './GraphView';
import type { GraphConfig } from './types';
import { defaultGraphConfig } from './types';

function GraphRender({ blueprint, config }: ViewRenderProps) {
    const graphConfig = config as unknown as GraphConfig;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const widened = blueprint as any;

    return (
        <GraphView
            projectId={widened.projectId}
            blueprintId={blueprint.id}
            config={graphConfig}
            onOpenSettings={() => {
                window.dispatchEvent(
                    new CustomEvent('alexandria:open-blueprint-settings', { detail: { menu: 'graph' } }),
                );
            }}
        />
    );
}

function GraphRegistryPanelPlaceholder(_: ViewSettingsProps) {
    return (
        <div className="rounded-lg border border-base-content/10 bg-base-100 p-4 text-xs text-base-content/50">
            Graph is configured via the dedicated <span className="font-semibold">Graph</span> menu
            item in Blueprint Settings.
        </div>
    );
}

export const GraphViewDef: BlueprintViewDefinition = {
    type: 'graph',
    label: 'Graph',
    icon: 'fa-solid fa-diagram-project',
    access: { type: 'tier', minTier: 'pro' },
    supportedClassifications: ['standard', 'list'],
    render: GraphRender,
    settingsPanel: GraphRegistryPanelPlaceholder,
    defaultConfig: () => defaultGraphConfig() as unknown as Record<string, unknown>,
};
