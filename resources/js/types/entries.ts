export interface InfoboxItem {
    text: string;
    url: string | null;
    entry_id: number | null;
}

export interface InfoboxHeaderBlock {
    type: 'header';
    data: { text: string };
}

export interface InfoboxAttributeBlock {
    type: 'attribute';
    data: {
        label: string;
        field_name: string;
        field_type: string;
        items: InfoboxItem[];
        limit_enabled: boolean;
        visible_limit: number;
    };
}

export interface InfoboxRelationshipItem {
    label: string;
    show_label: boolean;
    entry: {
        id: number;
        name: string;
        slug: string;
        url: string | null;
        icon: string;
    };
    subtitle_html: string | null;
}

export interface InfoboxRelationshipsBlock {
    type: 'relationships';
    data: {
        header: string;
        items: InfoboxRelationshipItem[];
        limit_enabled: boolean;
        visible_limit: number;
    };
}

export interface InfoboxHierarchyEntry {
    id: number;
    name: string;
    slug: string;
    url: string | null;
    type_name: string | null;
}

export interface InfoboxHierarchyBlock {
    type: 'hierarchy';
    data: {
        parent: InfoboxHierarchyEntry | null;
        children: InfoboxHierarchyEntry[];
        children_total: number;
        limit_enabled: boolean;
        visible_limit: number;
    };
}

export interface InfoboxMentionedInBlock {
    type: 'mentioned_in';
    data: {
        label: string;
        items: InfoboxItem[];
        limit_enabled: boolean;
        visible_limit: number;
    };
}

export type InfoboxBlock =
    | InfoboxHeaderBlock
    | InfoboxAttributeBlock
    | InfoboxRelationshipsBlock
    | InfoboxHierarchyBlock
    | InfoboxMentionedInBlock;

export interface EntryShowProject {
    id: number;
    name: string;
    slug: string;
}

export interface EntryShowBlueprint {
    id: number;
    name: string;
    slug: string;
    icon: string;
    classification: string;
    is_linkable: boolean;
    show_tree_view: boolean;
    plural_name: string;
    content_renderer: string;
}

export interface EntryShowEntry {
    id: number;
    name: string;
    slug: string;
    summary: string | null;
    content: string | null;
    sort_order: number;
    is_stub: boolean;
    parent_id: number | null;
    metadata: Record<string, unknown> | null;
    /** Stage 8b M3 - per-entry theme preset (deepest cascade scope, content only). */
    theme_preset_slug: string | null;
    /** Stage 8b M3 - sparse DeepPartial<ThemeTokens> overlay. */
    theme_override: Record<string, unknown> | null;
    has_children: boolean;
    children_count: number;
    thumbnail_url: string | null;
    created_at: string | null;
    updated_at: string | null;
    can: {
        update: boolean;
        delete: boolean;
    };
}

export interface DynamicProperty {
    label: string;
    value: unknown;
    type: string;
    url: string | null;
    entry_id?: number;
    entry_ids?: number[];
    entry_urls?: string[];
}

export interface RelationshipRow {
    entry: {
        id: number;
        name: string;
        slug: string;
        icon: string;
        blueprint_name: string;
        blueprint_slug: string;
        url: string;
    };
    blueprint_name: string;
    label: string | null;
    metadata: Array<{ label: string; value: unknown; url: string | null }>;
    subtitle_html: string | null;
}

export interface ConnectionSection {
    title: string;
    description: string | null;
    items: Array<{
        hub: {
            id: number;
            name: string;
            slug: string;
            icon: string;
            blueprint_name: string;
            blueprint_slug?: string;
            url: string;
        };
        pass_through: Array<{
            id: number;
            name: string;
            slug: string;
            icon: string;
            blueprint_name: string;
            url: string;
        }>;
    }>;
}

export interface MentionEntry {
    id: number;
    name: string;
    slug: string;
    icon: string;
    blueprint_name: string;
    url: string;
    mention_count: number;
}

export interface HistoryRecord {
    id: number;
    batch_id: string | null;
    change_type: string;
    field_name: string | null;
    previous_value: string | null;
    new_value: string | null;
    change_summary: string | null;
    created_at: string | null;
    user: { name: string; display_name: string | null } | null;
}

export interface WorkAppearance {
    work: { title: string; slug: string };
    sections: Array<{
        title: string;
        slug: string;
        sources: string[];
        mention_count: number;
    }>;
}

export interface EntryShowProps {
    project: EntryShowProject;
    blueprint: EntryShowBlueprint;
    entry: EntryShowEntry;
    contentHtml: string | null;
    summaryHtml: string | null;
    dynamicProperties: DynamicProperty[];
    relationships: RelationshipRow[];
    relationshipBlueprints: Record<string, { slug: string; name: string; fields: Array<{ name: string; label: string; type: string }> }>;
    connections: ConnectionSection[];
    mentions: MentionEntry[];
    mentionedIn: MentionEntry[];
    /** Writing-dashboard sections where this entry appears (8g.1 Plan 3) - host apps may omit. */
    appearances?: WorkAppearance[];
    /** The Work (if any) that links to this entry via works.entry_id - host apps may omit. */
    writingWork?: { title: string; slug: string } | null;
    history: HistoryRecord[];
    infoboxBlocks: InfoboxBlock[];
    timelineEvents: Array<{
        id: number;
        name: string;
        slug: string;
        url: string;
        summary: string | null;
        start_date: string | null;
        end_date: string | null;
        group_key: string | null;
        group_id: number | null;
        is_stub: boolean;
    }>;
    timelineEpoch: {
        event_type: string;
        date: string;
        label: string;
    } | null;
    [key: string]: unknown;
}

export interface EntryFieldReferenceEntry {
    id: number;
    name: string;
}

export interface EntryFieldReferenceConfig {
    target_blueprint_slug: string | null;
    target_blueprint_name: string | null;
    selection_mode: 'single' | 'multiple';
    entries: EntryFieldReferenceEntry[];
}

export interface EntryFormBlueprintField {
    id: number;
    name: string;
    label: string;
    type: string;
    description: string | null;
    is_required: boolean;
    validation_rules: Record<string, unknown>;
    sort_order: number;
    reference_config?: EntryFieldReferenceConfig;
}
