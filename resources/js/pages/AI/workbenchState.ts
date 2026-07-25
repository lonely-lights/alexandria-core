/**
 * Per-project persistence for the Sorting Workbench's "where I was" state
 * (owner: refreshes should restore position + selections). Same
 * localStorage discipline as the writing panel-mode store — merge-patch
 * blob, corrupt/absent values degrade to defaults, never throws.
 */

export interface WorkbenchStoredState {
    routingTarget?: { kind: string; id: number } | null;
    creationSlug?: string | null;
    batchSize?: number;
    includeRelationships?: boolean;
    selectedNoteIds?: number[];
}

function storageKey(projectSlug: string): string {
    return `alexandria.workbench.state:${projectSlug}`;
}

export function readWorkbenchState(projectSlug: string): WorkbenchStoredState {
    try {
        const raw = localStorage.getItem(storageKey(projectSlug));
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        return parsed && typeof parsed === "object"
            ? (parsed as WorkbenchStoredState)
            : {};
    } catch {
        return {};
    }
}

export function writeWorkbenchState(
    projectSlug: string,
    patch: WorkbenchStoredState,
): void {
    try {
        const next = { ...readWorkbenchState(projectSlug), ...patch };
        localStorage.setItem(storageKey(projectSlug), JSON.stringify(next));
    } catch {
        // Best-effort.
    }
}
