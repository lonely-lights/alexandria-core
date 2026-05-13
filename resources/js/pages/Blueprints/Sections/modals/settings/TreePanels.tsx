import { useState } from "react";
import { router } from "@inertiajs/react";
import useT from "@alexandria/hooks/useT";
import type { BlueprintDetail } from "@alexandria/types/blueprints";
import type { FormDataConvertible } from "@inertiajs/core";
import SettingsActivationToggle from "./SettingsActivationToggle";

/* ── Tree Activation Panel ──
   Shown at the top of the Tree settings menu. Owns the enable/disable
   toggle and self-saves via router.put. Mirrors the Timeline/Kanban
   settings pattern so all views are configured the same way.

   Structural blueprints have Tree view implicitly enabled via
   classification — this panel isn't rendered for them.
*/
export function TreeActivationPanel({
    blueprint,
    project,
}: {
    blueprint: BlueprintDetail;
    project: { slug: string };
}) {
    const t = useT();
    const [enabled, setEnabled] = useState<boolean>(blueprint.show_tree_view);
    const [saving, setSaving] = useState(false);

    function handleToggle(next: boolean) {
        setEnabled(next);
        setSaving(true);
        router.put(
            `/p/${project.slug}/${blueprint.slug}`,
            {
                name: blueprint.name,
                description: blueprint.description ?? "",
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
        <SettingsActivationToggle
            title={t("blueprints.settings.tree.title")}
            description={t("blueprints.settings.tree.description")}
            enabled={enabled}
            onChange={handleToggle}
            disabled={saving}
            statusLine={saving ? t("common.saving") : undefined}
        />
    );
}
