/**
 * Type definitions for the AI Sorting metadata slots.
 *
 * Schema source of truth: alexandria-app/docs/ai/structured-schema-spec.md (v2).
 * Stored as JSON in `ai_configurations.metadata`; assembled into prose
 * at read time by alexandria-core/src/Services/AI/BlueprintInstructionAssembler.
 */

export interface RecognitionSlot {
    lead?: string;
    examples?: string[];
    negative_examples?: string[];
}

export interface CopyTarget {
    blueprint_slug: string;
    trigger: string;
}

export interface NoteAttachmentSlot {
    primary_role?: string;
    copy_targets?: CopyTarget[];
}

export interface CreationSlot {
    naming?: string;
    summary?: string;
    note_attachment?: NoteAttachmentSlot;
    relationships?: { guidance: string };
}

export type BoundaryKind = "overlap" | "exclusion" | "precedence";

export interface BoundaryRule {
    target: string;
    kind: BoundaryKind;
    rule: string;
}

export interface ReferenceRoleSlot {
    referenced_by_blueprint: string;
    referenced_by_field: string;
}

export interface ParentSubSlot {
    required?: boolean;
    target_blueprints?: string[];
    selection_hint?: string | null;
    chain_anchor_hint?: string | null;
    search_existing_first?: boolean;
}

export interface CascadingRelationship {
    via: "entry_relationships";
    pairing: string;
    target_blueprint: string;
    trigger: string;
}

export type CreationPolicy =
    | "create_if_missing"
    | "must_exist"
    | "leave_unfilled";

export interface Dependency {
    target_blueprint: string;
    via_field: string;
    creation_policy: CreationPolicy;
}

export interface StructuralRulesSlot {
    parent?: ParentSubSlot;
    cascading_relationships?: CascadingRelationship[];
    dependencies?: Dependency[];
}

export interface AiMetadata {
    schema_version?: number;
    recognition?: RecognitionSlot;
    creation?: CreationSlot;
    boundaries?: BoundaryRule[];
    reference_role?: ReferenceRoleSlot;
    structural_rules?: StructuralRulesSlot;
    [key: string]: unknown;
}

export const BOUNDARY_KINDS: BoundaryKind[] = [
    "overlap",
    "exclusion",
    "precedence",
];

export const CREATION_POLICIES: CreationPolicy[] = [
    "create_if_missing",
    "must_exist",
    "leave_unfilled",
];

/**
 * Icon mapping per slot — gives each card a scannable visual anchor.
 * Used by SlotCard to render the icon header beside the title.
 */
export const slotIcons: Record<string, string> = {
    tag_aliases: "fa-solid fa-tag",
    recognition: "fa-solid fa-eye",
    creation: "fa-solid fa-pen-nib",
    boundaries: "fa-solid fa-arrows-left-right",
    reference_role: "fa-solid fa-link",
    structural_rules: "fa-solid fa-sitemap",
};
