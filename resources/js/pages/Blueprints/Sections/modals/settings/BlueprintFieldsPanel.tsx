import { useEffect, useRef, useState } from "react";
import Sortable from "sortablejs";
import { router } from "@inertiajs/react";
import type { FormDataConvertible } from "@inertiajs/core";

import ActionButton from "@alexandria/components/ui/ActionButton";
import Input from "@alexandria/components/form/Input";
import Select from "@alexandria/components/form/Select";
import ReorderModeToggle from "@alexandria/components/ui/ReorderModeToggle";
import TemporalFieldConfig from "@alexandria/components/form/TemporalFieldConfig";
import { FIELD_TYPES } from "@alexandria/config/fieldTypes";
import { useBlueprintFields } from "@alexandria/hooks/useBlueprintFields";
import { useReorderMode } from "@alexandria/hooks/useReorderMode";
import useT from "@alexandria/hooks/useT";
import type {
    BlueprintDetail,
    SiblingBlueprint,
} from "@alexandria/types/blueprints";

import {
    TOGGLE_ACCENT_COLOR,
    addFieldBtnStyle,
    badgeErrorSmallStyle,
    dragHandleStyle,
    errorTextStyle,
    fieldExpandedBodyStyle,
    fieldRowStyle,
    footerDividerStyle,
    helperFainterStyle,
    helperSoftStyle,
    rosePanelStyle,
    violetPanelStyle,
} from "./settingsPanelStyles";

/**
 * Schema > Fields panel — list of blueprint fields with inline editing,
 * drag-or-arrow reorder, per-field-type config sub-panels (entry_reference,
 * relationship_manager, temporal), and add/remove.
 */
export default function BlueprintFieldsPanel({
    blueprint,
    project,
    listableBlueprints,
    relationshipBlueprints,
    onClose,
}: {
    blueprint: BlueprintDetail;
    project: { slug: string };
    listableBlueprints: SiblingBlueprint[];
    relationshipBlueprints: SiblingBlueprint[];
    onClose: () => void;
}) {
    const t = useT();
    const {
        fields,
        expandedIndex,
        setExpandedIndex,
        addField,
        removeField,
        moveField,
        reorderFields,
        updateField,
        updateValidationRule,
    } = useBlueprintFields(blueprint.fields);
    const [saving, setSaving] = useState(false);
    const [reorderMode, setReorderMode] = useReorderMode();
    const fieldsListRef = useRef<HTMLDivElement>(null);

    // SortableJS for fields drag reorder — only active when reorderMode === 'drag'
    useEffect(() => {
        if (reorderMode !== "drag") return;
        const el = fieldsListRef.current;
        if (!el) return;
        const sortable = Sortable.create(el, {
            handle: ".fields-drag-handle",
            animation: 150,
            ghostClass: "opacity-30",
            onEnd: (evt) => {
                const { oldIndex, newIndex, from, item } = evt;
                if (
                    oldIndex == null ||
                    newIndex == null ||
                    oldIndex === newIndex
                )
                    return;
                // Revert DOM so React stays in control
                from.removeChild(item);
                const ref = from.children[oldIndex];
                ref ? from.insertBefore(item, ref) : from.appendChild(item);
                reorderFields(oldIndex, newIndex);
            },
        });
        return () => sortable.destroy();
    }, [fields.length, reorderMode, reorderFields]);

    function handleSave() {
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
                show_tree_view: blueprint.show_tree_view,
                enable_timeline: blueprint.enable_timeline,
                classification: blueprint.classification,
                list_selection_mode: blueprint.list_selection_mode,
                fields: JSON.parse(JSON.stringify(fields)),
                infobox_schema: JSON.parse(
                    JSON.stringify(blueprint.infobox_schema),
                ),
            } as Record<string, FormDataConvertible>,
            {
                onSuccess: () => {
                    setSaving(false);
                    onClose();
                },
                onError: () => setSaving(false),
            },
        );
    }

    return (
        <>
            <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-2 flex justify-end">
                    <ReorderModeToggle
                        mode={reorderMode}
                        onChange={setReorderMode}
                    />
                </div>
                <div ref={fieldsListRef} className="space-y-1.5">
                    {fields.map((field, index) => {
                        const tc = FIELD_TYPES[field.type] ?? FIELD_TYPES.text;
                        const isExpanded = expandedIndex === index;

                        return (
                            <div
                                key={`${field.id ?? "new"}-${index}`}
                                style={fieldRowStyle}
                            >
                                {/* Header */}
                                <div
                                    className="flex cursor-pointer items-center gap-3 px-3 py-2"
                                    onClick={() =>
                                        setExpandedIndex(
                                            isExpanded ? null : index,
                                        )
                                    }
                                >
                                    {reorderMode === "drag" && (
                                        <div
                                            className="fields-drag-handle flex-shrink-0 cursor-grab active:cursor-grabbing"
                                            style={dragHandleStyle}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <i className="fa-solid fa-grip-vertical text-sm" />
                                        </div>
                                    )}
                                    <i
                                        className={`${tc.icon} ${tc.color} w-4 text-center text-xs`}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <span className="text-sm font-medium">
                                            {field.label || (
                                                <span
                                                    className="italic"
                                                    style={helperSoftStyle}
                                                >
                                                    {t(
                                                        "blueprints.bp_settings.fields.untitled",
                                                    )}
                                                </span>
                                            )}
                                        </span>
                                        <span
                                            className="ml-2 font-mono text-xs"
                                            style={helperSoftStyle}
                                        >
                                            {field.name || ""}
                                        </span>
                                    </div>
                                    {field.is_required && (
                                        <span style={badgeErrorSmallStyle}>
                                            {t(
                                                "blueprints.bp_settings.fields.required_badge",
                                            )}
                                        </span>
                                    )}
                                    {reorderMode === "arrows" && (
                                        <div
                                            className="flex gap-0.5"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    moveField(index, -1)
                                                }
                                                disabled={index === 0}
                                                className="alex-btn alex-btn--ghost inline-flex h-4 items-center justify-center px-1 disabled:opacity-20"
                                                style={{
                                                    borderRadius:
                                                        "var(--theme-radius-button)",
                                                }}
                                            >
                                                <i className="fa-solid fa-chevron-up text-[9px]" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    moveField(index, 1)
                                                }
                                                disabled={
                                                    index === fields.length - 1
                                                }
                                                className="alex-btn alex-btn--ghost inline-flex h-4 items-center justify-center px-1 disabled:opacity-20"
                                                style={{
                                                    borderRadius:
                                                        "var(--theme-radius-button)",
                                                }}
                                            >
                                                <i className="fa-solid fa-chevron-down text-[9px]" />
                                            </button>
                                        </div>
                                    )}
                                    <i
                                        className={`fa-solid fa-chevron-right text-[9px] transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                        style={helperSoftStyle}
                                    />
                                </div>

                                {/* Expanded */}
                                {isExpanded && (
                                    <div
                                        className="px-3 py-3"
                                        style={fieldExpandedBodyStyle}
                                    >
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                label={t(
                                                    "blueprints.bp_settings.fields.label",
                                                )}
                                                size="xs"
                                                value={field.label}
                                                onChange={(e) =>
                                                    updateField(index, {
                                                        label: e.currentTarget
                                                            .value,
                                                    })
                                                }
                                                autoFocus
                                            />
                                            <Input
                                                label={t(
                                                    "blueprints.bp_settings.fields.key",
                                                )}
                                                size="xs"
                                                value={field.name}
                                                onChange={(e) =>
                                                    updateField(index, {
                                                        name: e.currentTarget
                                                            .value,
                                                    })
                                                }
                                                className="font-mono"
                                            />
                                            <Select
                                                label={t(
                                                    "blueprints.bp_settings.fields.type",
                                                )}
                                                size="xs"
                                                value={field.type}
                                                onChange={(e) =>
                                                    updateField(index, {
                                                        type: e.currentTarget
                                                            .value,
                                                    })
                                                }
                                                options={Object.entries(
                                                    FIELD_TYPES,
                                                ).map(([k, c]) => ({
                                                    value: k,
                                                    label: c.label,
                                                }))}
                                            />
                                            <Input
                                                label={t(
                                                    "blueprints.bp_settings.fields.help_text",
                                                )}
                                                size="xs"
                                                value={field.description ?? ""}
                                                onChange={(e) =>
                                                    updateField(index, {
                                                        description:
                                                            e.currentTarget
                                                                .value || null,
                                                    })
                                                }
                                                placeholder={t(
                                                    "blueprints.bp_settings.fields.help_placeholder",
                                                )}
                                            />
                                        </div>

                                        <div className="mt-2 flex items-center justify-between">
                                            <label className="flex cursor-pointer items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={field.is_required}
                                                    onChange={(e) =>
                                                        updateField(index, {
                                                            is_required:
                                                                e.target
                                                                    .checked,
                                                        })
                                                    }
                                                    style={{
                                                        accentColor:
                                                            TOGGLE_ACCENT_COLOR,
                                                    }}
                                                />
                                                <span className="text-xs">
                                                    {t("common.required")}
                                                </span>
                                            </label>
                                            <label
                                                className="flex cursor-pointer items-center gap-2"
                                                title={t(
                                                    "blueprints.bp_settings.fields.ai_sorting_hint",
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        field.include_in_ai_sorting !==
                                                        false
                                                    }
                                                    onChange={(e) =>
                                                        updateField(index, {
                                                            include_in_ai_sorting:
                                                                e.target
                                                                    .checked,
                                                        })
                                                    }
                                                    style={{
                                                        accentColor:
                                                            TOGGLE_ACCENT_COLOR,
                                                    }}
                                                />
                                                <span className="text-xs">
                                                    {t(
                                                        "blueprints.bp_settings.fields.ai_sorting_label",
                                                    )}
                                                </span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeField(index)
                                                }
                                                className="alex-btn alex-btn--ghost inline-flex items-center gap-1 px-2 py-1 text-xs"
                                                style={{
                                                    ...errorTextStyle,
                                                    borderRadius:
                                                        "var(--theme-radius-button)",
                                                }}
                                            >
                                                <i className="fa-solid fa-trash text-[10px]" />
                                            </button>
                                        </div>

                                        {/* Entry Reference config */}
                                        {field.type === "entry_reference" && (
                                            <div
                                                className="mt-2 space-y-2 p-3"
                                                style={violetPanelStyle}
                                            >
                                                <Select
                                                    label={t(
                                                        "blueprints.bp_settings.fields.choose_list",
                                                    )}
                                                    size="xs"
                                                    value={
                                                        (field.validation_rules
                                                            .target_blueprint_slug as string) ??
                                                        ""
                                                    }
                                                    onChange={(e) =>
                                                        updateValidationRule(
                                                            index,
                                                            "target_blueprint_slug",
                                                            e.currentTarget
                                                                .value || null,
                                                        )
                                                    }
                                                    placeholder={t(
                                                        "blueprints.bp_settings.fields.choose_list_placeholder",
                                                    )}
                                                    options={listableBlueprints.map(
                                                        (bp) => ({
                                                            value: bp.slug,
                                                            label: bp.name,
                                                        }),
                                                    )}
                                                />
                                            </div>
                                        )}

                                        {field.type ===
                                            "relationship_manager" && (
                                            <div
                                                className="mt-2 p-3"
                                                style={rosePanelStyle}
                                            >
                                                <Select
                                                    label={t(
                                                        "blueprints.bp_settings.fields.relationship_blueprint",
                                                    )}
                                                    size="xs"
                                                    value={
                                                        (field.validation_rules
                                                            .target_relationship_blueprint_slug as string) ??
                                                        ""
                                                    }
                                                    onChange={(e) =>
                                                        updateValidationRule(
                                                            index,
                                                            "target_relationship_blueprint_slug",
                                                            e.currentTarget
                                                                .value || null,
                                                        )
                                                    }
                                                    placeholder={t(
                                                        "blueprints.bp_settings.fields.relationship_placeholder",
                                                    )}
                                                    options={relationshipBlueprints.map(
                                                        (bp) => ({
                                                            value: bp.slug,
                                                            label: bp.name,
                                                        }),
                                                    )}
                                                />
                                            </div>
                                        )}

                                        {field.type === "temporal" && (
                                            <TemporalFieldConfig
                                                field={field}
                                                index={index}
                                                listableBlueprints={
                                                    listableBlueprints
                                                }
                                                onUpdateRule={
                                                    updateValidationRule
                                                }
                                                size="xs"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {fields.length === 0 && (
                        <p
                            className="py-6 text-center text-sm italic"
                            style={helperSoftStyle}
                        >
                            {t("blueprints.bp_settings.fields.empty")}
                        </p>
                    )}
                </div>

                {/* Add field */}
                <button
                    type="button"
                    onClick={addField}
                    className="alex-row mt-3 flex w-full items-center justify-center gap-2 py-2 text-xs"
                    style={addFieldBtnStyle}
                >
                    <i className="fa-solid fa-plus" />{" "}
                    {t("blueprints.bp_settings.fields.add")}
                </button>
            </div>

            <div
                className="flex items-center justify-between px-5 py-3"
                style={footerDividerStyle}
            >
                <p className="text-xs" style={helperFainterStyle}>
                    {t(
                        fields.length === 1
                            ? "blueprints.bp_settings.fields.count.singular"
                            : "blueprints.bp_settings.fields.count.plural",
                    ).replace(":count", String(fields.length))}
                </p>
                <div className="flex gap-2">
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
                        loading={saving}
                    />
                </div>
            </div>
        </>
    );
}
