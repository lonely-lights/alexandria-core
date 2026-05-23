import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { useForm } from "@inertiajs/react";

import ActionButton from "@alexandria/components/ui/ActionButton";
import useT from "@alexandria/hooks/useT";
import type { BlueprintDetail } from "@alexandria/types/blueprints";

import SettingsActivationToggle from "./SettingsActivationToggle";
import { footerDividerStyle } from "./settingsPanelStyles";

const aliasInputStyle: CSSProperties = {
    background: "var(--theme-base-surface)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
    borderRadius: "var(--theme-radius-input)",
    color: "var(--theme-base-content)",
};

const aliasChipStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
    borderRadius: "var(--theme-radius-pill)",
    color: "var(--theme-base-content)",
};

const aliasEmptyStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

/**
 * Behavior panel — toggles for dashboard visibility, wiki-style linking,
 * and nav-hub status. Lives under the "settings" nav-menu key; named
 * "Behavior" here to disambiguate from the modal shell file.
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
        show_tree_view: blueprint.show_tree_view,
        enable_timeline: blueprint.enable_timeline,
        allow_ai_sorting: blueprint.allow_ai_sorting,
        tag_aliases: blueprint.tag_aliases ?? [],
        classification: blueprint.classification,
        list_selection_mode: blueprint.list_selection_mode,
    });

    const [aliasDraft, setAliasDraft] = useState("");

    function commitAlias() {
        const trimmed = aliasDraft.trim();
        if (!trimmed) return;
        const exists = form.data.tag_aliases.some(
            (a) => a.toLowerCase() === trimmed.toLowerCase(),
        );
        if (!exists) {
            form.setData("tag_aliases", [...form.data.tag_aliases, trimmed]);
        }
        setAliasDraft("");
    }

    function removeAlias(index: number) {
        const next = form.data.tag_aliases.filter((_, i) => i !== index);
        form.setData("tag_aliases", next);
    }

    function onAliasKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commitAlias();
        } else if (
            e.key === "Backspace" &&
            aliasDraft === "" &&
            form.data.tag_aliases.length > 0
        ) {
            // Pop-on-backspace when the field is empty — the common chips UX.
            removeAlias(form.data.tag_aliases.length - 1);
        }
    }

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
                <SettingsActivationToggle
                    title={t(
                        "blueprints.bp_settings.behavior.allow_ai_sorting.title",
                    )}
                    description={t(
                        "blueprints.bp_settings.behavior.allow_ai_sorting.description",
                    )}
                    enabled={form.data.allow_ai_sorting}
                    onChange={(v) => form.setData("allow_ai_sorting", v)}
                />
                {form.data.allow_ai_sorting && (
                    <div className="space-y-2 pt-1">
                        <div>
                            <div className="text-sm font-medium">
                                {t(
                                    "blueprints.bp_settings.behavior.tag_aliases.title",
                                )}
                            </div>
                            <div
                                className="text-xs"
                                style={aliasEmptyStyle}
                            >
                                {t(
                                    "blueprints.bp_settings.behavior.tag_aliases.description",
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {form.data.tag_aliases.map((alias, i) => (
                                <span
                                    key={`${alias}-${i}`}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs"
                                    style={aliasChipStyle}
                                >
                                    {alias}
                                    <button
                                        type="button"
                                        aria-label={t(
                                            "blueprints.bp_settings.behavior.tag_aliases.remove",
                                        )}
                                        onClick={() => removeAlias(i)}
                                        className="opacity-60 hover:opacity-100"
                                    >
                                        <i className="fa-solid fa-xmark" />
                                    </button>
                                </span>
                            ))}
                            {form.data.tag_aliases.length === 0 && (
                                <span
                                    className="text-xs italic"
                                    style={aliasEmptyStyle}
                                >
                                    {t(
                                        "blueprints.bp_settings.behavior.tag_aliases.empty",
                                    )}
                                </span>
                            )}
                        </div>
                        <input
                            type="text"
                            value={aliasDraft}
                            onChange={(e) => setAliasDraft(e.target.value)}
                            onKeyDown={onAliasKeyDown}
                            onBlur={commitAlias}
                            placeholder={t(
                                "blueprints.bp_settings.behavior.tag_aliases.placeholder",
                            )}
                            className="w-full px-3 py-1.5 text-sm focus:outline-none"
                            style={aliasInputStyle}
                        />
                    </div>
                )}
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
