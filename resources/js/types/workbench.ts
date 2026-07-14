import type { Project } from './models';

export interface WorkbenchBlueprint {
    id: number;
    slug: string;
    name: string;
    allow_ai_sorting: boolean;
    description: string | null;
    routed_count: number;
}

export interface WorkbenchNotebook {
    id: number;
    slug: string;
    title: string;
    allow_ai_sort: boolean;
    is_catch_all: boolean;
    description: string | null;
    note_count: number;
}

export interface WorkbenchProps {
    project: Pick<Project, 'id' | 'name' | 'slug'> & { can: { update: boolean } };
    blueprints: WorkbenchBlueprint[];
    notebooks: WorkbenchNotebook[];
    unsorted_count: number;
    pending_count: number;
    [key: string]: unknown;
}

export interface RoutedNote {
    id: number;
    title: string;
    text: string;
    review_flag: string | null;
    created_at: string;
}

export interface RoutedNotesPage {
    data: RoutedNote[];
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
}

export interface L2PendingNote {
    id: number;
    title: string;
    snippet: string;
    /** Full note text — the pick pane renders complete notes (owner). */
    text: string;
}

export interface L2BlueprintSummary {
    id: number;
    slug: string;
    name: string;
    pending_count: number;
}

export interface L2RelationshipEdge {
    blueprint_slug: string;
    relationship_name: string;
    ai_priority: string;
    ai_instruction: string | null;
    index_size: number;
}

export interface L2SourceMap {
    blueprint_name: string;
    blueprint_slug: string;
    blueprint_description: string | null;
    field_schema: string;
    target_index_size: number;
    target_pruned: boolean;
    relationship_edges: L2RelationshipEdge[];
    notes_in_batch: number;
}

export interface L2PreviewResult {
    prompt: string;
    token_estimate: number;
    source_map: L2SourceMap;
    skipped_ids?: number[];
}

export interface L2RunBatchResponse {
    queued: boolean;
    batch_id: string | null;
    notes_queued: number;
    skipped_ids: number[];
}

/** One row of the l2-batches listing (existing batches, newest first). */
export interface L2BatchListItem {
    batch_id: string;
    blueprint_slug: string | null;
    started_at: string | null;
    command_count: number;
    pending_count: number;
}

/** Broadcast payload of the app's WorkbenchLevel2BatchCompleted event. */
export interface L2BatchCompletedEvent {
    batch_id: string;
    blueprint_slug: string;
    blueprint_name: string;
    notes_processed: number;
    commands_created: number;
    commands_invalid: number;
    error: string | null;
}

export interface AiCommand {
    id: number;
    batch_id: string;
    action_type: 'create_entry' | 'copy_note' | 'transfer_note' | 'create_relationship';
    payload: Record<string, unknown>;
    reasoning: string | null;
    is_active: boolean;
    status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
    failure_reason: string | null;
    validation_errors: Record<string, string> | null;
    context: { note_id?: number; blueprint_slug?: string; [key: string]: unknown };
    order_index: number;
}

export interface NoteGroup {
    noteId: number;
    noteTitle: string;
    noteText: string;
    commands: AiCommand[];
    activeCommands: AiCommand[];
    malformedCommands: AiCommand[];
}
