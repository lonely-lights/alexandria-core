import { useState } from 'react';
import { router } from '@inertiajs/react';
import type { BlueprintDetail } from '@alexandria/types/blueprints';
import type { FormDataConvertible } from '@inertiajs/core';

/* ── Tree Activation Panel ──
   Shown at the top of the Tree settings menu. Owns the enable/disable
   toggle and self-saves via router.put. Mirrors the Timeline/Kanban
   settings pattern so all views are configured the same way.

   Structural blueprints have Tree view implicitly enabled via
   classification — this panel isn't rendered for them.
*/
export function TreeActivationPanel({ blueprint, project }: {
    blueprint: BlueprintDetail;
    project: { slug: string };
}) {
    const [enabled, setEnabled] = useState<boolean>(blueprint.show_tree_view);
    const [saving, setSaving] = useState(false);

    function handleToggle(next: boolean) {
        setEnabled(next);
        setSaving(true);
        router.put(
            `/p/${project.slug}/${blueprint.slug}`,
            {
                name: blueprint.name,
                description: blueprint.description ?? '',
                icon: blueprint.icon,
                show_on_dashboard: blueprint.show_on_dashboard,
                is_linkable: blueprint.is_linkable,
                is_hub: blueprint.is_hub,
                show_tree_view: next,
                enable_timeline: blueprint.enable_timeline,
                classification: blueprint.classification,
                list_selection_mode: blueprint.list_selection_mode,
            } as Record<string, FormDataConvertible>,
            {
                onSuccess: () => setSaving(false),
                onError: () => {
                    setSaving(false);
                    setEnabled(!next); // rollback optimistic state
                },
            },
        );
    }

    return (
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-base-content/10 bg-base-100 p-4 transition-colors hover:bg-base-200/50">
            <div>
                <p className="text-sm font-medium">Hierarchy View</p>
                <p className="mt-0.5 text-xs text-base-content/50">
                    Render entries as a nested tree based on their parent/child
                    relationships. Per-entry structure (children label, depth,
                    display mode) is configured on each entry individually.
                </p>
                {saving && <p className="mt-1 text-[10px] text-base-content/40">Saving…</p>}
            </div>
            <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={enabled}
                onChange={(e) => handleToggle(e.target.checked)}
                disabled={saving}
            />
        </label>
    );
}
