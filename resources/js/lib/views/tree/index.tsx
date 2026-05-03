import TreeView from '@alexandria/pages/Blueprints/Sections/TreeView';
import type { BlueprintViewDefinition, ViewRenderProps } from '../types';
import TreeSettingsPanel from './TreeSettingsPanel';

/**
 * Registry adapter for the existing TreeView component.
 * Note: in Phase 0, this render stub is not actually invoked — the
 * Blueprints Show page still renders <TreeView> directly. The registry
 * uses the `type`, `label`, `icon`, `access`, and classification
 * metadata to drive <ViewToggle>. The render stub will become live
 * when Tree + Timeline are migrated to the registry's render flow
 * (likely alongside the first greenfield view like Kanban).
 */
function TreeRender({ blueprint, projectSlug }: ViewRenderProps) {
    return (
        <TreeView
            projectId={0 /* Phase 0: render stub not invoked — real wiring deferred */}
            blueprint={blueprint}
            project={{ id: 0, name: '', slug: projectSlug }}
        />
    );
}

export const TreeViewDef: BlueprintViewDefinition = {
    type: 'tree',
    label: 'Hierarchy',
    icon: 'fa-solid fa-sitemap',
    access: { type: 'free' },
    supportedClassifications: ['structural', 'standard', 'list'],
    render: TreeRender,
    settingsPanel: TreeSettingsPanel,
    defaultConfig: () => ({}),
};
