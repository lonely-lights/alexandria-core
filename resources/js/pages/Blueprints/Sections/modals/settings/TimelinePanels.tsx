import { type CSSProperties, useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import ActionButton from "@alexandria/components/ui/ActionButton";
import useT from "@alexandria/hooks/useT";
import type {
    BlueprintDetail,
    AvailableColumn,
} from "@alexandria/types/blueprints";
import type { FormDataConvertible } from "@inertiajs/core";
import type {
    TimelineConfig,
    TimelineOrientation,
} from "@alexandria/types/timeline";
import { ZOOM_LEVELS } from "@alexandria/types/timeline";
import SettingsActivationToggle from "./SettingsActivationToggle";
import {
    TOGGLE_ACCENT_COLOR,
    helperFainterStyle,
    helperSoftStyle,
    inputStyle,
    labelStyle,
    requiredAsteriskStyle,
    segmentBtnActiveStyle,
    segmentBtnIdleStyle,
    selectStyle,
    softDividerStyle,
    warningTextStyle,
} from "./settingsPanelStyles";

const sourceCardStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
    background: "color-mix(in srgb, var(--theme-base-200) 30%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

/* ── Timeline Settings Panel ── */

export function TimelineSettingsPanel({
    config,
    onChange,
    availableColumns,
}: {
    config: TimelineConfig;
    onChange: (config: TimelineConfig) => void;
    availableColumns: AvailableColumn[];
}) {
    const t = useT();
    const dateFields = availableColumns.filter(
        (c) =>
            c.type === "field" &&
            ["date", "datetime"].includes(c.field_type?.toLowerCase() ?? ""),
    );
    const groupableFields = availableColumns.filter(
        (c) =>
            c.type === "field" &&
            ["entry reference", "text"].includes(
                c.field_type?.toLowerCase() ?? "",
            ),
    );

    return (
        <div className="space-y-5 p-5">
            {/* Date Field (required) */}
            <div>
                <label
                    className="mb-1.5 block text-xs font-medium"
                    style={labelStyle}
                >
                    {t("blueprints.settings.timeline.start_date_field")}{" "}
                    <span style={requiredAsteriskStyle}>*</span>
                </label>
                <select
                    value={config.date_field ?? ""}
                    onChange={(e) =>
                        onChange({
                            ...config,
                            date_field: e.target.value || null,
                        })
                    }
                    className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                    style={selectStyle}
                >
                    <option value="">
                        {t(
                            "blueprints.settings.timeline.start_date_placeholder",
                        )}
                    </option>
                    {dateFields.map((f) => (
                        <option key={f.key} value={f.key}>
                            {f.label}
                        </option>
                    ))}
                </select>
                {dateFields.length === 0 && (
                    <p className="mt-1 text-xs" style={warningTextStyle}>
                        <i className="fa-solid fa-triangle-exclamation mr-1" />
                        {t("blueprints.settings.timeline.no_date_fields")}
                    </p>
                )}
            </div>

            {/* End Date Field (optional) */}
            <div>
                <label
                    className="mb-1.5 block text-xs font-medium"
                    style={labelStyle}
                >
                    {t("blueprints.settings.timeline.end_date_field")}{" "}
                    <span style={helperSoftStyle}>
                        {t("blueprints.settings.timeline.end_date_suffix")}
                    </span>
                </label>
                <select
                    value={config.end_date_field ?? ""}
                    onChange={(e) =>
                        onChange({
                            ...config,
                            end_date_field: e.target.value || null,
                        })
                    }
                    className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                    style={selectStyle}
                >
                    <option value="">
                        {t("blueprints.settings.timeline.end_date_none")}
                    </option>
                    {dateFields
                        .filter((f) => f.key !== config.date_field)
                        .map((f) => (
                            <option key={f.key} value={f.key}>
                                {f.label}
                            </option>
                        ))}
                </select>
            </div>

            {/* Group By (optional) */}
            <div>
                <label
                    className="mb-1.5 block text-xs font-medium"
                    style={labelStyle}
                >
                    {t("blueprints.settings.timeline.group_by")}{" "}
                    <span style={helperSoftStyle}>
                        {t("blueprints.settings.timeline.group_by_suffix")}
                    </span>
                </label>
                <select
                    value={config.group_by ?? ""}
                    onChange={(e) =>
                        onChange({
                            ...config,
                            group_by: e.target.value || null,
                        })
                    }
                    className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                    style={selectStyle}
                >
                    <option value="">
                        {t("blueprints.settings.timeline.group_by_none")}
                    </option>
                    {groupableFields.map((f) => (
                        <option key={f.key} value={f.key}>
                            {f.label}
                        </option>
                    ))}
                </select>
            </div>

            <hr style={softDividerStyle} />

            {/* Orientation */}
            <div>
                <label
                    className="mb-1.5 block text-xs font-medium"
                    style={labelStyle}
                >
                    {t("blueprints.settings.timeline.orientation")}
                </label>
                <div className="flex gap-2">
                    {(["horizontal", "vertical"] as TimelineOrientation[]).map(
                        (o) => (
                            <button
                                key={o}
                                type="button"
                                onClick={() =>
                                    onChange({ ...config, orientation: o })
                                }
                                className="inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-sm"
                                style={
                                    config.orientation === o
                                        ? segmentBtnActiveStyle
                                        : segmentBtnIdleStyle
                                }
                            >
                                <i
                                    className={`fa-solid ${o === "horizontal" ? "fa-arrows-left-right" : "fa-arrows-up-down"} text-xs`}
                                />
                                {o === "horizontal"
                                    ? t(
                                          "blueprints.settings.timeline.horizontal",
                                      )
                                    : t(
                                          "blueprints.settings.timeline.vertical",
                                      )}
                            </button>
                        ),
                    )}
                </div>
            </div>

            {/* Default Zoom */}
            <div>
                <label
                    className="mb-1.5 block text-xs font-medium"
                    style={labelStyle}
                >
                    {t("blueprints.settings.timeline.default_zoom")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                    {ZOOM_LEVELS.map((z) => (
                        <button
                            key={z.key}
                            type="button"
                            onClick={() => onChange({ ...config, zoom: z.key })}
                            className="inline-flex items-center justify-center px-2 py-1 text-xs"
                            style={
                                config.zoom === z.key
                                    ? segmentBtnActiveStyle
                                    : segmentBtnIdleStyle
                            }
                        >
                            {z.label}
                        </button>
                    ))}
                </div>
            </div>

            <hr style={softDividerStyle} />

            {/* Display window — pins the visible bounds so outlier entries
                (e.g., one prehistoric event among modern data) don't stretch
                the canvas across millennia. Leave blank to auto-fit from
                data min/max. Negative values = BC. */}
            <div>
                <label
                    className="mb-1.5 block text-xs font-medium"
                    style={labelStyle}
                >
                    {t("blueprints.settings.timeline.display_window")}{" "}
                    <span style={helperSoftStyle}>
                        {t(
                            "blueprints.settings.timeline.display_window_suffix",
                        )}
                    </span>
                </label>
                <p className="mb-2 text-[11px]" style={helperFainterStyle}>
                    {t("blueprints.settings.timeline.display_window_hint")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label
                            className="mb-1 block text-[11px]"
                            style={helperFainterStyle}
                        >
                            {t("blueprints.settings.timeline.start_year")}
                        </label>
                        <input
                            type="number"
                            className="w-full px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2"
                            style={inputStyle}
                            placeholder={t(
                                "blueprints.settings.timeline.year_auto",
                            )}
                            value={config.display_start_year ?? ""}
                            onChange={(e) =>
                                onChange({
                                    ...config,
                                    display_start_year:
                                        e.target.value === ""
                                            ? null
                                            : Number(e.target.value),
                                })
                            }
                        />
                    </div>
                    <div>
                        <label
                            className="mb-1 block text-[11px]"
                            style={helperFainterStyle}
                        >
                            {t("blueprints.settings.timeline.end_year")}
                        </label>
                        <input
                            type="number"
                            className="w-full px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2"
                            style={inputStyle}
                            placeholder={t(
                                "blueprints.settings.timeline.year_auto",
                            )}
                            value={config.display_end_year ?? ""}
                            onChange={(e) =>
                                onChange({
                                    ...config,
                                    display_end_year:
                                        e.target.value === ""
                                            ? null
                                            : Number(e.target.value),
                                })
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Timeline Sources Panel ── */

interface TimelineSourceConfig {
    enabled: boolean;
    epoch_field: string;
    epoch_value: string;
    epoch_label: string;
}

/* ── Timeline Activation Panel ──
   Shown at the top of the Timeline settings menu. Owns the enable/disable
   toggle and self-saves via router.put. Mirrors the Kanban settings
   pattern so the Timeline menu is self-contained — users no longer have
   to enable Timeline from the Behavior panel and then navigate here.
*/
export function TimelineActivationPanel({
    blueprint,
    project,
}: {
    blueprint: BlueprintDetail;
    project: { slug: string };
}) {
    const t = useT();
    const [enabled, setEnabled] = useState<boolean>(blueprint.enable_timeline);
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
                show_tree_view: blueprint.show_tree_view,
                enable_timeline: next,
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
            title={t("blueprints.settings.timeline_activation.title")}
            description={t(
                "blueprints.settings.timeline_activation.description",
            )}
            enabled={enabled}
            onChange={handleToggle}
            disabled={saving}
            statusLine={saving ? t("common.saving") : undefined}
        />
    );
}

export function TimelineSourcesPanel({
    blueprint,
    project,
    timelineBlueprints,
}: {
    blueprint: BlueprintDetail;
    project: { slug: string };
    timelineBlueprints: Array<{
        id: number;
        name: string;
        slug: string;
        icon: string;
        fields: Array<{
            name: string;
            label: string;
            type: string;
            target_blueprint_slug: string | null;
        }>;
    }>;
}) {
    const t = useT();
    const existingSources = (blueprint.metadata?.timeline_sources ??
        {}) as Record<string, TimelineSourceConfig>;

    const [sources, setSources] = useState<
        Record<string, TimelineSourceConfig>
    >(
        Object.fromEntries(
            timelineBlueprints.map((tb) => [
                tb.slug,
                existingSources[tb.slug] ?? {
                    enabled: false,
                    epoch_field: "",
                    epoch_value: "",
                    epoch_label: "",
                },
            ]),
        ),
    );
    const [fieldValues, setFieldValues] = useState<
        Record<string, Array<{ id: number; name: string }>>
    >({});
    const [saving, setSaving] = useState(false);

    function updateSource(slug: string, field: string, value: unknown) {
        setSources((prev) => {
            const updated = {
                ...prev[slug],
                [field]: value,
            } as TimelineSourceConfig;
            // Clear value when field changes
            if (field === "epoch_field") updated.epoch_value = "";
            return { ...prev, [slug]: updated };
        });
    }

    // Fetch list entries when an entry_reference field is selected
    useEffect(() => {
        for (const tb of timelineBlueprints) {
            const source = sources[tb.slug];
            if (!source?.enabled || !source.epoch_field) continue;

            const field = tb.fields.find((f) => f.name === source.epoch_field);
            if (!field?.target_blueprint_slug) continue;

            const cacheKey = `${tb.slug}:${source.epoch_field}`;
            if (fieldValues[cacheKey]) continue;

            // Mark as loading to prevent duplicate fetches
            setFieldValues((prev) => ({ ...prev, [cacheKey]: [] }));

            fetch(
                `/api/v1/projects/${project.slug}/blueprint-entries-by-slug/${field.target_blueprint_slug}`,
                {
                    credentials: "same-origin",
                    headers: { Accept: "application/json" },
                },
            )
                .then((r) => (r.ok ? r.json() : []))
                .then((data: Array<{ id: number; name: string }>) =>
                    setFieldValues((prev) => ({ ...prev, [cacheKey]: data })),
                )
                .catch(() => {});
        }
    }, [sources, timelineBlueprints]);

    function handleSave() {
        setSaving(true);
        const metadata = {
            ...(blueprint.metadata ?? {}),
            timeline_sources: sources,
        };
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
                metadata: JSON.parse(JSON.stringify(metadata)),
            } as Record<string, FormDataConvertible>,
            {
                onSuccess: () => setSaving(false),
                onError: () => setSaving(false),
            },
        );
    }

    return (
        <div className="space-y-3 p-5">
            <div>
                <p className="text-xs font-medium" style={labelStyle}>
                    <i
                        className="fa-solid fa-diagram-project mr-1"
                        style={{ color: "var(--theme-brand-primary-500)" }}
                    />
                    {t("blueprints.settings.timeline_sources.title")}
                </p>
                <p className="mt-1 text-[11px]" style={helperFainterStyle}>
                    {t("blueprints.settings.timeline_sources.description")}
                </p>
            </div>

            <div className="space-y-2">
                {timelineBlueprints.map((tb) => {
                    const source = sources[tb.slug] ?? {
                        enabled: false,
                        epoch_field: "",
                        epoch_value: "",
                        epoch_label: "",
                    };
                    const iconClass = tb.icon.includes(" ")
                        ? tb.icon
                        : `fa-solid ${tb.icon}`;
                    const selectedField = tb.fields.find(
                        (f) => f.name === source.epoch_field,
                    );
                    const cacheKey = `${tb.slug}:${source.epoch_field}`;
                    const values = fieldValues[cacheKey] ?? [];

                    return (
                        <div
                            key={tb.slug}
                            className="p-3"
                            style={sourceCardStyle}
                        >
                            <label className="flex cursor-pointer items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <i
                                        className={`${iconClass} w-4 text-center text-xs`}
                                        style={helperFainterStyle}
                                    />
                                    <span className="text-sm font-medium">
                                        {tb.name}
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    role="switch"
                                    checked={source.enabled}
                                    onChange={(e) =>
                                        updateSource(
                                            tb.slug,
                                            "enabled",
                                            e.target.checked,
                                        )
                                    }
                                    style={{
                                        accentColor: TOGGLE_ACCENT_COLOR,
                                        width: "1.75rem",
                                        height: "1.125rem",
                                    }}
                                />
                            </label>
                            {source.enabled && (
                                <div className="mt-2.5 space-y-2 pl-6">
                                    {/* Field selector */}
                                    <div>
                                        <label
                                            className="mb-1 block text-[11px]"
                                            style={helperFainterStyle}
                                        >
                                            {t(
                                                "blueprints.settings.timeline_sources.reference_field",
                                            )}
                                        </label>
                                        <select
                                            className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                                            style={selectStyle}
                                            value={source.epoch_field}
                                            onChange={(e) =>
                                                updateSource(
                                                    tb.slug,
                                                    "epoch_field",
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            <option value="">
                                                {t(
                                                    "blueprints.settings.timeline_sources.field_placeholder",
                                                )}
                                            </option>
                                            {tb.fields
                                                .filter(
                                                    (f) =>
                                                        f.type ===
                                                            "entry_reference" ||
                                                        f.type === "text",
                                                )
                                                .map((f) => (
                                                    <option
                                                        key={f.name}
                                                        value={f.name}
                                                    >
                                                        {f.label}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    {/* Value selector — cascading from field */}
                                    {source.epoch_field && selectedField && (
                                        <div>
                                            <label
                                                className="mb-1 block text-[11px]"
                                                style={helperFainterStyle}
                                            >
                                                {t(
                                                    "blueprints.settings.timeline_sources.reference_value",
                                                )}
                                            </label>
                                            {values.length > 0 ? (
                                                <select
                                                    className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                                                    style={selectStyle}
                                                    value={source.epoch_value}
                                                    onChange={(e) =>
                                                        updateSource(
                                                            tb.slug,
                                                            "epoch_value",
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="">
                                                        {t(
                                                            "blueprints.settings.timeline_sources.value_placeholder",
                                                        )}
                                                    </option>
                                                    {values.map((v) => (
                                                        <option
                                                            key={v.id}
                                                            value={v.name}
                                                        >
                                                            {v.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    placeholder={t(
                                                        "blueprints.settings.timeline_sources.value_input_placeholder",
                                                    )}
                                                    className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                                                    style={inputStyle}
                                                    value={source.epoch_value}
                                                    onChange={(e) =>
                                                        updateSource(
                                                            tb.slug,
                                                            "epoch_value",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            )}
                                        </div>
                                    )}

                                    {/* Label */}
                                    <div>
                                        <label
                                            className="mb-1 block text-[11px]"
                                            style={helperFainterStyle}
                                        >
                                            {t(
                                                "blueprints.settings.timeline_sources.elapsed_label",
                                            )}
                                        </label>
                                        <input
                                            type="text"
                                            placeholder={t(
                                                "blueprints.settings.timeline_sources.elapsed_placeholder",
                                            )}
                                            className="w-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                                            style={inputStyle}
                                            value={source.epoch_label}
                                            onChange={(e) =>
                                                updateSource(
                                                    tb.slug,
                                                    "epoch_label",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end pt-1">
                <ActionButton
                    icon="fa-solid fa-check"
                    label={t("common.save")}
                    size="sm"
                    onClick={handleSave}
                    loading={saving}
                />
            </div>
        </div>
    );
}
