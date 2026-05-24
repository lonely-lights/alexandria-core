import { useForm } from "@inertiajs/react";

import ActionButton from "@alexandria/components/ui/ActionButton";
import useT from "@alexandria/hooks/useT";
import type { BlueprintDetail } from "@alexandria/types/blueprints";

import SettingsActivationToggle from "./SettingsActivationToggle";
import { footerDividerStyle } from "./settingsPanelStyles";

/**
 * Behavior panel — generic blueprint toggles for dashboard visibility,
 * wiki-style linking, and nav-hub status. The "Include in AI sorting"
 * toggle and its tag-aliases chip editor moved to BlueprintAiPanel under
 * the dedicated AI nav tab (Stage 8g.0 P4).
 */
export default function BlueprintBehaviorPanel({
    blueprint,
    project,
    onClose,
}: {
    blueprint: BlueprintDetail;
    project: { slug: string };
    onClose: () => void;
}) {
    const t = useT();
    const form = useForm({
        // Preserve identity values
        name: blueprint.name,
        description: blueprint.description ?? "",
        icon: blueprint.icon,
        // Editable behavior values
        show_on_dashboard: blueprint.show_on_dashboard,
        is_linkable: blueprint.is_linkable,
        is_hub: blueprint.is_hub,
        // Pass-through values so we don't clobber unrelated settings.
        show_tree_view: blueprint.show_tree_view,
        enable_timeline: blueprint.enable_timeline,
        allow_ai_sorting: blueprint.allow_ai_sorting,
        tag_aliases: blueprint.tag_aliases ?? [],
        classification: blueprint.classification,
        list_selection_mode: blueprint.list_selection_mode,
    });

    function handleSave() {
        form.put(`/p/${project.slug}/${blueprint.slug}`, {
            onSuccess: () => onClose(),
        });
    }

    return (
        <>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
                <SettingsActivationToggle
                    title={t(
                        "blueprints.bp_settings.behavior.show_dashboard.title",
                    )}
                    description={t(
                        "blueprints.bp_settings.behavior.show_dashboard.description",
                    )}
                    enabled={form.data.show_on_dashboard}
                    onChange={(v) => form.setData("show_on_dashboard", v)}
                />
                <SettingsActivationToggle
                    title={t(
                        "blueprints.bp_settings.behavior.wiki_links.title",
                    )}
                    description={t(
                        "blueprints.bp_settings.behavior.wiki_links.description",
                    )}
                    enabled={form.data.is_linkable}
                    onChange={(v) => form.setData("is_linkable", v)}
                />
                <SettingsActivationToggle
                    title={t("blueprints.bp_settings.behavior.nav_hub.title")}
                    description={t(
                        "blueprints.bp_settings.behavior.nav_hub.description",
                    )}
                    enabled={form.data.is_hub}
                    onChange={(v) => form.setData("is_hub", v)}
                />
            </div>

            <div
                className="flex items-center justify-end gap-2 px-5 py-3"
                style={footerDividerStyle}
            >
                <ActionButton
                    icon="fa-solid fa-xmark"
                    label={t("common.cancel")}
                    variant="ghost"
                    onClick={onClose}
                />
                <ActionButton
                    icon="fa-solid fa-check"
                    label={t("common.save")}
                    onClick={handleSave}
                    loading={form.processing}
                />
            </div>
        </>
    );
}
