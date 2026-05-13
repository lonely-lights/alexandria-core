import { useState, useCallback, type CSSProperties } from "react";
import { router } from "@inertiajs/react";
import type { FormDataConvertible } from "@inertiajs/core";
import Input from "@alexandria/components/form/Input";
import Select from "@alexandria/components/form/Select";
import { FIELD_TYPES } from "@alexandria/config/fieldTypes";
import { useBlueprintFields } from "@alexandria/hooks/useBlueprintFields";
import useT from "@alexandria/hooks/useT";
import TemporalFieldConfig from "@alexandria/components/form/TemporalFieldConfig";
import type {
    BlueprintDetail,
    SiblingBlueprint,
} from "@alexandria/types/blueprints";

interface StructureTabProps {
    blueprint: BlueprintDetail;
    project: { slug: string };
    listableBlueprints: SiblingBlueprint[];
    relationshipBlueprints: SiblingBlueprint[];
}

/* ── Theme-token style recipes ────────────────────────────────────
 * Replaces the DaisyUI `bg-base-*` / `text-base-*` / `btn btn-*`
 * utility classes inherited from the legacy app. Keeping the recipes
 * grouped here keeps the JSX readable and means a future palette
 * tweak is one location, not 18.
 */

const fieldRowStyle: CSSProperties = {
    overflow: "hidden",
    background: "var(--theme-base-100)",
    border: "1px solid var(--theme-base-300)",
    borderRadius: "var(--theme-radius-card)",
    transition:
        "border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const expandedPanelStyle: CSSProperties = {
    borderTop: "1px solid var(--theme-base-300)",
    background: "color-mix(in srgb, var(--theme-base-200) 30%, transparent)",
};

const ghostBtnStyle: CSSProperties = {
    background: "transparent",
    color: "var(--theme-base-content)",
    borderRadius: "var(--theme-radius-button)",
};

const errorBtnStyle: CSSProperties = {
    background: "transparent",
    color: "var(--theme-status-error-stroke)",
    borderRadius: "var(--theme-radius-button)",
};

const primaryBtnStyle: CSSProperties = {
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
    borderRadius: "var(--theme-radius-button)",
};

const emptyStateStyle: CSSProperties = {
    background: "var(--theme-base-100)",
    border: "1px solid var(--theme-base-300)",
    borderRadius: "var(--theme-radius-card)",
};

const emptyIconWrapStyle: CSSProperties = {
    background: "var(--theme-base-300)",
};

const addFieldBtnStyle: CSSProperties = {
    border: "2px dashed var(--theme-base-300)",
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    transition:
        "border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const saveBarStyle: CSSProperties = {
    background: "var(--theme-base-100)",
    border: "1px solid var(--theme-base-300)",
    borderRadius: "var(--theme-radius-card)",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.18)",
};

const requiredBadgeStyle: CSSProperties = {
    background: "var(--theme-status-error-fill)",
    color: "var(--theme-status-error-content)",
    borderRadius: "var(--theme-radius-badge)",
    padding: "0.125rem 0.375rem",
    fontSize: "0.625rem",
    fontWeight: 600,
};

// Light tinted-panel recipes for the entry-reference and
// relationship-manager configuration sub-panels. Hardcoded violet/rose
// (not theme-token) because they're semantic markers — "this is the
// entry-reference panel" / "this is the relationship panel" — and
// stay constant across themes for that affordance.
const violetPanelStyle: CSSProperties = {
    background: "color-mix(in srgb, #8b5cf6 5%, transparent)",
    border: "1px solid color-mix(in srgb, #8b5cf6 20%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

const rosePanelStyle: CSSProperties = {
    background: "color-mix(in srgb, #f43f5e 5%, transparent)",
    border: "1px solid color-mix(in srgb, #f43f5e 20%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

const subtitle60: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};
const subtitle50: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};
const subtitle40: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};
const subtitle30: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};

const btnClass =
    "inline-flex items-center justify-center px-3 py-1 text-sm font-medium";
const btnXsClass = "inline-flex items-center justify-center px-2 py-1 text-xs";

export default function StructureTab({
    blueprint,
    project,
    listableBlueprints,
    relationshipBlueprints,
}: StructureTabProps) {
    const t = useT();
    const {
        fields,
        expandedIndex,
        setExpandedIndex,
        addField,
        removeField,
        moveField,
        updateField,
        updateValidationRule,
        resetFields,
    } = useBlueprintFields(blueprint.fields);
    const [saving, setSaving] = useState(false);

    const isDirty =
        JSON.stringify(fields) !==
        JSON.stringify(
            blueprint.fields.map((f, i) => ({ ...f, sort_order: i })),
        );

    const handleSave = useCallback(() => {
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
                classification: blueprint.classification,
                list_selection_mode: blueprint.list_selection_mode,
                fields: JSON.parse(JSON.stringify(fields)),
                infobox_schema: JSON.parse(
                    JSON.stringify(blueprint.infobox_schema),
                ),
            } as Record<string, FormDataConvertible>,
            {
                onSuccess: () => setSaving(false),
                onError: () => setSaving(false),
            },
        );
    }, [
        fields,
        blueprint.name,
        blueprint.slug,
        blueprint.description,
        blueprint.icon,
        blueprint.show_on_dashboard,
        blueprint.is_linkable,
        blueprint.is_hub,
        blueprint.classification,
        blueprint.list_selection_mode,
        blueprint.infobox_schema,
        project.slug,
    ]);

    function handleDiscard() {
        resetFields(blueprint.fields);
    }

    return (
        <div className="space-y-4">
            {/* Field list */}
            <div className="space-y-2">
                {fields.map((field, index) => {
                    const typeConfig =
                        FIELD_TYPES[field.type] ?? FIELD_TYPES.text;
                    const isExpanded = expandedIndex === index;

                    return (
                        <div
                            key={`${field.id ?? "new"}-${index}`}
                            style={fieldRowStyle}
                        >
                            {/* Field header */}
                            <div
                                className="flex cursor-pointer items-center gap-3 px-4 py-3"
                                onClick={() =>
                                    setExpandedIndex(isExpanded ? null : index)
                                }
                            >
                                <i
                                    className={`${typeConfig.icon} ${typeConfig.color} w-5 text-center`}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">
                                            {field.label || (
                                                <span
                                                    className="italic"
                                                    style={subtitle30}
                                                >
                                                    {t(
                                                        "blueprints.structure.field.untitled",
                                                    )}
                                                </span>
                                            )}
                                        </span>
                                        {field.is_required && (
                                            <span style={requiredBadgeStyle}>
                                                {t("common.required")}
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        className="flex items-center gap-2 text-xs"
                                        style={subtitle40}
                                    >
                                        <span className="font-mono">
                                            {field.name || "—"}
                                        </span>
                                        <span>&middot;</span>
                                        <span>{typeConfig.label}</span>
                                    </div>
                                </div>

                                {/* Reorder + expand */}
                                <div
                                    className="flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        type="button"
                                        onClick={() => moveField(index, -1)}
                                        disabled={index === 0}
                                        className={`${btnXsClass} disabled:opacity-20`}
                                        style={ghostBtnStyle}
                                    >
                                        <i className="fa-solid fa-chevron-up text-[10px]" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveField(index, 1)}
                                        disabled={index === fields.length - 1}
                                        className={`${btnXsClass} disabled:opacity-20`}
                                        style={ghostBtnStyle}
                                    >
                                        <i className="fa-solid fa-chevron-down text-[10px]" />
                                    </button>
                                </div>
                                <i
                                    className={`fa-solid fa-chevron-right text-[10px] transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                    style={subtitle30}
                                />
                            </div>

                            {/* Expanded config */}
                            {isExpanded && (
                                <div
                                    className="px-4 py-4"
                                    style={expandedPanelStyle}
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label={t(
                                                "blueprints.structure.field.label",
                                            )}
                                            value={field.label}
                                            onChange={(e) =>
                                                updateField(index, {
                                                    label: e.currentTarget
                                                        .value,
                                                })
                                            }
                                            placeholder={t(
                                                "blueprints.structure.field.label_placeholder",
                                            )}
                                            autoFocus
                                        />
                                        <Input
                                            label={t(
                                                "blueprints.structure.field.key",
                                            )}
                                            value={field.name}
                                            onChange={(e) =>
                                                updateField(index, {
                                                    name: e.currentTarget.value,
                                                })
                                            }
                                            placeholder={t(
                                                "blueprints.structure.field.key_placeholder",
                                            )}
                                            className="font-mono text-xs"
                                        />
                                        <Select
                                            label={t(
                                                "blueprints.structure.field.type",
                                            )}
                                            value={field.type}
                                            onChange={(e) =>
                                                updateField(index, {
                                                    type: e.currentTarget.value,
                                                })
                                            }
                                            options={Object.entries(
                                                FIELD_TYPES,
                                            ).map(([key, cfg]) => ({
                                                value: key,
                                                label: cfg.label,
                                            }))}
                                        />
                                        <Input
                                            label={t(
                                                "blueprints.structure.field.help_text",
                                            )}
                                            value={field.description ?? ""}
                                            onChange={(e) =>
                                                updateField(index, {
                                                    description:
                                                        e.currentTarget.value ||
                                                        null,
                                                })
                                            }
                                            placeholder={t(
                                                "blueprints.structure.field.help_text_placeholder",
                                            )}
                                        />
                                    </div>

                                    {/* Required toggle */}
                                    <label
                                        className="mt-3 flex cursor-pointer items-center gap-3 px-1 py-1"
                                        style={{
                                            borderRadius:
                                                "var(--theme-radius-button)",
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={field.is_required}
                                            onChange={(e) =>
                                                updateField(index, {
                                                    is_required:
                                                        e.target.checked,
                                                })
                                            }
                                            style={{
                                                accentColor:
                                                    "var(--theme-brand-primary-500)",
                                            }}
                                        />
                                        <span className="text-sm">
                                            {t(
                                                "blueprints.structure.field.required",
                                            )}
                                        </span>
                                    </label>

                                    {/* Entry Reference config */}
                                    {field.type === "entry_reference" && (
                                        <div
                                            className="mt-3 space-y-3 p-4"
                                            style={violetPanelStyle}
                                        >
                                            <Select
                                                label={t(
                                                    "blueprints.structure.entry_ref.choose_list",
                                                )}
                                                value={
                                                    (field.validation_rules
                                                        .target_blueprint_slug as string) ??
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    updateValidationRule(
                                                        index,
                                                        "target_blueprint_slug",
                                                        e.currentTarget.value ||
                                                            null,
                                                    )
                                                }
                                                placeholder={t(
                                                    "blueprints.structure.entry_ref.select_placeholder",
                                                )}
                                                options={listableBlueprints.map(
                                                    (bp) => ({
                                                        value: bp.slug,
                                                        label: bp.name,
                                                    }),
                                                )}
                                                hint={t(
                                                    "blueprints.structure.entry_ref.hint",
                                                )}
                                            />
                                        </div>
                                    )}

                                    {field.type === "relationship_manager" && (
                                        <div
                                            className="mt-3 p-4"
                                            style={rosePanelStyle}
                                        >
                                            <Select
                                                label={t(
                                                    "blueprints.structure.relationship.label",
                                                )}
                                                value={
                                                    (field.validation_rules
                                                        .target_relationship_blueprint_slug as string) ??
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    updateValidationRule(
                                                        index,
                                                        "target_relationship_blueprint_slug",
                                                        e.currentTarget.value ||
                                                            null,
                                                    )
                                                }
                                                placeholder={t(
                                                    "blueprints.structure.relationship.select_placeholder",
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
                                            onUpdateRule={updateValidationRule}
                                        />
                                    )}

                                    {/* Delete */}
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => removeField(index)}
                                            className={btnClass}
                                            style={errorBtnStyle}
                                        >
                                            <i className="fa-solid fa-trash mr-1 text-xs" />{" "}
                                            {t(
                                                "blueprints.structure.field.remove",
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {fields.length === 0 && (
                    <div className="py-12 text-center" style={emptyStateStyle}>
                        <div
                            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                            style={emptyIconWrapStyle}
                        >
                            <i
                                className="fa-solid fa-layer-group text-xl"
                                style={subtitle30}
                            />
                        </div>
                        <p className="font-medium" style={subtitle50}>
                            {t("blueprints.structure.empty.title")}
                        </p>
                        <p className="mt-1 text-sm" style={subtitle40}>
                            {t("blueprints.structure.empty.subtitle")}
                        </p>
                    </div>
                )}
            </div>

            {/* Add field button */}
            <button
                type="button"
                onClick={addField}
                className="flex w-full items-center justify-center gap-2 py-3 text-sm"
                style={addFieldBtnStyle}
            >
                <i className="fa-solid fa-plus" />{" "}
                {t("blueprints.structure.add_field")}
            </button>

            {/* Floating save bar */}
            {isDirty && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
                    <div
                        className="flex items-center gap-3 px-6 py-3"
                        style={saveBarStyle}
                    >
                        <span className="text-sm" style={subtitle60}>
                            {t(
                                fields.length === 1
                                    ? "blueprints.structure.field_count.singular"
                                    : "blueprints.structure.field_count.plural",
                            ).replace(":count", String(fields.length))}
                        </span>
                        <button
                            type="button"
                            onClick={handleDiscard}
                            className={btnClass}
                            style={ghostBtnStyle}
                        >
                            {t("blueprints.structure.discard")}
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className={`${btnClass} disabled:opacity-50`}
                            style={primaryBtnStyle}
                        >
                            {saving ? (
                                <i className="fa-solid fa-circle-notch fa-spin mr-1 text-xs" />
                            ) : (
                                <i className="fa-solid fa-check mr-1" />
                            )}
                            {t("blueprints.structure.save")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
