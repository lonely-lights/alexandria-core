export interface AiInstruction {
    id: number;
    label: string;
    instructions: string;
    is_default: boolean;
    sort_order: number;
}

export interface ProjectOwner {
    id: number;
    name: string;
    username: string;
    display_name: string | null;
    avatar_thumb_url: string;
    has_avatar: boolean;
}

export interface ProjectDetail {
    id: number;
    name: string;
    slug: string;
    logline: string | null;
    summary: string | null;
    summary_html: string | null;
    contents: string | null;
    contents_html: string | null;
    ai_instructions: AiInstruction[];
    owner: ProjectOwner;
    members_count: number;
    entries_count: number;
    page_image_url: string | null;
    page_image_thumb_url: string | null;
    banner_desktop_url: string | null;
    inherit_media_downward: boolean;
    created_at: string | null;
    can: {
        update: boolean;
        manage_members: boolean;
        delete: boolean;
    };
}

export interface ProjectStats {
    total_entries: number;
    total_blueprints: number;
    members_count: number;
    ai_transactions_count: number;
    archived_count: number;
}

export interface BlueprintCard {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    classification: string;
    entries_count: number;
    show_on_dashboard: boolean;
    url: string;
}

export interface RecentEntryItem {
    id: number;
    name: string;
    slug: string;
    summary: string | null;
    thumbnail_url: string | null;
    blueprint_name: string | null;
    blueprint_slug: string | null;
    blueprint_icon: string | null;
    updated_at: string | null;
    url: string | null;
}

export interface RelationshipEndpoint {
    id: number;
    name: string;
    type_name: string | null;
    type_icon: string | null;
    url: string | null;
}

export interface RecentRelationshipItem {
    id: number;
    parent: RelationshipEndpoint | null;
    child: RelationshipEndpoint | null;
    label: string | null;
    updated_at: string | null;
}

export interface DashboardBlueprintCard extends BlueprintCard {
    recent_entries: RecentEntryItem[];
    recent_relationships?: RecentRelationshipItem[];
}

export interface MemberItem {
    id: number;
    name: string;
    display_name: string | null;
    avatar_thumb_url: string;
    has_avatar: boolean;
    roles: string[];
    is_owner: boolean;
}

export interface RoleItem {
    id: number;
    name: string;
}

export interface ProjectSettings {
    members: MemberItem[];
    roles: RoleItem[];
}

export interface ProjectShowProps {
    project: ProjectDetail;
    stats: ProjectStats;
    blueprints: BlueprintCard[];
    dashboardBlueprints: DashboardBlueprintCard[];
    recentEntries: RecentEntryItem[];
    settings: ProjectSettings | null;
    [key: string]: unknown;
}

export interface EntryPreview {
    id: number;
    name: string;
    slug: string;
    summary: string | null;
    thumbnail_url: string | null;
    blueprint_name: string | null;
    blueprint_icon: string | null;
    url: string;
    attributes: Array<{ label: string; value: string }>;
}

export interface SearchResults {
    query: string;
    results: Array<{
        blueprint_name: string;
        blueprint_icon: string | null;
        entries: Array<{
            id: number;
            name: string;
            slug: string;
            summary: string | null;
            url: string;
        }>;
    }>;
    total: number;
}
