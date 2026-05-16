import type { CSSProperties } from 'react';
import useT from '@alexandria/hooks/useT';
import type { BlueprintViewDefinition, ViewRenderProps, ViewSettingsProps } from '../types';
import GraphView from './GraphView';
import type { GraphConfig } from './types';
import { defaultGraphConfig } from './types';

const stubStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

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
    const t = useT();
    return (
        <div className="p-4 text-xs" style={stubStyle}>
            {t('views.graph.placeholder')}
        </div>
    );
}

export const GraphViewDef: BlueprintViewDefinition = {
    type: 'graph',
    label: 'Graph',
    icon: 'fa-solid fa-diagram-project',
    access: { type: 'free' },
    supportedClassifications: ['standard', 'list'],
    render: GraphRender,
    settingsPanel: GraphRegistryPanelPlaceholder,
    defaultConfig: () => defaultGraphConfig() as unknown as Record<string, unknown>,
};
