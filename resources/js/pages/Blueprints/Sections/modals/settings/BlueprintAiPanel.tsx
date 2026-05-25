import { useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";

import ActionButton from "@alexandria/components/ui/ActionButton";
import useT from "@alexandria/hooks/useT";
import type { BlueprintDetail } from "@alexandria/types/blueprints";

import SettingsActivationToggle from "./SettingsActivationToggle";
import { footerDividerStyle } from "./settingsPanelStyles";
import BoundariesSlotEditor from "./slots/BoundariesSlotEditor";
import CreationSlotEditor from "./slots/CreationSlotEditor";
import RecognitionSlotEditor from "./slots/RecognitionSlotEditor";
import ReferenceRoleSlotEditor from "./slots/ReferenceRoleSlotEditor";
import StructuralRulesSlotEditor from "./slots/StructuralRulesSlotEditor";
import TagAliasesEditor from "./slots/TagAliasesEditor";
import type {
    AiMetadata,
    BoundaryRule,
    CreationSlot,
    NoteAttachmentSlot,
    RecognitionSlot,
    ReferenceRoleSlot,
    StructuralRulesSlot,
} from "./slots/types";

/**
 * AI Sorting panel — the host for every AI-routing-related configuration
 * for a blueprint. Owns the form state + composes the ai_metadata
 * payload at save time; the per-slot editors under `./slots/` own their
 * UI and emit typed slot drafts via onChange.
 *
 * Toggle off = no slot editors shown (nothing applies).
 * Toggle on = TagAliases + 5 metadata slot editors (2 always-open
 * primary, 3 collapsed secondary).
 *
 * Schema reference: alexandria-app/docs/ai/structured-schema-spec.md (v2).
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

    // Preserve whatever metadata the backend currently returns; the
    // composer below merges per-slot edits in at submit time.
    const initialMetadata: AiMetadata = useMemo(
        () => ((blueprint.ai_metadata as AiMetadata | null) ?? {}),
        [blueprint.ai_metadata],
    );

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

    // One state per metadata slot — each is a cohesive typed value
    // emitted by its slot editor. composeMetadata reads these at save.
    const [recognition, setRecognition] = useState<RecognitionSlot>(
        (initialMetadata.recognition as RecognitionSlot | undefined) ?? {},
    );
    const [creation, setCreation] = useState<CreationSlot>(
        (initialMetadata.creation as CreationSlot | undefined) ?? {},
    );
    const [boundaries, setBoundaries] = useState<BoundaryRule[]>(
        (initialMetadata.boundaries as BoundaryRule[] | undefined) ?? [],
    );
    const [referenceRole, setReferenceRole] = useState<ReferenceRoleSlot>(
        (initialMetadata.reference_role as ReferenceRoleSlot | undefined) ?? {
            referenced_by_blueprint: "",
            referenced_by_field: "",
        },
    );
    const [structuralRules, setStructuralRules] = useState<StructuralRulesSlot>(
        (initialMetadata.structural_rules as StructuralRulesSlot | undefined) ?? {},
    );

    /**
     * Build the ai_metadata payload from per-slot state. Each slot's
     * sub-fields are normalized (trim + drop empties); a slot is omitted
     * entirely when nothing's set. Returns null when no slot has content
     * so the controller's `array_key_exists` sees the key, runs the write,
     * and clears stored metadata.
     */
    function composeMetadata(): Record<string, unknown> | null {
        const next: AiMetadata = { ...initialMetadata };

        // Recognition
        const trimmedLead = (recognition.lead ?? "").trim();
        const cleanedExamples = (recognition.examples ?? [])
            .map((e) => e.trim())
            .filter((e) => e.length > 0);
        const cleanedNegatives = (recognition.negative_examples ?? [])
            .map((e) => e.trim())
            .filter((e) => e.length > 0);
        if (trimmedLead.length === 0) {
            delete next.recognition;
        } else {
            const r: RecognitionSlot = { lead: trimmedLead };
            if (cleanedExamples.length > 0) r.examples = cleanedExamples;
            if (cleanedNegatives.length > 0) r.negative_examples = cleanedNegatives;
            next.recognition = r;
        }

        // Creation — each sub-field independently optional.
        const trimmedNaming = (creation.naming ?? "").trim();
        const trimmedSummary = (creation.summary ?? "").trim();
        const trimmedPrimaryRole = (creation.note_attachment?.primary_role ?? "")
            .trim();
        const cleanedCopyTargets = (creation.note_attachment?.copy_targets ?? [])
            .map((c) => ({
                blueprint_slug: c.blueprint_slug.trim(),
                trigger: c.trigger.trim(),
            }))
            .filter((c) => c.blueprint_slug.length > 0 || c.trigger.length > 0);
        const trimmedRelGuidance = (creation.relationships?.guidance ?? "").trim();

        const c: CreationSlot = {};
        if (trimmedNaming) c.naming = trimmedNaming;
        if (trimmedSummary) c.summary = trimmedSummary;
        if (trimmedPrimaryRole || cleanedCopyTargets.length > 0) {
            const na: NoteAttachmentSlot = {};
            if (trimmedPrimaryRole) na.primary_role = trimmedPrimaryRole;
            if (cleanedCopyTargets.length > 0) na.copy_targets = cleanedCopyTargets;
            c.note_attachment = na;
        }
        if (trimmedRelGuidance) c.relationships = { guidance: trimmedRelGuidance };
        if (Object.keys(c).length > 0) {
            next.creation = c;
        } else {
            delete next.creation;
        }

        // Boundaries — drop rows with no target AND no rule.
        const cleanedBoundaries = boundaries
            .map((b) => ({
                target: b.target.trim(),
                kind: b.kind,
                rule: b.rule.trim(),
            }))
            .filter((b) => b.target.length > 0 || b.rule.length > 0);
        if (cleanedBoundaries.length > 0) {
            next.boundaries = cleanedBoundaries;
        } else {
            delete next.boundaries;
        }

        // Reference Role — both fields required if slot is present.
        const trimmedRefBp = referenceRole.referenced_by_blueprint.trim();
        const trimmedRefField = referenceRole.referenced_by_field.trim();
        if (trimmedRefBp.length > 0 && trimmedRefField.length > 0) {
            next.reference_role = {
                referenced_by_blueprint: trimmedRefBp,
                referenced_by_field: trimmedRefField,
            };
        } else {
            delete next.reference_role;
        }

        // Structural Rules — three independently optional sub-slots.
        const sr: StructuralRulesSlot = {};
        const parent = structuralRules.parent ?? {};
        const cleanedParentTargets = (parent.target_blueprints ?? [])
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        const trimmedSelectionHint = (parent.selection_hint ?? "").trim();
        const trimmedChainAnchor = (parent.chain_anchor_hint ?? "").trim();
        const parentHasContent =
            cleanedParentTargets.length > 0 ||
            trimmedSelectionHint.length > 0 ||
            trimmedChainAnchor.length > 0 ||
            parent.required ||
            parent.search_existing_first;
        if (parentHasContent) {
            const p: typeof sr.parent = {};
            if (parent.required) p.required = true;
            if (cleanedParentTargets.length > 0)
                p.target_blueprints = cleanedParentTargets;
            if (trimmedSelectionHint.length > 0)
                p.selection_hint = trimmedSelectionHint;
            if (trimmedChainAnchor.length > 0)
                p.chain_anchor_hint = trimmedChainAnchor;
            if (parent.search_existing_first) p.search_existing_first = true;
            sr.parent = p;
        }

        const cleanedCascading = (structuralRules.cascading_relationships ?? [])
            .map((cr) => ({
                via: cr.via,
                pairing: cr.pairing.trim(),
                target_blueprint: cr.target_blueprint.trim(),
                trigger: cr.trigger.trim(),
            }))
            .filter(
                (cr) =>
                    cr.pairing.length > 0 ||
                    cr.target_blueprint.length > 0 ||
                    cr.trigger.length > 0,
            );
        if (cleanedCascading.length > 0) {
            sr.cascading_relationships = cleanedCascading;
        }

        const cleanedDeps = (structuralRules.dependencies ?? [])
            .map((d) => ({
                target_blueprint: d.target_blueprint.trim(),
                via_field: d.via_field.trim(),
                creation_policy: d.creation_policy,
            }))
            .filter(
                (d) => d.target_blueprint.length > 0 || d.via_field.length > 0,
            );
        if (cleanedDeps.length > 0) sr.dependencies = cleanedDeps;

        if (Object.keys(sr).length > 0) {
            next.structural_rules = sr;
        } else {
            delete next.structural_rules;
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

    return (
        <>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {/* Master toggle — relocated from Behavior panel. */}
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
                        <TagAliasesEditor
                            value={form.data.tag_aliases}
                            onChange={(next) => form.setData("tag_aliases", next)}
                        />
                        <RecognitionSlotEditor
                            value={recognition}
                            onChange={setRecognition}
                        />
                        <CreationSlotEditor
                            value={creation}
                            onChange={setCreation}
                        />
                        <BoundariesSlotEditor
                            value={boundaries}
                            onChange={setBoundaries}
                        />
                        <ReferenceRoleSlotEditor
                            value={referenceRole}
                            onChange={setReferenceRole}
                        />
                        <StructuralRulesSlotEditor
                            value={structuralRules}
                            onChange={setStructuralRules}
                        />
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
