import { useState } from "react";
import ActionButton from "@alexandria/components/ui/ActionButton";
import RevealCollapse from "@alexandria/components/ui/RevealCollapse";
import useT from "@alexandria/hooks/useT";
import type {
    AvailableColumn,
    BlueprintDetail,
} from "@alexandria/types/blueprints";
import type { BlueprintViewEntry } from "@alexandria/lib/views/types";
import { saveBlueprintView } from "@alexandria/lib/views/saveBlueprintView";
import type { KanbanConfig } from "@alexandria/lib/views/kanban/types";
import { defaultKanbanConfig } from "@alexandria/lib/views/kanban/types";
import SettingsActivationToggle from "./SettingsActivationToggle";
import {
    footerDividerStyle,
    helperStyle,
    labelStyle,
    requiredAsteriskStyle,
    selectStyle,
    warningTextStyle,
} from "./settingsPanelStyles";

interface KanbanPanelProps {
    blueprint: BlueprintDetail;
    project: { slug: string };
    availableColumns: AvailableColumn[];
}

/**
 * Dedicated Kanban settings panel. Top: enable/disable toggle +
 * description. Body: config form (group field dropdown, column sort).
 * Form controls grey out when disabled.
 *
 * Group field is a dropdown populated from the blueprint's text /
 * integer / boolean fields — no free-form text entry. Saves the
 * entire blueprint payload so views + legacy flags stay in sync.
 */
export default function KanbanPanel({
    blueprint,
    project,
    availableColumns,
}: KanbanPanelProps) {
    const t = useT();
    const existingEntry =
        (blueprint.views ?? []).find((v) => v.type === "kanban") ?? null;

    const [entry, setEntry] = useState<BlueprintViewEntry>(
        existingEntry ?? {
            type: "kanban",
            enabled: false,
            config: { ...defaultKanbanConfig() },
            sort_order: (blueprint.views ?? []).length,
        },
    );
    const [saving, setSaving] = useState(false);

    const enabled = entry.enabled;
    // `BlueprintViewEntry.config` is deliberately typed as `Record<string, unknown>`
    // so the registry stays view-agnostic. The Kanban view owns the real shape
    // (`KanbanConfig`); the `unknown` step acknowledges that to TypeScript.
    const config = entry.config as unknown as KanbanConfig;

    // Single-value fields that work as column definitions in Phase 1.
    // entry_reference + multi-select are deferred to a later phase.
    //
    // availableColumns keys field entries as `field:<name>` (see
    // BlueprintController::buildAvailableColumns), but the backend
    // kanban endpoint + stored config use the raw field name — strip
    // the prefix so option values round-trip cleanly.
    const groupableFields = availableColumns
        .filter(
            (c) =>
                c.type === "field" &&
                ["text", "integer", "boolean"].includes(
                    c.field_type?.toLowerCase() ?? "",
                ),
        )
        .map((c) => ({
            name: c.key.replace(/^field:/, ""),
            label: c.label,
        }));

    function updateConfig(patch: Partial<KanbanConfig>) {
        setEntry((prev) => ({
            ...prev,
            config: { ...(prev.config as unknown as KanbanConfig), ...patch },
        }));
    }

    function handleSave() {
        setSaving(true);
        saveBlueprintView(blueprint, project, "kanban", entry, {
            onSuccess: () => setSaving(false),
            onError: () => setSaving(false),
        });
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {/* Enable/disable — same chrome as Tree/Timeline toggles so
                    users recognize the pattern. */}
                <SettingsActivationToggle
                    title={t("blueprints.settings.kanban.title")}
                    description={t("blueprints.settings.kanban.description")}
                    enabled={enabled}
                    onChange={(next) =>
                        setEntry((prev) => ({ ...prev, enabled: next }))
                    }
                />

                {/* Form controls — slide in/out based on enable state so users
                    aren't confused by greyed-out controls when the view is off. */}
                <RevealCollapse open={enabled} innerClassName="pt-1">
                    <fieldset className="space-y-4">
                        <div>
                            <label
                                className="mb-1.5 block text-xs font-medium"
                                style={labelStyle}
                            >
                                {t("blueprints.settings.kanban.group_field")}{" "}
                                <span style={requiredAsteriskStyle}>*</span>
                            </label>
                            <select
                                value={config.group_field_name ?? ""}
                                onChange={(e) =>
                                    updateConfig({
                                        group_field_name:
                                            e.target.value || null,
                                    })
                                }
                                className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                                style={selectStyle}
                            >
                                <option value="">
                                    {t(
                                        "blueprints.settings.kanban.group_field_placeholder",
                                    )}
                                </option>
                                {groupableFields.map((f) => (
                                    <option key={f.name} value={f.name}>
                                        {f.label}
                                    </option>
                                ))}
                            </select>
                            {groupableFields.length === 0 && enabled && (
                                <p
                                    className="mt-1 text-xs"
                                    style={warningTextStyle}
                                >
                                    <i className="fa-solid fa-triangle-exclamation mr-1" />
                                    {t(
                                        "blueprints.settings.kanban.no_groupable_fields",
                                    )}
                                </p>
                            )}
                            <p className="mt-1 text-[11px]" style={helperStyle}>
                                {t(
                                    "blueprints.settings.kanban.group_field_hint",
                                )}
                            </p>
                        </div>

                        <div>
                            <label
                                className="mb-1.5 block text-xs font-medium"
                                style={labelStyle}
                            >
                                {t("blueprints.settings.kanban.column_sort")}
                            </label>
                            <select
                                value={config.column_sort ?? "sort_order"}
                                onChange={(e) =>
                                    updateConfig({
                                        column_sort: e.target
                                            .value as KanbanConfig["column_sort"],
                                    })
                                }
                                className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                                style={selectStyle}
                            >
                                <option value="sort_order">
                                    {t(
                                        "blueprints.settings.kanban.sort.manual",
                                    )}
                                </option>
                                <option value="name">
                                    {t("blueprints.settings.kanban.sort.name")}
                                </option>
                                <option value="updated_at">
                                    {t(
                                        "blueprints.settings.kanban.sort.updated",
                                    )}
                                </option>
                                <option value="created_at">
                                    {t(
                                        "blueprints.settings.kanban.sort.created",
                                    )}
                                </option>
                            </select>
                            <p className="mt-1 text-[11px]" style={helperStyle}>
                                {t(
                                    "blueprints.settings.kanban.column_sort_hint",
                                )}
                            </p>
                        </div>
                    </fieldset>
                </RevealCollapse>
            </div>

            <div
                className="flex items-center justify-end gap-2 px-5 py-3"
                style={footerDividerStyle}
            >
                <ActionButton
                    icon="fa-solid fa-check"
                    label={t("common.save")}
                    onClick={handleSave}
                    loading={saving}
                />
            </div>
        </div>
    );
}
