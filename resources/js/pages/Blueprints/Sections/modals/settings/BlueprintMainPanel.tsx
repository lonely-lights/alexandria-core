import { useForm } from "@inertiajs/react";

import ActionButton from "@alexandria/components/ui/ActionButton";
import Input from "@alexandria/components/form/Input";
import Textarea from "@alexandria/components/form/Textarea";
import { classificationLabel } from "@alexandria/config/classifications";
import useT from "@alexandria/hooks/useT";
import { pageUrl } from "@alexandria/lib/urls";
import type {
    BlueprintDetail,
    SiblingBlueprint,
} from "@alexandria/types/blueprints";

import PanelHeader from "./PanelHeader";
import {
    aboutRowStyle,
    badgeOnTintedPanelStyle,
    badgePrimaryStyle,
    footerDividerStyle,
    helperStyle,
    iconPreviewWrapStyle,
    infoBoxStyle,
    infoTextStyle,
    primaryTextStyle,
    selectStyle,
} from "./settingsPanelStyles";

/**
 * Identity panel — name / slug / description / icon plus the read-only
 * "About" sub-section that surfaces classification and any blueprints
 * that reference this one.
 */
export default function BlueprintMainPanel({
    blueprint,
    project,
    onClose,
    referencingRelationshipBlueprints,
}: {
    blueprint: BlueprintDetail;
    project: { slug: string };
    onClose: () => void;
    referencingRelationshipBlueprints: SiblingBlueprint[];
}) {
    const t = useT();
    const form = useForm({
        name: blueprint.name,
        slug: blueprint.slug,
        description: blueprint.description ?? "",
        icon: blueprint.icon,
        // Preserve existing values that won't be edited here
        show_on_dashboard: blueprint.show_on_dashboard,
        is_linkable: blueprint.is_linkable,
        is_hub: blueprint.is_hub,
        show_tree_view: blueprint.show_tree_view,
        enable_timeline: blueprint.enable_timeline,
        classification: blueprint.classification,
        list_selection_mode: blueprint.list_selection_mode,
    });

    const iconClass = form.data.icon.includes(" ")
        ? form.data.icon
        : `fa-solid ${form.data.icon}`;

    function handleSave() {
        form.put(pageUrl(project.slug, blueprint.slug), {
            onSuccess: () => onClose(),
        });
    }

    return (
        <>
            <div className="flex-1 overflow-y-auto">
                {/* Identity — golden-ratio split: Name/Description on left, Icon on right */}
                <div
                    className="grid gap-4 p-5"
                    style={{ gridTemplateColumns: "1.618fr 1fr" }}
                >
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label={t("blueprints.bp_settings.main.name")}
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData("name", e.currentTarget.value)
                                }
                                error={form.errors.name}
                                maxLength={255}
                            />
                            <Input
                                label={t("blueprints.bp_settings.main.slug")}
                                value={form.data.slug}
                                onChange={(e) =>
                                    form.setData("slug", e.currentTarget.value)
                                }
                                error={form.errors.slug}
                                className="font-mono"
                                maxLength={255}
                            />
                        </div>
                        <Textarea
                            label={t(
                                "blueprints.bp_settings.main.description_label",
                            )}
                            value={form.data.description}
                            onChange={(e) =>
                                form.setData(
                                    "description",
                                    e.currentTarget.value,
                                )
                            }
                            placeholder={t(
                                "blueprints.bp_settings.main.description_placeholder",
                            )}
                            rows={4}
                            maxLength={2000}
                        />
                    </div>
                    <div className="form-control w-full">
                        <label className="label py-1">
                            <span
                                className="label-text text-xs"
                                style={helperStyle}
                            >
                                {t("blueprints.bp_settings.main.icon_label")}
                            </span>
                        </label>
                        <div className="flex flex-col items-center gap-3">
                            <Input
                                value={form.data.icon}
                                onChange={(e) =>
                                    form.setData("icon", e.currentTarget.value)
                                }
                                placeholder="fa-solid fa-user"
                                className="w-full font-mono text-xs"
                                hint={
                                    <>
                                        {t(
                                            "blueprints.bp_settings.main.icon_hint_prefix",
                                        )}{" "}
                                        <a
                                            href="https://fontawesome.com/icons"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:underline"
                                            style={primaryTextStyle}
                                        >
                                            FontAwesome
                                        </a>{" "}
                                        {t(
                                            "blueprints.bp_settings.main.icon_hint_suffix",
                                        )}
                                    </>
                                }
                            />
                            <div
                                className="flex h-24 w-24 flex-shrink-0 items-center justify-center"
                                style={iconPreviewWrapStyle}
                            >
                                <i
                                    className={`${iconClass} text-4xl`}
                                    style={primaryTextStyle}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* About — unified sub-section for read-only metadata */}
                <PanelHeader
                    title={t("blueprints.bp_settings.about.title")}
                    description={t("blueprints.bp_settings.about.description")}
                />
                <div className="space-y-3 p-5">
                    <div
                        className="flex items-center justify-between px-4 py-3"
                        style={aboutRowStyle}
                    >
                        <div>
                            <span className="text-sm font-medium">
                                {t(
                                    "blueprints.bp_settings.about.classification",
                                )}
                            </span>
                            <p className="text-xs" style={helperStyle}>
                                {t(
                                    "blueprints.bp_settings.about.classification_hint",
                                )}
                            </p>
                        </div>
                        <span style={{ ...badgePrimaryStyle, fontWeight: 700 }}>
                            {classificationLabel(blueprint.classification)}
                        </span>
                    </div>
                    {form.data.classification === "list" && (
                        <div
                            className="flex items-center justify-between px-4 py-3"
                            style={aboutRowStyle}
                        >
                            <div>
                                <span className="text-sm font-medium">
                                    {t(
                                        "blueprints.bp_settings.about.selection_mode",
                                    )}
                                </span>
                                <p className="text-xs" style={helperStyle}>
                                    {t(
                                        "blueprints.bp_settings.about.selection_mode_hint",
                                    )}
                                </p>
                            </div>
                            <select
                                value={form.data.list_selection_mode}
                                onChange={(e) =>
                                    form.setData(
                                        "list_selection_mode",
                                        e.target.value as "single" | "multiple",
                                    )
                                }
                                className="px-2 py-1 text-sm focus:outline-none focus:ring-2"
                                style={selectStyle}
                            >
                                <option value="single">
                                    {t(
                                        "blueprints.bp_settings.about.selection_single",
                                    )}
                                </option>
                                <option value="multiple">
                                    {t(
                                        "blueprints.bp_settings.about.selection_multiple",
                                    )}
                                </option>
                            </select>
                        </div>
                    )}
                    {referencingRelationshipBlueprints.length > 0 && (
                        <div className="p-4" style={infoBoxStyle}>
                            <h4
                                className="mb-2 text-xs font-semibold"
                                style={infoTextStyle}
                            >
                                <i className="fa-solid fa-circle-info mr-1" />{" "}
                                {t(
                                    "blueprints.bp_settings.about.referenced_by",
                                )}
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {referencingRelationshipBlueprints.map((rb) => (
                                    <span
                                        key={rb.id}
                                        style={{
                                            ...badgeOnTintedPanelStyle,
                                            gap: "0.25rem",
                                        }}
                                    >
                                        <i
                                            className={`${rb.icon ? (rb.icon.includes(" ") ? rb.icon : `fa-solid ${rb.icon}`) : "fa-solid fa-link"} text-[10px]`}
                                        />
                                        {rb.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
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
