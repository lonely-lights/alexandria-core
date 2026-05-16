import { useState } from "react";
import { router } from "@inertiajs/react";

import ActionButton from "@alexandria/components/ui/ActionButton";
import useT from "@alexandria/hooks/useT";
import type { BlueprintDetail } from "@alexandria/types/blueprints";

import SubtitleBuilderModal from "./SubtitleBuilderModal";
import {
    FIELD_TYPE_BADGE_STYLES,
    TOGGLE_ACCENT_COLOR,
    helperFainterStyle,
    helperSoftStyle,
    labelStyle,
    subtitlePickerBtnStyle,
    warningTextStyle,
} from "./settingsPanelStyles";

/**
 * Display-config panel for blueprints with classification `relationship` —
 * lets the user hide specific fields from rendered displays and configure
 * a subtitle template via the shared SubtitleBuilderModal.
 */
export default function RelationshipDisplayPanel({
    blueprint,
    project,
}: {
    blueprint: BlueprintDetail;
    project: { slug: string };
}) {
    const t = useT();
    const metadata =
        (blueprint as unknown as { metadata?: Record<string, unknown> })
            .metadata ?? {};
    const displayConfig = (metadata.display_config ?? {}) as Record<
        string,
        unknown
    >;
    const [hiddenFields, setHiddenFields] = useState<string[]>(
        (displayConfig.hidden_fields as string[] | undefined) ?? [],
    );
    const [subtitleModalOpen, setSubtitleModalOpen] = useState(false);
    const [subtitleData, setSubtitleData] =
        useState<Record<string, unknown>>(displayConfig);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const hasSubtitle = !!(subtitleData.subtitle_template as string);

    function toggleHiddenField(fieldName: string) {
        setHiddenFields((prev) => {
            const next = prev.includes(fieldName)
                ? prev.filter((f) => f !== fieldName)
                : [...prev, fieldName];
            setDirty(true);
            return next;
        });
    }

    function handleSubtitleChange(data: Record<string, unknown>) {
        setSubtitleData(data);
        setDirty(true);
    }

    function save() {
        setSaving(true);
        const newMetadata = {
            ...metadata,
            display_config: {
                ...subtitleData,
                hidden_fields: hiddenFields,
            },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.put(
            `/p/${project.slug}/${blueprint.slug}`,
            {
                name: blueprint.name,
                description: blueprint.description ?? "",
                icon: blueprint.icon,
                classification: blueprint.classification,
                show_on_dashboard: blueprint.show_on_dashboard,
                is_linkable: blueprint.is_linkable,
                is_hub: blueprint.is_hub,
                metadata: newMetadata,
            } as any,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDirty(false);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            },
        );
    }

    return (
        <div className="p-5">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold" style={labelStyle}>
                        {t("blueprints.bp_settings.display.config_title")}
                    </h3>
                    <p className="mt-0.5 text-xs" style={helperFainterStyle}>
                        {t("blueprints.bp_settings.display.config_description")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {dirty && (
                        <span className="text-xs" style={warningTextStyle}>
                            {t("blueprints.bp_settings.display.unsaved")}
                        </span>
                    )}
                    <ActionButton
                        icon="fa-solid fa-save"
                        label={t("common.save")}
                        size="xs"
                        onClick={save}
                        loading={saving}
                        disabled={!dirty}
                    />
                </div>
            </div>

            {/* Hidden Fields */}
            <div className="mt-4">
                <label className="text-xs font-semibold" style={labelStyle}>
                    {t("blueprints.bp_settings.display.visible_fields")}
                </label>
                <p className="mb-2 mt-0.5 text-[11px]" style={helperSoftStyle}>
                    {t("blueprints.bp_settings.display.visible_fields_hint")}
                </p>
                <div className="space-y-1.5">
                    {blueprint.fields.map((field) => {
                        const badge = FIELD_TYPE_BADGE_STYLES[field.type] ?? {
                            bg: "rgba(128,128,128,0.15)",
                            text: "#888",
                        };
                        return (
                            <label
                                key={field.name}
                                className="alex-row flex cursor-pointer items-center gap-3 px-3 py-2"
                                style={{
                                    borderRadius: "var(--theme-radius-input)",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={!hiddenFields.includes(field.name)}
                                    onChange={() =>
                                        toggleHiddenField(field.name)
                                    }
                                    style={{ accentColor: TOGGLE_ACCENT_COLOR }}
                                />
                                <span
                                    className="flex-1 text-xs font-medium"
                                    style={labelStyle}
                                >
                                    {field.label}
                                </span>
                                <span
                                    className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                                    style={{
                                        backgroundColor: badge.bg,
                                        color: badge.text,
                                    }}
                                >
                                    {titleCase(field.type)}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Subtitle Template */}
            <div className="mt-5">
                <label className="text-xs font-semibold" style={labelStyle}>
                    {t("blueprints.bp_settings.display.subtitle_template")}
                </label>
                <p className="mb-2 mt-0.5 text-[11px]" style={helperSoftStyle}>
                    {t("blueprints.bp_settings.display.subtitle_hint")}
                </p>
                <button
                    type="button"
                    onClick={() => setSubtitleModalOpen(true)}
                    className="alex-row flex w-full items-center justify-between px-3 py-2 text-left text-xs"
                    style={subtitlePickerBtnStyle}
                >
                    <span style={hasSubtitle ? labelStyle : helperSoftStyle}>
                        {hasSubtitle
                            ? t(
                                  "blueprints.bp_settings.display.subtitle_configured",
                              )
                            : t("blueprints.bp_settings.display.subtitle_none")}
                    </span>
                    <i
                        className={`fa-solid ${hasSubtitle ? "fa-pen" : "fa-plus"} text-[10px]`}
                        style={helperSoftStyle}
                    />
                </button>
            </div>

            {/* Reuse SubtitleBuilderModal from settings/SubtitleBuilderModal */}
            <SubtitleBuilderModal
                open={subtitleModalOpen}
                onClose={() => setSubtitleModalOpen(false)}
                data={subtitleData}
                onChange={handleSubtitleChange}
                blueprintFields={blueprint.fields}
            />
        </div>
    );
}

function titleCase(str: string): string {
    return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
