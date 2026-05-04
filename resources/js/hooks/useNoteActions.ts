import { useCallback, useMemo } from 'react';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';

/**
 * Single source of truth for per-note server calls invoked from the
 * Notes Dashboard, Notes Drawer, and NoteModal. Each method hits the
 * appropriate endpoint and resolves to `true` on success / the JSON
 * payload when the server returns a representation — letting callers
 * apply optimistic updates or ignore the return as fits.
 *
 * These were previously inlined in NotesView.tsx (~90 lines) and
 * NotesDrawer.tsx + NoteModal.tsx (smaller but duplicated). Keeping
 * them here makes endpoint changes a single-file edit.
 */
export function useNoteActions(projectId: number) {
    const jsonHeaders = useMemo(
        () => ({ Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }),
        [],
    );

    const togglePin = useCallback(async (noteId: number): Promise<boolean> => {
        const res = await fetch(`/api/v1/projects/${projectId}/notes/${noteId}/pin`, {
            method: 'PUT',
            headers: jsonHeaders,
            credentials: 'same-origin',
        });
        return res.ok;
    }, [projectId, jsonHeaders]);

    const generateTitle = useCallback(async (noteId: number): Promise<string | null> => {
        const res = await fetch(`/api/v1/projects/${projectId}/notes/${noteId}/generate-title`, {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
        });
        if (!res.ok) return null;
        const body = await res.json().catch(() => null);
        return (body?.title ?? null) as string | null;
    }, [projectId]);

    const categorize = useCallback(async (
        noteId: number,
        opts?: { contextType?: 'project' | 'blueprint'; contextId?: number; autoProcess?: boolean },
    ): Promise<boolean> => {
        const contextType = opts?.contextType ?? 'project';
        const contextId = opts?.contextId ?? projectId;
        const res = await fetch(`/api/v1/projects/${projectId}/notes/${noteId}/categorize`, {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({
                context_type: contextType,
                context_id: contextId,
                auto_process: opts?.autoProcess ?? false,
            }),
        });
        return res.ok;
    }, [projectId]);

    const approveRouting = useCallback(async (noteId: number, blueprintSlugs: string[] = []): Promise<boolean> => {
        const res = await fetch(`/api/v1/projects/${projectId}/notes/${noteId}/approve-routing`, {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({ blueprint_slugs: blueprintSlugs }),
        });
        return res.ok;
    }, [projectId]);

    const rejectRouting = useCallback(async (noteId: number): Promise<boolean> => {
        const res = await fetch(`/api/v1/projects/${projectId}/notes/${noteId}/reject-routing`, {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
        });
        return res.ok;
    }, [projectId]);

    /**
     * Shape of a single history row. Kept deliberately minimal — the
     * drawer + modal both render slightly different views, so callers
     * post-process as needed.
     */
    type HistoryRecord = {
        id: number;
        previous_title: string | null;
        previous_text: string | null;
        previous_note_date: string | null;
        created_at: string | null;
        user: { name: string; display_name: string | null } | null;
    };

    const fetchHistory = useCallback(async (noteId: number): Promise<HistoryRecord[]> => {
        const res = await fetch(`/api/v1/projects/${projectId}/notes/${noteId}/history`, {
            headers: jsonHeaders,
            credentials: 'same-origin',
        });
        if (!res.ok) return [];
        const body = await res.json().catch(() => null);
        return Array.isArray(body) ? body as HistoryRecord[] : [];
    }, [projectId, jsonHeaders]);

    /** Add a tag to a note. The server creates the tag if it doesn't exist yet. */
    const addTag = useCallback(async (noteId: number, tag: string): Promise<boolean> => {
        const res = await fetch(`/api/v1/projects/${projectId}/notes/${noteId}/tags`, {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({ tag }),
        });
        return res.ok;
    }, [projectId]);

    /** Remove a tag from a note. Tag stays alive in the project. */
    const removeTag = useCallback(async (noteId: number, tag: string): Promise<boolean> => {
        const res = await fetch(`/api/v1/projects/${projectId}/notes/${noteId}/tags/${encodeURIComponent(tag)}`, {
            method: 'DELETE',
            headers: csrfHeaders(),
            credentials: 'same-origin',
        });
        return res.ok;
    }, [projectId]);

    return {
        togglePin,
        generateTitle,
        categorize,
        approveRouting,
        rejectRouting,
        fetchHistory,
        addTag,
        removeTag,
    };
}
