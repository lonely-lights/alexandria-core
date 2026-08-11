import { router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import type { BlueprintDetail } from '@alexandria/types/blueprints';
import type { BlueprintViewEntry } from '@alexandria/lib/views/types';
import { pageUrl } from '@alexandria/lib/urls';

/**
 * Persist a single view entry by replacing (or appending) its slot in the
 * blueprint's `views` array and PUT-ing the full blueprint payload — matches
 * the save shape every settings panel (Kanban, Graph, ...) needs so they
 * don't each re-serialize the blueprint's legacy + view fields by hand.
 */
export function saveBlueprintView(
    blueprint: BlueprintDetail,
    project: { slug: string },
    viewType: string,
    entry: BlueprintViewEntry,
    callbacks?: { onSuccess?: () => void; onError?: () => void },
): void {
    const otherViews = (blueprint.views ?? []).filter((v) => v.type !== viewType);
    const nextViews = [...otherViews, entry];

    router.put(
        pageUrl(project.slug, blueprint.slug),
        {
            name: blueprint.name,
            description: blueprint.description ?? '',
            icon: blueprint.icon,
            show_on_dashboard: blueprint.show_on_dashboard,
            is_linkable: blueprint.is_linkable,
            is_hub: blueprint.is_hub,
            show_tree_view: blueprint.show_tree_view,
            enable_timeline: blueprint.enable_timeline,
            classification: blueprint.classification,
            list_selection_mode: blueprint.list_selection_mode,
            views: JSON.parse(JSON.stringify(nextViews)),
        } as Record<string, FormDataConvertible>,
        {
            // Keep React component state (form values, open settings modal, etc.)
            // and the user's scroll position so saving feels in-place — no flash,
            // no jump back to top.
            preserveState: true,
            preserveScroll: true,
            ...callbacks,
        },
    );
}
