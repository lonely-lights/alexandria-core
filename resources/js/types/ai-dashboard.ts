import type { Project } from './models';

// NOTE: legacy paired this with a heavier `ProjectDetail` shape that
// lives in the worldbuilding app (`types/projects.ts`). Core stays
// framework-generic — consumers that need richer project context
// can intersect this prop with their own ProjectDetail type at the
// page level.
export interface AiDashboardProps {
    project: Project;
    stats: AiDashboardStats;
    providers: AiProvider[];
    settings: AiProjectSettings | null;
    userSettings: AiUserSettings | null;
    [key: string]: unknown;
}


export interface AiDashboardStats {
    total_transactions: number;
    total_cost: number;
    total_tokens: number;
    this_month_cost: number;
    this_month_transactions: number;
    this_month_tokens: number;
    queue_pending: number;
    queue_total: number;
    pending_review_commands: number;
    recent_batch_count: number;
}

export interface AiProvider {
    id: number;
    name: string;
    slug: string;
    website: string | null;
    is_active: boolean;
    models_count?: number;
}

export interface AiProjectSettings {
    ai_enabled: boolean;
    auto_categorize: boolean;
    require_approval: boolean;
    default_routing_action: string;
    ai_provider_id: number | null;
    analyst_model_name: string | null;
    creative_model_name: string | null;
    monthly_budget: number | null;
    per_request_limit: number | null;
    enabled_features: string[] | null;
}

export interface AiUserSettings {
    provider_name: string;
    analyst_model: string;
    creative_model: string;
    has_valid_key: boolean;
}

export interface QueuedNote {
    note_id: number;
    note_title: string;
    note_text: string;
    note_created_at: string;
    creator_name: string | null;
    pending_count: number;
    completed_count: number;
    failed_count: number;
    routings: NoteRouting[];
}

export interface NoteRouting {
    blueprint_id: number;
    blueprint_name: string;
    blueprint_slug: string;
    blueprint_icon: string | null;
    processing_status: 'pending' | 'processing' | 'completed' | 'failed';
    processed_at: string | null;
}

export interface BatchSummary {
    batch_id: string;
    blueprint_slug: string | null;
    created_at: string;
    total_commands: number;
    pending_count: number;
    approved_count: number;
    executed_count: number;
    rejected_count: number;
    failed_count: number;
    model_name: string | null;
    total_tokens: number | null;
    cost: number | null;
}

export interface UsageStats {
    total_transactions: number;
    total_input: number;
    total_output: number;
    total_thinking: number;
    total_cache_read: number;
    total_cache_write: number;
    total_tokens: number;
    total_cost: number;
    contexts: string[];
}

export interface UsageTransaction {
    id: number;
    batch_id: string | null;
    provider_name: string;
    model_name: string;
    context: string | null;
    input_tokens: number;
    output_tokens: number;
    thinking_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    total_tokens: number;
    cost: number;
    latency_ms: number | null;
    created_at: string;
}

export interface AiModelEntry {
    id: number;
    ai_provider_id: number;
    model_id: string;
    display_name: string;
    category: string;
    context_window: number | null;
    input_price_per_million: number | null;
    output_price_per_million: number | null;
    supports_json_mode: boolean;
    supports_vision: boolean;
    is_flagship: boolean;
    is_recommended: boolean;
    is_active: boolean;
    released_at: string | null;
    notes: string | null;
    provider: AiProvider;
}

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}
