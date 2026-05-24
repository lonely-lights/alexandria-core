// `BlueprintViewEntry` lives in the views registry slice
// (`lib/views/types`) — that's the canonical shape used by every
// view-rendering surface (ViewToggle, useBlueprintViews, the
// kanban/graph/timeline panels). Re-export here so consumers
// importing the public Blueprint shape get the same type without
// having to reach into lib/views.
import type { BlueprintViewEntry } from '../lib/views/types';
export type { BlueprintViewEntry };

export interface BlueprintField {
    id: number | null;
    label: string;
    name: string;
    type: string;
    description: string | null;
    is_required: boolean;
    validation_rules: Record<string, unknown>;
    sort_order: number;
}

export interface InfoboxBlock {
    type: 'hierarchy' | 'attribute' | 'relationships' | 'header' | 'mentioned_in';
    data: Record<string, unknown>;
}

export interface BlueprintDetail {
    id: number;
    name: string;
    slug: string;
    icon: string;
    description: string | null;
    classification: 'standard' | 'list' | 'structural' | 'relationship';
    list_selection_mode: 'single' | 'multiple';
    show_on_dashboard: boolean;
    is_linkable: boolean;
    is_hub: boolean;
    show_tree_view: boolean;
    enable_timeline: boolean;
    allow_ai_sorting: boolean;
    tag_aliases: string[];
    /**
     * Stage 8g.0 — structured slot metadata for AI sorting instructions.
     * Schema: docs/ai/structured-schema-spec.md (v2). Slots: recognition,
     * boundaries, reference_role, creation, structural_rules. The
     * BlueprintInstructionAssembler renders these to prose at accessor
     * read time. null = use legacy free-form `instructions` column.
     */
    ai_metadata: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    infobox_schema: InfoboxBlock[];
    entries_count: number;
    fields: BlueprintField[];
    views?: BlueprintViewEntry[];
    /** Stage 8b M2 — preset slug; null inherits the project cascade. */
    theme_preset_slug?: string | null;
    /** Stage 8b M2 — sparse DeepPartial<ThemeTokens> JSON layered on content scope only. */
    theme_override?: Record<string, unknown> | null;
    can: {
        update: boolean;
        delete: boolean;
    };
}

export interface SiblingBlueprint {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    classification: string;
}

export interface AvailableColumn {
    key: string;
    label: string;
    type: 'native' | 'field' | 'calculated';
    field_type?: string;
    sortable: boolean;
}

export interface ViewConfig {
    id: number | null;
    name: string;
    type: string;
    config: {
        columns: string[];
        sortable_columns: string[];
        sort_field: string;
        sort_direction: 'asc' | 'desc';
        per_page: number;
    };
    is_personal: boolean;
}

export interface SavedView {
    id: number;
    name: string;
    is_default: boolean;
    is_personal: boolean;
}

export interface TimelineViewConfig {
    date_field: string | null;
    end_date_field: string | null;
    group_by: string | null;
    orientation: 'horizontal' | 'vertical';
    zoom: 'day' | 'month' | 'year' | 'decade' | 'century' | 'millennium';
    display_start_year: number | null;
    display_end_year: number | null;
}

export interface TimelineBlueprintRef {
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
}

export interface BlueprintShowProps {
    project: {
        id: number;
        name: string;
        slug: string;
    };
    blueprint: BlueprintDetail;
    viewConfig: ViewConfig;
    timelineViewConfig: TimelineViewConfig | null;
    savedViews: SavedView[];
    availableColumns: AvailableColumn[];
    listableBlueprints: SiblingBlueprint[];
    relationshipBlueprints: SiblingBlueprint[];
    referencingRelationshipBlueprints: SiblingBlueprint[];
    projectBlueprints: SiblingBlueprint[];
    timelineBlueprints: TimelineBlueprintRef[];
    [key: string]: unknown;
}

export interface EntryListItem {
    id: number;
    name: string;
    slug: string;
    summary: string | null;
    content: string | null;
    sort_order: number;
    is_stub: boolean;
    created_at: string;
    updated_at: string;
    url: string;
    fields?: Record<string, unknown>;
    calculated?: Record<string, number>;
}
