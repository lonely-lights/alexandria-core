export interface User {
    id: number;
    name: string;
    display_name: string | null;
    email: string;
    avatar_url: string;
    avatar_thumb_url: string;
    has_avatar: boolean;
    avatar_ring_slug: string;
    avatar_ring_settings: Record<string, unknown> | null;
}

export interface Project {
    id: number;
    owner_id: number;
    creator_id: number;
    name: string;
    slug: string;
    use_subdomain: boolean;
    logline: string | null;
    summary: string | null;
    contents: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface ProjectSummary {
    id: number;
    name: string;
    slug: string;
}

export interface Blueprint {
    id: number;
    project_id: number;
    name: string;
    slug: string;
    classification: string;
    list_selection_mode: string;
    description: string | null;
    icon: string | null;
    show_on_dashboard: boolean;
    is_linkable: boolean;
    is_hub: boolean;
    content_renderer: string;
    ai_prompt_instructions: string | null;
    metadata: Record<string, unknown> | null;
    infobox_schema: Record<string, unknown>[] | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface Entry {
    id: number;
    project_id: number;
    blueprint_id: number;
    name: string;
    slug: string;
    summary: string | null;
    content: string | null;
    ai_notes: string | null;
    parent_id: number | null;
    sort_order: number;
    is_stub: boolean;
    metadata: Record<string, unknown> | null;
    all_attributes: Record<string, string>;
    type?: Blueprint;
    created_at: string | null;
    updated_at: string | null;
}

export interface Note {
    id: number;
    title: string;
    text: string;
    user_id: number | null;
    note_date: string | null;
    is_pinned: boolean;
    ai_notes: Record<string, unknown>[] | null;
    created_at: string | null;
    updated_at: string | null;
}
