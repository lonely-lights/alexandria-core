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

const placeholderCardStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-content) 3%, transparent)",
    border: "1px dashed color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
    borderRadius: "var(--theme-radius-box)",
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};

const slotLabelStyle: CSSProperties = {
    color: "var(--theme-base-content)",
};

const slotDescStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};

/**
 * AI Sorting panel — houses the activation toggle plus all metadata-slot
 * configuration that controls how the AI categorizes notes into this
 * blueprint. Toggle off = no configuration shown (since none of it applies).
 * Toggle on = scaffold for the 5 metadata slots (recognition / boundaries /
 * reference_role / creation / structural_rules) — Stage 8g.0 P4 ships the
 * activation + tag aliases as guided fields; subsequent phases ship the
 * full guided form for each slot.
 *
 * Schema reference: docs/ai/structured-schema-spec.md (v2).
 */
export default function BlueprintAiPanel({
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
        // Identity values are preserved on update — same pattern as BehaviorPanel.
        name: blueprint.name,
        description: blueprint.description ?? "",
        icon: blueprint.icon,
        // Pass-through values so we don't clobber unrelated settings.
        show_on_dashboard: blueprint.show_on_dashboard,
        is_linkable: blueprint.is_linkable,
        is_hub: blueprint.is_hub,
        show_tree_view: blueprint.show_tree_view,
        enable_timeline: blueprint.enable_timeline,
        classification: blueprint.classification,
        list_selection_mode: blueprint.list_selection_mode,
        // Editable AI values.
        allow_ai_sorting: blueprint.allow_ai_sorting,
        tag_aliases: blueprint.tag_aliases ?? [],
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
            removeAlias(form.data.tag_aliases.length - 1);
        }
    }

    function handleSave() {
        form.put(`/p/${project.slug}/${blueprint.slug}`, {
            onSuccess: () => onClose(),
        });
    }

    // The 5 metadata slots that will become guided form sections in
    // subsequent P4 phases. Listed here as placeholder cards so authors
    // see the shape of what's coming.
    const upcomingSlots: Array<{ key: string; titleKey: string; descKey: string }> = [
        {
            key: "recognition",
            titleKey: "blueprints.bp_settings.ai.slots.recognition.title",
            descKey: "blueprints.bp_settings.ai.slots.recognition.description",
        },
        {
            key: "boundaries",
            titleKey: "blueprints.bp_settings.ai.slots.boundaries.title",
            descKey: "blueprints.bp_settings.ai.slots.boundaries.description",
        },
        {
            key: "reference_role",
            titleKey: "blueprints.bp_settings.ai.slots.reference_role.title",
            descKey: "blueprints.bp_settings.ai.slots.reference_role.description",
        },
        {
            key: "creation",
            titleKey: "blueprints.bp_settings.ai.slots.creation.title",
            descKey: "blueprints.bp_settings.ai.slots.creation.description",
        },
        {
            key: "structural_rules",
            titleKey: "blueprints.bp_settings.ai.slots.structural_rules.title",
            descKey: "blueprints.bp_settings.ai.slots.structural_rules.description",
        },
    ];

    return (
        <>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {/* Headline toggle — relocated from Behavior panel. */}
                <SettingsActivationToggle
                    title={t("blueprints.bp_settings.ai.allow_sorting.title")}
                    description={t(
                        "blueprints.bp_settings.ai.allow_sorting.description",
                    )}
                    enabled={form.data.allow_ai_sorting}
                    onChange={(v) => form.setData("allow_ai_sorting", v)}
                />

                {/* Configuration surface — only meaningful when sorting is on. */}
                {form.data.allow_ai_sorting && (
                    <div className="space-y-4 pt-2">
                        {/* Tag aliases — already a guided field, relocated from Behavior. */}
                        <div className="space-y-2">
                            <div>
                                <div
                                    className="text-sm font-medium"
                                    style={slotLabelStyle}
                                >
                                    {t(
                                        "blueprints.bp_settings.ai.tag_aliases.title",
                                    )}
                                </div>
                                <div
                                    className="text-xs"
                                    style={slotDescStyle}
                                >
                                    {t(
                                        "blueprints.bp_settings.ai.tag_aliases.description",
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
                                                "blueprints.bp_settings.ai.tag_aliases.remove",
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
                                            "blueprints.bp_settings.ai.tag_aliases.empty",
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
                                    "blueprints.bp_settings.ai.tag_aliases.placeholder",
                                )}
                                className="w-full px-3 py-1.5 text-sm focus:outline-none"
                                style={aliasInputStyle}
                            />
                        </div>

                        {/* Upcoming metadata slot placeholders — these become
                            real form sections in the next P4 sub-phases. */}
                        {upcomingSlots.map((slot) => (
                            <div
                                key={slot.key}
                                className="space-y-1 px-3 py-3"
                                style={placeholderCardStyle}
                            >
                                <div
                                    className="text-sm font-medium"
                                    style={slotLabelStyle}
                                >
                                    {t(slot.titleKey)}
                                </div>
                                <div className="text-xs" style={slotDescStyle}>
                                    {t(slot.descKey)}
                                </div>
                                <div
                                    className="pt-1 text-xs italic"
                                    style={aliasEmptyStyle}
                                >
                                    {t("blueprints.bp_settings.ai.coming_soon")}
                                </div>
                            </div>
                        ))}
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
