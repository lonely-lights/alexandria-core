import { type CSSProperties, useState, useRef } from "react";
import { useForm, usePage } from "@inertiajs/react";
import AppLayout from "@alexandria/layouts/AppLayout";
import Textarea from "@alexandria/components/form/Textarea";
import ActionButton from "@alexandria/components/ui/ActionButton";
import useT from "@alexandria/hooks/useT";
import type { Translator } from "@alexandria/hooks/useT";
import { useBlueprintFields } from "@alexandria/hooks/useBlueprintFields";
import { useSortableReorder } from "@alexandria/hooks/useSortableReorder";
import { FIELD_TYPES } from "@alexandria/config/fieldTypes";

interface CreateProps {
    project: {
        id: number;
        name: string;
        slug: string;
    };
}

/* ── Style recipes ───────────────────────────────────────────────── */

const helperStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};
const helperFainterStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
};
const helperSoftStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 30%, transparent)",
};
const helperVerySoftStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 25%, transparent)",
};
const helperGhostStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
};
const labelStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};
const valueLabelStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};

const primaryTextStyle: CSSProperties = {
    color: "var(--theme-brand-primary-500)",
};
const primaryHalfStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-brand-primary-500) 50%, transparent)",
};
const infoTextStyle: CSSProperties = {
    color: "var(--theme-status-info-stroke)",
};
const errorTextStyle: CSSProperties = {
    color: "var(--theme-status-error-stroke)",
};

const sectionCardStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "var(--theme-base-200)",
    borderRadius: "var(--theme-radius-card)",
    overflow: "hidden",
};

const identityHeroStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)",
};

const iconWrapStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-100) 80%, transparent)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    boxShadow:
        "0 6px 16px 0 color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    backdropFilter: "blur(4px)",
    transition:
        "all var(--theme-motion-duration-normal) var(--theme-motion-easing-standard)",
};

const inputStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-100) 50%, transparent)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    color: "var(--theme-base-content)",
    borderRadius: "var(--theme-radius-input)",
};

const compactInputStyle: CSSProperties = {
    ...inputStyle,
    height: "2rem",
    fontSize: "0.75rem",
};

const compactSelectStyle: CSSProperties = {
    ...compactInputStyle,
    appearance: "auto",
};

const classificationActiveStyle: CSSProperties = {
    border: "1px solid var(--theme-brand-primary-500)",
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    boxShadow:
        "0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
    transition:
        "all var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const classificationIdleStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "transparent",
    borderRadius: "var(--theme-radius-card)",
    transition:
        "all var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const settingRowStyle: CSSProperties = {
    border: "1px solid var(--theme-base-300)",
    borderRadius: "var(--theme-radius-card)",
};

const infoBoxStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-status-info-stroke) 20%, transparent)",
    background:
        "color-mix(in srgb, var(--theme-status-info-fill) 50%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

const dashedEmptyStyle: CSSProperties = {
    border: "1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

const fieldRowDividerStyle: CSSProperties = {
    borderTop:
        "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
};

const fieldRowEvenBgStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-200) 30%, transparent)",
};

const fieldRowOddBgStyle: CSSProperties = {
    background: "var(--theme-base-100)",
};

const fieldTypeIconWrapStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-300) 50%, transparent)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
    borderRadius: "var(--theme-radius-input)",
};

const fieldTypeRefCardStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
    borderRadius: "var(--theme-radius-input)",
};

const stepTabActiveStyle: CSSProperties = {
    background: "var(--theme-brand-primary-500)",
    color: "var(--theme-brand-primary-content)",
    borderRadius: "var(--theme-radius-button)",
};

const stepTabIdleStyle: CSSProperties = {
    background: "transparent",
    color: "var(--theme-base-content)",
    borderRadius: "var(--theme-radius-button)",
};

const fieldCountBadgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.0625rem 0.5rem",
    fontSize: "0.625rem",
    fontWeight: 600,
    borderRadius: "var(--theme-radius-badge)",
    background:
        "color-mix(in srgb, var(--theme-brand-primary-content) 30%, transparent)",
    color: "var(--theme-brand-primary-content)",
};

const dragHandleStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
};

const errorSoftStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-status-error-stroke) 20%, transparent)",
};

const TOGGLE_ACCENT = "var(--theme-brand-primary-500)";

function classifications(t: Translator) {
    return [
        {
            value: "standard",
            label: t("blueprints.create.classification.standard.label"),
            icon: "fa-solid fa-file",
            description: t(
                "blueprints.create.classification.standard.description",
            ),
        },
        {
            value: "list",
            label: t("blueprints.create.classification.list.label"),
            icon: "fa-solid fa-list",
            description: t("blueprints.create.classification.list.description"),
        },
        {
            value: "structural",
            label: t("blueprints.create.classification.structural.label"),
            icon: "fa-solid fa-sitemap",
            description: t(
                "blueprints.create.classification.structural.description",
            ),
        },
        {
            value: "relationship",
            label: t("blueprints.create.classification.relationship.label"),
            icon: "fa-solid fa-diagram-project",
            description: t(
                "blueprints.create.classification.relationship.description",
            ),
        },
    ] as const;
}

function fieldTypeOptions(t: Translator) {
    return [
        {
            value: "text",
            label: t("blueprints.create.field_type.text.label"),
            description: t("blueprints.create.field_type.text.description"),
        },
        {
            value: "textarea",
            label: t("blueprints.create.field_type.textarea.label"),
            description: t("blueprints.create.field_type.textarea.description"),
        },
        {
            value: "integer",
            label: t("blueprints.create.field_type.integer.label"),
            description: t("blueprints.create.field_type.integer.description"),
        },
        {
            value: "boolean",
            label: t("blueprints.create.field_type.boolean.label"),
            description: t("blueprints.create.field_type.boolean.description"),
        },
        {
            value: "date",
            label: t("blueprints.create.field_type.date.label"),
            description: t("blueprints.create.field_type.date.description"),
        },
        {
            value: "datetime",
            label: t("blueprints.create.field_type.datetime.label"),
            description: t("blueprints.create.field_type.datetime.description"),
        },
        {
            value: "entry_reference",
            label: t("blueprints.create.field_type.entry_reference.label"),
            description: t(
                "blueprints.create.field_type.entry_reference.description",
            ),
        },
        {
            value: "temporal",
            label: t("blueprints.create.field_type.temporal.label"),
            description: t("blueprints.create.field_type.temporal.description"),
        },
    ] as const;
}

export default function BlueprintCreate() {
    const t = useT();
    const { project } = usePage().props as unknown as CreateProps;

    const form = useForm({
        name: "",
        description: "",
        icon: "fa-solid fa-cube",
        classification: "standard" as string,
        show_on_dashboard: true,
        is_linkable: true,
        is_hub: false,
        show_tree_view: false,
        list_selection_mode: "single" as string,
    });

    const { fields, addField, removeField, updateField, reorderFields } =
        useBlueprintFields([]);
    const [step, setStep] = useState<"basics" | "fields" | "ai">("basics");
    const [aiInstructions, setAiInstructions] = useState("");
    const sortableRef = useRef<HTMLDivElement>(null);

    useSortableReorder(sortableRef, reorderFields, step === "fields");

    const CLASSIFICATIONS = classifications(t);
    const FIELD_TYPE_OPTIONS = fieldTypeOptions(t);

    const iconClass = form.data.icon.includes(" ")
        ? form.data.icon
        : `fa-solid ${form.data.icon}`;
    const selectedClassification = CLASSIFICATIONS.find(
        (c) => c.value === form.data.classification,
    );
    const canHaveFields =
        form.data.classification !== "structural" &&
        form.data.classification !== "relationship";

    function handleSubmit() {
        form.transform((data) => ({
            ...data,
            fields: fields.map((f, i) => ({
                label: f.label,
                name: f.name,
                type: f.type,
                description: f.description ?? "",
                is_required: f.is_required,
                validation_rules: f.validation_rules ?? {},
                sort_order: i + 1,
            })),
            ai_instructions: aiInstructions.trim() || undefined,
        }));
        form.post(`/p/${project.slug}/blueprints`);
    }

    return (
        <AppLayout
            title={t("blueprints.create.page_title").replace(
                ":project",
                project.name,
            )}
        >
            <div className="container mx-auto max-w-3xl px-4 py-8">
                {/* Header — serif title + subtitle, breadcrumb above.
                    Matches Notes / AI / Blueprint Show conventions so
                    the "create" flow doesn't feel visually detached. */}
                <div className="mb-8">
                    <div
                        className="flex items-center gap-2 text-sm"
                        style={helperStyle}
                    >
                        <a
                            href={`/p/${project.slug}`}
                            className="hover:underline"
                            style={helperStyle}
                        >
                            {project.name}
                        </a>
                        <i className="fa-solid fa-chevron-right text-[10px]" />
                        <span style={labelStyle}>
                            {t("blueprints.create.breadcrumb")}
                        </span>
                    </div>
                    <h1 className="mt-2 font-serif text-3xl md:text-4xl font-bold leading-tight tracking-tight">
                        {t("blueprints.create.heading")}
                    </h1>
                    <p className="mt-1 text-sm" style={helperStyle}>
                        {t("blueprints.create.tagline")}
                    </p>
                </div>

                {/* Step tabs */}
                <div className="mb-6 flex gap-2">
                    <button
                        type="button"
                        onClick={() => setStep("basics")}
                        className="alex-btn inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium"
                        style={
                            step === "basics"
                                ? stepTabActiveStyle
                                : stepTabIdleStyle
                        }
                    >
                        <i className="fa-solid fa-sliders w-3.5 text-center text-xs" />
                        {t("blueprints.create.step.basics")}
                    </button>
                    {canHaveFields && (
                        <button
                            type="button"
                            onClick={() => setStep("fields")}
                            className="alex-btn inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium"
                            style={
                                step === "fields"
                                    ? stepTabActiveStyle
                                    : stepTabIdleStyle
                            }
                        >
                            <i className="fa-solid fa-layer-group w-3.5 text-center text-xs" />
                            {t("blueprints.create.step.fields")}
                            {fields.length > 0 && (
                                <span style={fieldCountBadgeStyle}>
                                    {fields.length}
                                </span>
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setStep("ai")}
                        className="alex-btn inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium"
                        style={
                            step === "ai"
                                ? stepTabActiveStyle
                                : stepTabIdleStyle
                        }
                    >
                        <i className="fa-solid fa-brain w-3.5 text-center text-xs" />
                        {t("blueprints.create.step.ai")}
                    </button>
                </div>

                {step === "basics" ? (
                    <div className="space-y-6">
                        {/* Identity */}
                        <div style={sectionCardStyle}>
                            {/* Icon hero area — subtle primary tint
                                so the icon reads as the focal point
                                without fighting the card body. */}
                            <div
                                className="relative px-8 py-8"
                                style={identityHeroStyle}
                            >
                                <div className="flex items-center gap-6">
                                    <div
                                        className="flex h-20 w-20 flex-shrink-0 items-center justify-center"
                                        style={iconWrapStyle}
                                    >
                                        <i
                                            className={`${iconClass} text-3xl`}
                                            style={primaryTextStyle}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={form.data.name}
                                            onChange={(e) =>
                                                form.setData(
                                                    "name",
                                                    e.target.value,
                                                )
                                            }
                                            placeholder={t(
                                                "blueprints.create.identity.name_placeholder",
                                            )}
                                            autoFocus
                                            className="w-full px-3 py-2 text-2xl font-bold focus:outline-none"
                                            style={inputStyle}
                                        />
                                        {form.errors.name && (
                                            <p
                                                className="mt-1 text-xs"
                                                style={errorTextStyle}
                                            >
                                                {form.errors.name}
                                            </p>
                                        )}
                                        <div className="mt-2">
                                            <div className="flex items-center gap-2">
                                                <i
                                                    className="fa-solid fa-icons text-xs"
                                                    style={helperSoftStyle}
                                                />
                                                <input
                                                    type="text"
                                                    value={form.data.icon}
                                                    onChange={(e) =>
                                                        form.setData(
                                                            "icon",
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="fa-solid fa-cube"
                                                    className="w-full px-3 py-1.5 font-mono text-xs focus:outline-none"
                                                    style={{
                                                        ...inputStyle,
                                                        color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
                                                    }}
                                                />
                                            </div>
                                            <p
                                                className="mt-1 pl-6 text-[11px]"
                                                style={helperSoftStyle}
                                            >
                                                <a
                                                    href="https://fontawesome.com/icons"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:underline"
                                                    style={primaryHalfStyle}
                                                >
                                                    FontAwesome
                                                </a>{" "}
                                                {t(
                                                    "blueprints.create.identity.icon_hint",
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="px-8 py-5">
                                <Textarea
                                    label={t(
                                        "blueprints.create.identity.description_label",
                                    )}
                                    value={form.data.description}
                                    onChange={(e) =>
                                        form.setData(
                                            "description",
                                            e.currentTarget.value,
                                        )
                                    }
                                    placeholder={t(
                                        "blueprints.create.identity.description_placeholder",
                                    )}
                                    rows={2}
                                />
                            </div>
                        </div>

                        {/* Classification */}
                        <div className="p-6" style={sectionCardStyle}>
                            <h2
                                className="text-sm font-semibold"
                                style={labelStyle}
                            >
                                {t("blueprints.create.classification.heading")}
                            </h2>
                            <p
                                className="mb-4 mt-1 text-xs"
                                style={helperFainterStyle}
                            >
                                {t("blueprints.create.classification.help")}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {CLASSIFICATIONS.map((c) => {
                                    const isActive =
                                        form.data.classification === c.value;
                                    return (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() =>
                                                form.setData(
                                                    "classification",
                                                    c.value,
                                                )
                                            }
                                            className="alex-row flex items-start gap-3 p-4 text-left"
                                            style={
                                                isActive
                                                    ? classificationActiveStyle
                                                    : classificationIdleStyle
                                            }
                                        >
                                            <i
                                                className={`${c.icon} mt-0.5 text-lg`}
                                                style={
                                                    isActive
                                                        ? primaryTextStyle
                                                        : helperSoftStyle
                                                }
                                            />
                                            <div>
                                                <p
                                                    className="font-medium"
                                                    style={
                                                        isActive
                                                            ? primaryTextStyle
                                                            : undefined
                                                    }
                                                >
                                                    {c.label}
                                                </p>
                                                <p
                                                    className="mt-0.5 text-xs"
                                                    style={helperStyle}
                                                >
                                                    {c.description}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {form.data.classification === "list" && (
                                <div className="mt-4">
                                    <label
                                        className="mb-1 block text-xs font-medium"
                                        style={valueLabelStyle}
                                    >
                                        {t("blueprints.create.list_mode.label")}
                                    </label>
                                    <select
                                        value={form.data.list_selection_mode}
                                        onChange={(e) =>
                                            form.setData(
                                                "list_selection_mode",
                                                e.target.value,
                                            )
                                        }
                                        className="w-full max-w-xs px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                                        style={compactSelectStyle}
                                    >
                                        <option value="single">
                                            {t(
                                                "blueprints.create.list_mode.single",
                                            )}
                                        </option>
                                        <option value="multiple">
                                            {t(
                                                "blueprints.create.list_mode.multiple",
                                            )}
                                        </option>
                                    </select>
                                </div>
                            )}
                            {form.data.classification === "relationship" && (
                                <div
                                    className="mt-4 flex items-start gap-3 px-4 py-3"
                                    style={infoBoxStyle}
                                >
                                    <i
                                        className="fa-solid fa-circle-info mt-0.5 text-sm"
                                        style={infoTextStyle}
                                    />
                                    <div>
                                        <p
                                            className="text-sm font-medium"
                                            style={infoTextStyle}
                                        >
                                            {t(
                                                "blueprints.create.relationship.note_title",
                                            )}
                                        </p>
                                        <p
                                            className="mt-0.5 text-xs"
                                            style={helperStyle}
                                        >
                                            {t(
                                                "blueprints.create.relationship.note_body",
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Settings */}
                        <div className="p-6" style={sectionCardStyle}>
                            <h2
                                className="mb-4 text-sm font-semibold"
                                style={labelStyle}
                            >
                                {t("blueprints.create.settings.heading")}
                            </h2>
                            <div className="space-y-3">
                                <SettingsRow
                                    title={t(
                                        "blueprints.create.settings.dashboard.title",
                                    )}
                                    description={t(
                                        "blueprints.create.settings.dashboard.description",
                                    )}
                                    checked={form.data.show_on_dashboard}
                                    onChange={(v) =>
                                        form.setData("show_on_dashboard", v)
                                    }
                                />
                                <SettingsRow
                                    title={t(
                                        "blueprints.create.settings.linkable.title",
                                    )}
                                    description={t(
                                        "blueprints.create.settings.linkable.description",
                                    )}
                                    checked={form.data.is_linkable}
                                    onChange={(v) =>
                                        form.setData("is_linkable", v)
                                    }
                                />
                                {form.data.classification !== "structural" && (
                                    <SettingsRow
                                        title={t(
                                            "blueprints.create.settings.tree.title",
                                        )}
                                        description={t(
                                            "blueprints.create.settings.tree.description",
                                        )}
                                        checked={form.data.show_tree_view}
                                        onChange={(v) =>
                                            form.setData("show_tree_view", v)
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                ) : step === "fields" ? (
                    /* Fields step */
                    <div className="space-y-6">
                        {/* Custom fields */}
                        <div className="p-6" style={sectionCardStyle}>
                            <div className="mb-1 flex items-center justify-between">
                                <h2
                                    className="text-sm font-semibold"
                                    style={labelStyle}
                                >
                                    {t("blueprints.create.fields.heading")}
                                </h2>
                                <ActionButton
                                    icon="fa-solid fa-plus"
                                    label={t("blueprints.create.fields.add")}
                                    size="xs"
                                    onClick={addField}
                                />
                            </div>
                            <p
                                className="mb-4 text-xs"
                                style={helperFainterStyle}
                            >
                                {t("blueprints.create.fields.help")}
                            </p>

                            {fields.length === 0 ? (
                                <div
                                    className="py-8 text-center"
                                    style={dashedEmptyStyle}
                                >
                                    <i
                                        className="fa-solid fa-layer-group mb-2 text-2xl"
                                        style={helperGhostStyle}
                                    />
                                    <p
                                        className="text-sm"
                                        style={helperFainterStyle}
                                    >
                                        {t(
                                            "blueprints.create.fields.empty.title",
                                        )}
                                    </p>
                                    <p
                                        className="mt-1 text-xs"
                                        style={helperVerySoftStyle}
                                    >
                                        {t(
                                            "blueprints.create.fields.empty.hint",
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <div
                                    ref={sortableRef}
                                    className="-mx-6 -mb-6 overflow-hidden rounded-b-2xl"
                                >
                                    {fields.map((field, index) => {
                                        const ft = FIELD_TYPES[field.type];
                                        const showDrag = fields.length > 1;
                                        return (
                                            <div
                                                key={field.id ?? index}
                                                className="alex-row group px-6 py-4"
                                                style={{
                                                    ...fieldRowDividerStyle,
                                                    ...(index % 2 === 0
                                                        ? fieldRowEvenBgStyle
                                                        : fieldRowOddBgStyle),
                                                }}
                                            >
                                                <div className="flex">
                                                    {/* Left gutter: drag handle */}
                                                    {showDrag && (
                                                        <div
                                                            className="drag-handle flex w-8 flex-shrink-0 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
                                                            style={
                                                                dragHandleStyle
                                                            }
                                                        >
                                                            <i className="fa-solid fa-grip-vertical text-base" />
                                                        </div>
                                                    )}

                                                    {/* Content */}
                                                    <div className="min-w-0 flex-1 space-y-2 py-0.5">
                                                        {/* Label + type icon + type select + delete */}
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center"
                                                                style={
                                                                    fieldTypeIconWrapStyle
                                                                }
                                                            >
                                                                {ft && (
                                                                    <i
                                                                        className={`${ft.icon} text-sm ${ft.color}`}
                                                                    />
                                                                )}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    field.label
                                                                }
                                                                onChange={(e) =>
                                                                    updateField(
                                                                        index,
                                                                        {
                                                                            label: e
                                                                                .target
                                                                                .value,
                                                                        },
                                                                    )
                                                                }
                                                                placeholder={t(
                                                                    "blueprints.create.fields.label_placeholder",
                                                                )}
                                                                className="flex-1 px-2 text-sm font-medium focus:outline-none focus:ring-2"
                                                                style={
                                                                    compactInputStyle
                                                                }
                                                            />
                                                            <select
                                                                value={
                                                                    field.type
                                                                }
                                                                onChange={(e) =>
                                                                    updateField(
                                                                        index,
                                                                        {
                                                                            type: e
                                                                                .target
                                                                                .value,
                                                                        },
                                                                    )
                                                                }
                                                                className="w-32 flex-shrink-0 px-2 text-xs focus:outline-none focus:ring-2"
                                                                style={
                                                                    compactSelectStyle
                                                                }
                                                            >
                                                                {FIELD_TYPE_OPTIONS.map(
                                                                    (fto) => (
                                                                        <option
                                                                            key={
                                                                                fto.value
                                                                            }
                                                                            value={
                                                                                fto.value
                                                                            }
                                                                        >
                                                                            {
                                                                                fto.label
                                                                            }
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeField(
                                                                        index,
                                                                    )
                                                                }
                                                                className="alex-btn alex-btn--ghost inline-flex h-7 w-7 flex-shrink-0 items-center justify-center opacity-0 transition-all group-hover:opacity-100"
                                                                style={{
                                                                    ...errorSoftStyle,
                                                                    borderRadius:
                                                                        "var(--theme-radius-button)",
                                                                }}
                                                                title={t(
                                                                    "blueprints.create.fields.remove",
                                                                )}
                                                            >
                                                                <i className="fa-solid fa-trash text-[10px]" />
                                                            </button>
                                                        </div>
                                                        {/* Description */}
                                                        <input
                                                            type="text"
                                                            value={
                                                                field.description ??
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                updateField(
                                                                    index,
                                                                    {
                                                                        description:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    },
                                                                )
                                                            }
                                                            placeholder={t(
                                                                "blueprints.create.fields.description_placeholder",
                                                            )}
                                                            className="w-full px-2 text-xs focus:outline-none focus:ring-2"
                                                            style={{
                                                                ...compactInputStyle,
                                                                ...valueLabelStyle,
                                                            }}
                                                        />
                                                        {/* Options */}
                                                        <div className="flex items-center gap-3">
                                                            <label
                                                                className="alex-row flex cursor-pointer items-center gap-1.5 px-2 py-1"
                                                                style={{
                                                                    borderRadius:
                                                                        "var(--theme-radius-button)",
                                                                }}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        field.is_required
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateField(
                                                                            index,
                                                                            {
                                                                                is_required:
                                                                                    e
                                                                                        .target
                                                                                        .checked,
                                                                            },
                                                                        )
                                                                    }
                                                                    style={{
                                                                        accentColor:
                                                                            TOGGLE_ACCENT,
                                                                    }}
                                                                />
                                                                <span
                                                                    className="text-[11px]"
                                                                    style={
                                                                        helperFainterStyle
                                                                    }
                                                                >
                                                                    {t(
                                                                        "common.required",
                                                                    )}
                                                                </span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Field type reference */}
                        <div className="p-6" style={sectionCardStyle}>
                            <h2
                                className="text-sm font-semibold"
                                style={labelStyle}
                            >
                                {t("blueprints.create.field_ref.heading")}
                            </h2>
                            <p
                                className="mb-4 mt-1 text-xs"
                                style={helperFainterStyle}
                            >
                                {t("blueprints.create.field_ref.help")}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {FIELD_TYPE_OPTIONS.map((fto) => {
                                    const ft = FIELD_TYPES[fto.value];
                                    return (
                                        <div
                                            key={fto.value}
                                            className="flex items-start gap-3 px-3 py-2.5"
                                            style={fieldTypeRefCardStyle}
                                        >
                                            <i
                                                className={`${ft?.icon ?? "fa-solid fa-cube"} mt-0.5 w-4 text-center text-xs ${ft?.color ?? ""}`}
                                                style={
                                                    ft?.color
                                                        ? undefined
                                                        : helperSoftStyle
                                                }
                                            />
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {fto.label}
                                                </p>
                                                <p
                                                    className="text-[11px] leading-tight"
                                                    style={helperFainterStyle}
                                                >
                                                    {fto.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : step === "ai" ? (
                    /* AI step */
                    <div className="space-y-6">
                        {/* Blueprint AI Instructions */}
                        <div className="p-6" style={sectionCardStyle}>
                            <h2
                                className="text-sm font-semibold"
                                style={labelStyle}
                            >
                                {t("blueprints.create.ai.heading")}
                            </h2>
                            <p
                                className="mb-4 mt-1 text-xs"
                                style={helperFainterStyle}
                            >
                                {t("blueprints.create.ai.help")}
                            </p>
                            <textarea
                                value={aiInstructions}
                                onChange={(e) =>
                                    setAiInstructions(e.target.value)
                                }
                                placeholder={t(
                                    "blueprints.create.ai.placeholder",
                                )}
                                className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-2"
                                style={inputStyle}
                                rows={6}
                            />
                        </div>

                        {/* Info about post-creation AI features */}
                        <div
                            className="flex items-start gap-3 px-5 py-4"
                            style={infoBoxStyle}
                        >
                            <i
                                className="fa-solid fa-circle-info mt-0.5 text-sm"
                                style={infoTextStyle}
                            />
                            <div>
                                <p
                                    className="text-sm font-medium"
                                    style={infoTextStyle}
                                >
                                    {t("blueprints.create.ai.more_title")}
                                </p>
                                <p
                                    className="mt-0.5 text-xs"
                                    style={helperStyle}
                                >
                                    {t("blueprints.create.ai.more_body")}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Actions */}
                <div className="mt-6 flex items-center justify-between">
                    <a
                        href={`/p/${project.slug}`}
                        className="alex-btn alex-btn--ghost inline-flex items-center gap-1 px-3 py-1 text-sm"
                        style={{ borderRadius: "var(--theme-radius-button)" }}
                    >
                        <i className="fa-solid fa-arrow-left text-xs" />{" "}
                        {t("blueprints.create.back")}
                    </a>
                    <div className="flex items-center gap-2">
                        {step === "basics" && canHaveFields && (
                            <ActionButton
                                icon="fa-solid fa-arrow-right"
                                label={t("blueprints.create.next_fields")}
                                variant="ghost"
                                onClick={() => setStep("fields")}
                            />
                        )}
                        <ActionButton
                            icon="fa-solid fa-check"
                            label={t("blueprints.create.submit").replace(
                                ":type",
                                selectedClassification?.label ??
                                    t("blueprints.create.submit_fallback"),
                            )}
                            onClick={handleSubmit}
                            loading={form.processing}
                            disabled={!form.data.name.trim()}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function SettingsRow({
    title,
    description,
    checked,
    onChange,
}: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label
            className="alex-row flex cursor-pointer items-center justify-between px-4 py-3"
            style={settingRowStyle}
        >
            <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs" style={helperStyle}>
                    {description}
                </p>
            </div>
            <input
                type="checkbox"
                role="switch"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                style={{
                    accentColor: TOGGLE_ACCENT,
                    width: "2rem",
                    height: "1.25rem",
                }}
            />
        </label>
    );
}
