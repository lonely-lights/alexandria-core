import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useForm } from "@inertiajs/react";

import ActionButton from "@alexandria/components/ui/ActionButton";
import useT from "@alexandria/hooks/useT";
import type { BlueprintDetail } from "@alexandria/types/blueprints";

import SettingsActivationToggle from "./SettingsActivationToggle";
import SettingsObjectList from "./SettingsObjectList";
import SettingsStringList from "./SettingsStringList";
import { footerDividerStyle } from "./settingsPanelStyles";

const aliasInputStyle: CSSProperties = {
    background: "var(--theme-base-surface)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
    borderRadius: "var(--theme-radius-input)",
    color: "var(--theme-base-content)",
};

const aliasChipStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-primary, var(--theme-base-content)) 10%, transparent)",
    border: "1px solid color-mix(in srgb, var(--theme-primary, var(--theme-base-content)) 28%, transparent)",
    borderRadius: "var(--theme-radius-pill)",
    color: "var(--theme-base-content)",
};

const aliasEmptyStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
    fontStyle: "italic",
};

// Slot card chrome — left-edge accent stripe in primary color
// differentiates each slot visually from the next.
const slotCardStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-content) 3%, transparent)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
    borderLeft: "3px solid var(--theme-primary, color-mix(in srgb, var(--theme-base-content) 35%, transparent))",
    borderRadius: "var(--theme-radius-box)",
    color: "var(--theme-base-content)",
};

const placeholderCardStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-content) 2%, transparent)",
    border: "1px dashed color-mix(in srgb, var(--theme-base-content) 12%, transparent)",
    borderLeft: "3px dashed color-mix(in srgb, var(--theme-primary, var(--theme-base-content)) 35%, transparent)",
    borderRadius: "var(--theme-radius-box)",
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};

// Tier 1 — slot title. Uses theme-primary so the header is the strongest
// color anchor on the card, pairing with the icon + left stripe.
const slotTitleStyle: CSSProperties = {
    color: "var(--theme-primary, var(--theme-base-content))",
};

const slotIconStyle: CSSProperties = {
    color: "var(--theme-primary, color-mix(in srgb, var(--theme-base-content) 65%, transparent))",
};

// Tier 2 — slot description (one-line subhead under the title)
const slotDescStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 60%, transparent)",
};

// Tier 3 — sub-section divider header (e.g. "Note attachment" within Creation).
// Primary-tinted divider so the section break catches the eye.
const subSectionHeaderStyle: CSSProperties = {
    color: "var(--theme-base-content)",
    borderTop: "1px solid color-mix(in srgb, var(--theme-primary, var(--theme-base-content)) 20%, transparent)",
};

// Sub-section heading text (e.g. "Note attachment") — primary-tinted but
// slightly muted so the slot title stays the dominant header.
const subSectionTitleStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-primary, var(--theme-base-content)) 85%, var(--theme-base-content))",
};

// Tier 4 — field label (small caps so it never collides with hint text)
const fieldLabelStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 85%, transparent)",
    letterSpacing: "0.06em",
};

// Tier 5 — field hint (italic + faded so it reads as helper text, not label)
const fieldHintStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 55%, transparent)",
    fontStyle: "italic",
};

const leadTextareaStyle: CSSProperties = {
    background: "var(--theme-base-surface)",
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)",
    borderRadius: "var(--theme-radius-input)",
    color: "var(--theme-base-content)",
};

const disclosureButtonStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 80%, transparent)",
};

// Icon mapping per card — gives each section a scannable visual anchor.
const slotIcons: Record<string, string> = {
    tag_aliases: "fa-solid fa-tag",
    recognition: "fa-solid fa-eye",
    creation: "fa-solid fa-pen-nib",
    boundaries: "fa-solid fa-arrows-left-right",
    reference_role: "fa-solid fa-link",
    structural_rules: "fa-solid fa-sitemap",
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

interface CopyTarget {
    blueprint_slug: string;
    trigger: string;
}

interface NoteAttachmentSlot {
    primary_role?: string;
    copy_targets?: CopyTarget[];
}

interface CreationSlot {
    naming?: string;
    summary?: string;
    note_attachment?: NoteAttachmentSlot;
    relationships?: { guidance: string };
}

interface AiMetadata {
    schema_version?: number;
    recognition?: RecognitionSlot;
    creation?: CreationSlot;
    // boundaries / reference_role / structural_rules land in P4d–P4e;
    // preserved as opaque pass-through until then.
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
    const initialCreation: CreationSlot =
        (initialMetadata.creation as CreationSlot | undefined) ?? {};
    const initialNoteAttachment: NoteAttachmentSlot =
        initialCreation.note_attachment ?? {};

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

    // Creation slot local state.
    const [creationNaming, setCreationNaming] = useState<string>(
        initialCreation.naming ?? "",
    );
    const [creationSummary, setCreationSummary] = useState<string>(
        initialCreation.summary ?? "",
    );
    const [creationPrimaryRole, setCreationPrimaryRole] = useState<string>(
        initialNoteAttachment.primary_role ?? "",
    );
    const [creationCopyTargets, setCreationCopyTargets] = useState<CopyTarget[]>(
        initialNoteAttachment.copy_targets ?? [],
    );
    const [creationRelationshipsGuidance, setCreationRelationshipsGuidance] =
        useState<string>(initialCreation.relationships?.guidance ?? "");
    const [showCreationRelationships, setShowCreationRelationships] = useState(
        (initialCreation.relationships?.guidance ?? "").trim().length > 0,
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

        // Creation slot composition. Each sub-field is independently
        // optional; the slot itself is omitted only when every field
        // and the nested note_attachment + relationships are blank.
        const trimmedNaming = creationNaming.trim();
        const trimmedSummary = creationSummary.trim();
        const trimmedPrimaryRole = creationPrimaryRole.trim();
        const cleanedCopyTargets = creationCopyTargets
            .map((t) => ({
                blueprint_slug: t.blueprint_slug.trim(),
                trigger: t.trigger.trim(),
            }))
            .filter(
                (t) => t.blueprint_slug.length > 0 || t.trigger.length > 0,
            );
        const trimmedRelationshipsGuidance =
            creationRelationshipsGuidance.trim();

        const creation: CreationSlot = {};
        if (trimmedNaming) creation.naming = trimmedNaming;
        if (trimmedSummary) creation.summary = trimmedSummary;
        if (trimmedPrimaryRole || cleanedCopyTargets.length > 0) {
            const noteAttachment: NoteAttachmentSlot = {};
            if (trimmedPrimaryRole) noteAttachment.primary_role = trimmedPrimaryRole;
            if (cleanedCopyTargets.length > 0) {
                noteAttachment.copy_targets = cleanedCopyTargets;
            }
            creation.note_attachment = noteAttachment;
        }
        if (trimmedRelationshipsGuidance) {
            creation.relationships = { guidance: trimmedRelationshipsGuidance };
        }
        if (Object.keys(creation).length > 0) {
            next.creation = creation;
        } else {
            delete next.creation;
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

    // The 3 metadata slots that remain placeholders until P4d–P4e.
    // Recognition + Creation are real forms below.
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
                    <div className="space-y-6 pt-2">
                        {/* Tag aliases — wears the same card chrome as the slots
                            since it's a sibling AI-sorting configuration the
                            author tweaks per blueprint. */}
                        <div className="space-y-4 p-5" style={slotCardStyle}>
                            <div className="flex items-start gap-2.5">
                                <i
                                    className={`${slotIcons.tag_aliases} mt-0.5 text-base`}
                                    style={slotIconStyle}
                                    aria-hidden
                                />
                                <div className="flex-1">
                                    <div
                                        className="text-base font-semibold leading-tight"
                                        style={slotTitleStyle}
                                    >
                                        {t(
                                            "blueprints.bp_settings.ai.tag_aliases.title",
                                        )}
                                    </div>
                                    <div className="mt-1 text-xs" style={slotDescStyle}>
                                        {t(
                                            "blueprints.bp_settings.ai.tag_aliases.description",
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
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
                                            className="text-xs"
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
                                    className="w-full px-3 py-2 text-sm focus:outline-none"
                                    style={aliasInputStyle}
                                />
                            </div>
                        </div>

                        {/* Recognition slot — the first guided slot form. */}
                        <div
                            className="space-y-5 p-5"
                            style={slotCardStyle}
                        >
                            <div className="flex items-start gap-2.5">
                                <i
                                    className={`${slotIcons.recognition} mt-0.5 text-base`}
                                    style={slotIconStyle}
                                    aria-hidden
                                />
                                <div className="flex-1">
                                    <div
                                        className="text-base font-semibold leading-tight"
                                        style={slotTitleStyle}
                                    >
                                        {t(
                                            "blueprints.bp_settings.ai.slots.recognition.title",
                                        )}
                                    </div>
                                    <div className="mt-1 text-xs" style={slotDescStyle}>
                                        {t(
                                            "blueprints.bp_settings.ai.slots.recognition.description",
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Lead — the required prose framing for this slot. */}
                            <div className="space-y-2">
                                <div>
                                    <label
                                        className="text-[10px] font-semibold uppercase"
                                        style={fieldLabelStyle}
                                    >
                                        {t(
                                            "blueprints.bp_settings.ai.slots.recognition.lead.label",
                                        )}
                                    </label>
                                    <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                                        {t(
                                            "blueprints.bp_settings.ai.slots.recognition.lead.hint",
                                        )}
                                    </div>
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
                                    className="w-full resize-y px-3 py-2 text-sm focus:outline-none"
                                    style={leadTextareaStyle}
                                />
                            </div>

                            {/* Examples — positive routing hints. */}
                            <div className="space-y-2">
                                <div>
                                    <label
                                        className="text-[10px] font-semibold uppercase"
                                        style={fieldLabelStyle}
                                    >
                                        {t(
                                            "blueprints.bp_settings.ai.slots.recognition.examples.label",
                                        )}
                                    </label>
                                    <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                                        {t(
                                            "blueprints.bp_settings.ai.slots.recognition.examples.hint",
                                        )}
                                    </div>
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
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowNegativeExamples((v) => !v)
                                    }
                                    className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-xs font-semibold transition-colors hover:bg-[color:color-mix(in_srgb,var(--theme-base-content)_5%,transparent)]"
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
                                    <div className="space-y-2 pt-1">
                                        <div
                                            className="text-xs"
                                            style={fieldHintStyle}
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

                        {/* Creation slot — naming, summary, note attachment, optional relationships guidance. */}
                        <div
                            className="space-y-5 p-5"
                            style={slotCardStyle}
                        >
                            <div className="flex items-start gap-2.5">
                                <i
                                    className={`${slotIcons.creation} mt-0.5 text-base`}
                                    style={slotIconStyle}
                                    aria-hidden
                                />
                                <div className="flex-1">
                                    <div
                                        className="text-base font-semibold leading-tight"
                                        style={slotTitleStyle}
                                    >
                                        {t(
                                            "blueprints.bp_settings.ai.slots.creation.title",
                                        )}
                                    </div>
                                    <div className="mt-1 text-xs" style={slotDescStyle}>
                                        {t(
                                            "blueprints.bp_settings.ai.slots.creation.description",
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Naming — prose guidance for the AI's entry-title choice. */}
                            <div className="space-y-2">
                                <div>
                                    <label
                                        className="text-[10px] font-semibold uppercase"
                                        style={fieldLabelStyle}
                                    >
                                        {t(
                                            "blueprints.bp_settings.ai.slots.creation.naming.label",
                                        )}
                                    </label>
                                    <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                                        {t(
                                            "blueprints.bp_settings.ai.slots.creation.naming.hint",
                                        )}
                                    </div>
                                </div>
                                <textarea
                                    value={creationNaming}
                                    onChange={(e) =>
                                        setCreationNaming(e.target.value)
                                    }
                                    placeholder={t(
                                        "blueprints.bp_settings.ai.slots.creation.naming.placeholder",
                                    )}
                                    rows={2}
                                    className="w-full resize-y px-3 py-2 text-sm focus:outline-none"
                                    style={leadTextareaStyle}
                                />
                            </div>

                            {/* Summary — what fills the entry's summary field. */}
                            <div className="space-y-2">
                                <div>
                                    <label
                                        className="text-[10px] font-semibold uppercase"
                                        style={fieldLabelStyle}
                                    >
                                        {t(
                                            "blueprints.bp_settings.ai.slots.creation.summary.label",
                                        )}
                                    </label>
                                    <div className="mt-0.5 text-xs" style={fieldHintStyle}>
                                        {t(
                                            "blueprints.bp_settings.ai.slots.creation.summary.hint",
                                        )}
                                    </div>
                                </div>
                                <textarea
                                    value={creationSummary}
                                    onChange={(e) =>
                                        setCreationSummary(e.target.value)
                                    }
                                    placeholder={t(
                                        "blueprints.bp_settings.ai.slots.creation.summary.placeholder",
                                    )}
                                    rows={2}
                                    className="w-full resize-y px-3 py-2 text-sm focus:outline-none"
                                    style={leadTextareaStyle}
                                />
                            </div>

                            {/* Note attachment — sub-section with divider so it reads as a group, not just another field. */}
                            <div className="space-y-4 pt-4" style={subSectionHeaderStyle}>
                                <div>
                                    <div
                                        className="text-sm font-semibold"
                                        style={subSectionTitleStyle}
                                    >
                                        {t(
                                            "blueprints.bp_settings.ai.slots.creation.note_attachment.heading",
                                        )}
                                    </div>
                                    <div
                                        className="mt-0.5 text-xs"
                                        style={fieldHintStyle}
                                    >
                                        {t(
                                            "blueprints.bp_settings.ai.slots.creation.note_attachment.description",
                                        )}
                                    </div>
                                </div>

                                {/* Primary role — the phrase that completes "transfer the note to ___". */}
                                <div className="space-y-2">
                                    <div>
                                        <label
                                            className="text-[10px] font-semibold uppercase"
                                            style={fieldLabelStyle}
                                        >
                                            {t(
                                                "blueprints.bp_settings.ai.slots.creation.note_attachment.primary_role.label",
                                            )}
                                        </label>
                                        <div
                                            className="mt-0.5 text-xs"
                                            style={fieldHintStyle}
                                        >
                                            {t(
                                                "blueprints.bp_settings.ai.slots.creation.note_attachment.primary_role.hint",
                                            )}
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={creationPrimaryRole}
                                        onChange={(e) =>
                                            setCreationPrimaryRole(e.target.value)
                                        }
                                        placeholder={t(
                                            "blueprints.bp_settings.ai.slots.creation.note_attachment.primary_role.placeholder",
                                        )}
                                        className="w-full px-3 py-2 text-sm focus:outline-none"
                                        style={leadTextareaStyle}
                                    />
                                </div>

                                {/* Copy targets — list of {blueprint_slug, trigger} pairs. */}
                                <div className="space-y-2">
                                    <div>
                                        <label
                                            className="text-[10px] font-semibold uppercase"
                                            style={fieldLabelStyle}
                                        >
                                            {t(
                                                "blueprints.bp_settings.ai.slots.creation.note_attachment.copy_targets.label",
                                            )}
                                        </label>
                                        <div
                                            className="mt-0.5 text-xs"
                                            style={fieldHintStyle}
                                        >
                                            {t(
                                                "blueprints.bp_settings.ai.slots.creation.note_attachment.copy_targets.hint",
                                            )}
                                        </div>
                                    </div>
                                    <SettingsObjectList<CopyTarget>
                                        values={creationCopyTargets}
                                        onChange={setCreationCopyTargets}
                                        createEmpty={() => ({
                                            blueprint_slug: "",
                                            trigger: "",
                                        })}
                                        addLabel={t(
                                            "blueprints.bp_settings.ai.slots.creation.note_attachment.copy_targets.add",
                                        )}
                                        removeLabel={t(
                                            "blueprints.bp_settings.ai.slots.creation.note_attachment.copy_targets.remove",
                                        )}
                                        emptyHint={t(
                                            "blueprints.bp_settings.ai.slots.creation.note_attachment.copy_targets.empty",
                                        )}
                                        renderItem={(item, update) => (
                                            <>
                                                <input
                                                    type="text"
                                                    value={item.blueprint_slug}
                                                    onChange={(e) =>
                                                        update({
                                                            ...item,
                                                            blueprint_slug:
                                                                e.target.value,
                                                        })
                                                    }
                                                    placeholder={t(
                                                        "blueprints.bp_settings.ai.slots.creation.note_attachment.copy_targets.blueprint_slug.placeholder",
                                                    )}
                                                    className="w-full bg-transparent px-0 py-0.5 font-mono text-sm font-medium focus:outline-none"
                                                    style={slotTitleStyle}
                                                />
                                                <input
                                                    type="text"
                                                    value={item.trigger}
                                                    onChange={(e) =>
                                                        update({
                                                            ...item,
                                                            trigger: e.target.value,
                                                        })
                                                    }
                                                    placeholder={t(
                                                        "blueprints.bp_settings.ai.slots.creation.note_attachment.copy_targets.trigger.placeholder",
                                                    )}
                                                    className="w-full bg-transparent px-0 py-0.5 text-xs focus:outline-none"
                                                    style={fieldHintStyle}
                                                />
                                            </>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Relationships guidance — optional, hidden by default. */}
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowCreationRelationships((v) => !v)
                                    }
                                    className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-xs font-semibold transition-colors hover:bg-[color:color-mix(in_srgb,var(--theme-base-content)_5%,transparent)]"
                                    style={disclosureButtonStyle}
                                >
                                    <i
                                        className={`fa-solid fa-chevron-${
                                            showCreationRelationships ? "down" : "right"
                                        }`}
                                    />
                                    {showCreationRelationships
                                        ? t(
                                              "blueprints.bp_settings.ai.slots.creation.relationships.hide",
                                          )
                                        : t(
                                              "blueprints.bp_settings.ai.slots.creation.relationships.show",
                                          )}
                                </button>
                                {showCreationRelationships && (
                                    <div className="space-y-2 pt-1">
                                        <div
                                            className="text-xs"
                                            style={fieldHintStyle}
                                        >
                                            {t(
                                                "blueprints.bp_settings.ai.slots.creation.relationships.hint",
                                            )}
                                        </div>
                                        <textarea
                                            value={creationRelationshipsGuidance}
                                            onChange={(e) =>
                                                setCreationRelationshipsGuidance(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder={t(
                                                "blueprints.bp_settings.ai.slots.creation.relationships.placeholder",
                                            )}
                                            rows={3}
                                            className="w-full resize-y px-3 py-2 text-sm focus:outline-none"
                                            style={leadTextareaStyle}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Remaining slot placeholders — real forms land in P4d–P4e. */}
                        {upcomingSlots.map((slot) => (
                            <div
                                key={slot.key}
                                className="p-5"
                                style={placeholderCardStyle}
                            >
                                <div className="flex items-start gap-2.5">
                                    <i
                                        className={`${slotIcons[slot.key] ?? "fa-solid fa-circle"} mt-0.5 text-base opacity-60`}
                                        style={slotIconStyle}
                                        aria-hidden
                                    />
                                    <div className="flex-1">
                                        <div
                                            className="text-base font-semibold leading-tight"
                                            style={slotTitleStyle}
                                        >
                                            {t(slot.titleKey)}
                                        </div>
                                        <div className="mt-1 text-xs" style={slotDescStyle}>
                                            {t(slot.descKey)}
                                        </div>
                                        <div
                                            className="mt-3 text-xs"
                                            style={aliasEmptyStyle}
                                        >
                                            {t("blueprints.bp_settings.ai.coming_soon")}
                                        </div>
                                    </div>
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
