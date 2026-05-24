import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useForm } from "@inertiajs/react";

import ActionButton from "@alexandria/components/ui/ActionButton";
import useT from "@alexandria/hooks/useT";
import type { BlueprintDetail } from "@alexandria/types/blueprints";

import SettingsActivationToggle from "./SettingsActivationToggle";
import SettingsStringList from "./SettingsStringList";
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

const slotCardStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-content) 3%, transparent)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
    borderRadius: "var(--theme-radius-box)",
    color: "var(--theme-base-content)",
};

const slotLabelStyle: CSSProperties = {
    color: "var(--theme-base-content)",
};

const slotDescStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};

const leadTextareaStyle: CSSProperties = {
    background: "var(--theme-base-surface)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
    borderRadius: "var(--theme-radius-input)",
    color: "var(--theme-base-content)",
};

const disclosureButtonStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
};

/**
 * Shape mirror of the ai_metadata payload — kept narrow so the form
 * composer can normalize. Other slot interfaces will land alongside
 * their respective P4 sub-phases.
 *
 * Schema source of truth: docs/ai/structured-schema-spec.md (v2).
 */
interface RecognitionSlot {
    lead?: string;
    examples?: string[];
    negative_examples?: string[];
}

interface AiMetadata {
    schema_version?: number;
    recognition?: RecognitionSlot;
    // boundaries / reference_role / creation / structural_rules land in
    // P4c–P4e; preserved as opaque pass-through until then.
    [key: string]: unknown;
}

/**
 * AI Sorting panel — houses the activation toggle plus all metadata-slot
 * configuration that controls how the AI categorizes notes into this
 * blueprint. Toggle off = no configuration shown (since none of it applies).
 * Toggle on = the 5 slot sections (recognition / boundaries /
 * reference_role / creation / structural_rules) — P4b ships recognition
 * as a real guided form; the other four remain placeholder cards until
 * their respective P4 sub-phases land.
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

    // Preserve whatever metadata the backend currently returns; the form
    // composer below merges per-slot edits in at submit time.
    const initialMetadata: AiMetadata = useMemo(
        () => ((blueprint.ai_metadata as AiMetadata | null) ?? {}),
        [blueprint.ai_metadata],
    );
    const initialRecognition: RecognitionSlot =
        (initialMetadata.recognition as RecognitionSlot | undefined) ?? {};

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
        // NOTE: ai_metadata is intentionally NOT in useForm's initial
        // data — Record<string, unknown> would poison Inertia's
        // FormDataType inference and collapse every field to unknown.
        // It's appended at submit time via form.transform() instead.
    });

    const [aliasDraft, setAliasDraft] = useState("");

    // Recognition slot local state.
    const [recognitionLead, setRecognitionLead] = useState<string>(
        initialRecognition.lead ?? "",
    );
    const [recognitionExamples, setRecognitionExamples] = useState<string[]>(
        initialRecognition.examples ?? [],
    );
    const [recognitionNegativeExamples, setRecognitionNegativeExamples] =
        useState<string[]>(initialRecognition.negative_examples ?? []);
    const [showNegativeExamples, setShowNegativeExamples] = useState(
        (initialRecognition.negative_examples?.length ?? 0) > 0,
    );

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

    /**
     * Build the ai_metadata payload from per-slot local state. Empty
     * slots are omitted so the assembler treats them as absent — that
     * keeps "lead is blank → recognition skipped" semantics aligned
     * with the schema's "every slot is optional" rule.
     */
    function composeMetadata(): Record<string, unknown> | null {
        const next: AiMetadata = { ...initialMetadata };

        const trimmedLead = recognitionLead.trim();
        const cleanedExamples = recognitionExamples
            .map((e) => e.trim())
            .filter((e) => e.length > 0);
        const cleanedNegativeExamples = recognitionNegativeExamples
            .map((e) => e.trim())
            .filter((e) => e.length > 0);

        if (trimmedLead.length === 0) {
            delete next.recognition;
        } else {
            const recognition: RecognitionSlot = { lead: trimmedLead };
            if (cleanedExamples.length > 0) {
                recognition.examples = cleanedExamples;
            }
            if (cleanedNegativeExamples.length > 0) {
                recognition.negative_examples = cleanedNegativeExamples;
            }
            next.recognition = recognition;
        }

        const populated = Object.keys(next).some(
            (key) => key !== "schema_version" && next[key] !== undefined,
        );
        if (!populated) return null;

        if (typeof next.schema_version !== "number") next.schema_version = 1;
        return next as Record<string, unknown>;
    }

    function handleSave() {
        // Inertia's transform() returns void, so call it as a statement
        // before put(). Sending null (not undefined) when no slot is
        // populated lets the controller's `array_key_exists` see the
        // key and clear stored metadata — stripping it would skip
        // the write entirely.
        form.transform((data) => ({
            ...data,
            ai_metadata: composeMetadata(),
        }));
        form.put(`/p/${project.slug}/${blueprint.slug}`, {
            onSuccess: () => onClose(),
        });
    }

    // The 4 metadata slots that remain placeholders until their P4 sub-phases.
    // Recognition is no longer in this list — it ships as a real form below.
    const upcomingSlots: Array<{ key: string; titleKey: string; descKey: string }> = [
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

                        {/* Recognition slot — the first guided slot form. */}
                        <div
                            className="space-y-3 px-3 py-3"
                            style={slotCardStyle}
                        >
                            <div>
                                <div
                                    className="text-sm font-medium"
                                    style={slotLabelStyle}
                                >
                                    {t(
                                        "blueprints.bp_settings.ai.slots.recognition.title",
                                    )}
                                </div>
                                <div className="text-xs" style={slotDescStyle}>
                                    {t(
                                        "blueprints.bp_settings.ai.slots.recognition.description",
                                    )}
                                </div>
                            </div>

                            {/* Lead — the required prose framing for this slot. */}
                            <div className="space-y-1">
                                <label
                                    className="text-xs font-medium"
                                    style={slotLabelStyle}
                                >
                                    {t(
                                        "blueprints.bp_settings.ai.slots.recognition.lead.label",
                                    )}
                                </label>
                                <div className="text-xs" style={slotDescStyle}>
                                    {t(
                                        "blueprints.bp_settings.ai.slots.recognition.lead.hint",
                                    )}
                                </div>
                                <textarea
                                    value={recognitionLead}
                                    onChange={(e) =>
                                        setRecognitionLead(e.target.value)
                                    }
                                    placeholder={t(
                                        "blueprints.bp_settings.ai.slots.recognition.lead.placeholder",
                                    )}
                                    rows={3}
                                    className="w-full resize-y px-3 py-1.5 text-sm focus:outline-none"
                                    style={leadTextareaStyle}
                                />
                            </div>

                            {/* Examples — positive routing hints. */}
                            <div className="space-y-1">
                                <label
                                    className="text-xs font-medium"
                                    style={slotLabelStyle}
                                >
                                    {t(
                                        "blueprints.bp_settings.ai.slots.recognition.examples.label",
                                    )}
                                </label>
                                <div className="text-xs" style={slotDescStyle}>
                                    {t(
                                        "blueprints.bp_settings.ai.slots.recognition.examples.hint",
                                    )}
                                </div>
                                <SettingsStringList
                                    values={recognitionExamples}
                                    onChange={setRecognitionExamples}
                                    placeholder={t(
                                        "blueprints.bp_settings.ai.slots.recognition.examples.placeholder",
                                    )}
                                    addLabel={t(
                                        "blueprints.bp_settings.ai.slots.recognition.examples.add",
                                    )}
                                    removeLabel={t(
                                        "blueprints.bp_settings.ai.slots.recognition.examples.remove",
                                    )}
                                    emptyHint={t(
                                        "blueprints.bp_settings.ai.slots.recognition.examples.empty",
                                    )}
                                />
                            </div>

                            {/* Counter-examples — optional, hidden by default. */}
                            <div className="space-y-1">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowNegativeExamples((v) => !v)
                                    }
                                    className="inline-flex items-center gap-1.5 text-xs font-medium"
                                    style={disclosureButtonStyle}
                                >
                                    <i
                                        className={`fa-solid fa-chevron-${
                                            showNegativeExamples ? "down" : "right"
                                        }`}
                                    />
                                    {showNegativeExamples
                                        ? t(
                                              "blueprints.bp_settings.ai.slots.recognition.negative_examples.hide",
                                          )
                                        : t(
                                              "blueprints.bp_settings.ai.slots.recognition.negative_examples.show",
                                          )}
                                </button>
                                {showNegativeExamples && (
                                    <div className="space-y-1 pt-1">
                                        <div
                                            className="text-xs"
                                            style={slotDescStyle}
                                        >
                                            {t(
                                                "blueprints.bp_settings.ai.slots.recognition.negative_examples.hint",
                                            )}
                                        </div>
                                        <SettingsStringList
                                            values={recognitionNegativeExamples}
                                            onChange={
                                                setRecognitionNegativeExamples
                                            }
                                            placeholder={t(
                                                "blueprints.bp_settings.ai.slots.recognition.negative_examples.placeholder",
                                            )}
                                            addLabel={t(
                                                "blueprints.bp_settings.ai.slots.recognition.negative_examples.add",
                                            )}
                                            removeLabel={t(
                                                "blueprints.bp_settings.ai.slots.recognition.negative_examples.remove",
                                            )}
                                            emptyHint={t(
                                                "blueprints.bp_settings.ai.slots.recognition.negative_examples.empty",
                                            )}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Remaining slot placeholders — real forms land in P4c–P4e. */}
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
