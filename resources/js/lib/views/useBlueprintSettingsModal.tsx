import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { ColumnConfigModal } from '@alexandria/pages/Blueprints/Sections/modals/BlueprintSettingsModal';
import type { BlueprintShowProps } from '@alexandria/types/blueprints';

/**
 * Shared wiring for the settings modal rendered alongside a registry-driven
 * view (Kanban, Graph, ...). Pulls the full blueprint context from the page
 * props — the registry's baseline ViewRenderProps is intentionally minimal,
 * so each view opts into this hook instead of widening the registry contract.
 *
 * Listens for the window-level `alexandria:open-blueprint-settings` event so
 * the page-level Settings button keeps working while a registry view is active.
 */
export function useBlueprintSettingsModal(defaultMenu: string) {
    const page = usePage<BlueprintShowProps>().props;
    const fullBlueprint = page.blueprint;
    const fullProject = page.project;
    const availableColumns = page.availableColumns ?? [];
    const listableBlueprints = page.listableBlueprints ?? [];
    const relationshipBlueprints = page.relationshipBlueprints ?? [];
    const referencingRelationshipBlueprints = page.referencingRelationshipBlueprints ?? [];
    const timelineBlueprints = page.timelineBlueprints;

    const [open, setOpen] = useState(false);
    const [initialMenu, setInitialMenu] = useState<string | undefined>(undefined);

    useEffect(() => {
        function handleOpenSettings(e: Event) {
            const detail = (e as CustomEvent).detail;
            setInitialMenu(detail?.menu ?? defaultMenu);
            setOpen(true);
        }
        window.addEventListener('alexandria:open-blueprint-settings', handleOpenSettings);
        return () => window.removeEventListener('alexandria:open-blueprint-settings', handleOpenSettings);
    }, [defaultMenu]);

    const modal = (
        <ColumnConfigModal
            open={open}
            onClose={() => { setOpen(false); setInitialMenu(undefined); }}
            columns={[]}
            sortableColumns={[]}
            availableColumns={availableColumns}
            onChange={() => {}}
            onSortableChange={() => {}}
            blueprintName={fullBlueprint.name}
            blueprint={fullBlueprint}
            project={fullProject}
            listableBlueprints={listableBlueprints}
            relationshipBlueprints={relationshipBlueprints}
            referencingRelationshipBlueprints={referencingRelationshipBlueprints}
            initialMenu={initialMenu}
            timelineBlueprints={timelineBlueprints}
        />
    );

    return {
        modal,
        availableColumns,
        fullBlueprint,
        fullProject,
        relationshipBlueprints,
        referencingRelationshipBlueprints,
    };
}
