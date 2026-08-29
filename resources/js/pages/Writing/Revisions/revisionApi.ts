/**
 * Fetch helpers for the scoped-revisions HTTP surface — Stage 9 (design
 * doc 2026-08-29-revisions-design.md, Task 4). Mirrors outlineApi.ts's
 * idiom: `outlineApiHeaders` supplies the csrf/json headers (imported,
 * not copied — the owner code review that extracted outlineApi.ts
 * exists precisely to stop this header/csrf logic from re-forking), and
 * every call resolves to `null` on any failure so callers keep a single,
 * silent-retry-friendly branch instead of a thrown-error path.
 */

import { worksBase } from '@alexandria/lib/urls';

import type { OutlineBeat } from '../Outline/outlineTypes';
import { outlineApiHeaders } from '../Outline/outlineApi';

/** `POST /{work}/revisions` response shape (see WorkRevisionController::store). */
export interface RevisionSummary {
    id: number;
    number: number;
    label: string | null;
    cause: 'manual' | 'pre_restore';
    scope_section_id: number | null;
    created_at: string;
}

/** One row of `own`/`inherited` in the history response — a numbered revision. */
export interface HistoryRevisionRow {
    id: number;
    number: number;
    label: string | null;
    cause: 'manual' | 'pre_restore';
    /** The scope container's title, or `null` for the whole-work scope. */
    scopeTitle: string | null;
    created_at: string;
    version_id: number;
}

/** One row of `buffer` in the history response — an unnumbered safety-buffer save. */
export interface HistoryBufferRow {
    version_id: number;
    word_count: number;
    created_at: string;
}

/** `GET /{work}/sections/{section}/history` response shape. All three arrays newest-first. */
export interface SectionHistory {
    own: HistoryRevisionRow[];
    inherited: HistoryRevisionRow[];
    buffer: HistoryBufferRow[];
}

/** The full creative-state payload a version row captures — see RevisionService::PAYLOAD_FIELDS. */
export interface VersionPayload {
    title: string;
    label: string | null;
    content: string | null;
    synopsis: string | null;
    beats: OutlineBeat[] | null;
    beat_type: string | null;
    goal: string | null;
    conflict: string | null;
    stakes: string | null;
    mood: string | null;
    tone: string | null;
}

/** `GET /{work}/versions/{version}` response shape. */
export interface VersionDetail {
    payload: VersionPayload;
    word_count: number;
    created_at: string;
    section_id: number;
}

/** The pre-restore revision `POST /{work}/versions/{version}/restore` reports back. */
export interface PreRestoreRevision {
    id: number;
    number: number;
    label: string | null;
    cause: 'manual' | 'pre_restore';
}

export interface RestoreResult {
    restored: true;
    preRestoreRevision: PreRestoreRevision;
}

/**
 * Mark a new revision. `scopeSectionId: null` = whole-work scope.
 * Resolves to the created revision, or `null` on any failure.
 */
export async function markRevision(
    projectSlug: string,
    workSlug: string,
    params: { scopeSectionId: number | null; label?: string },
): Promise<RevisionSummary | null> {
    try {
        const response = await fetch(`${worksBase(projectSlug, workSlug)}/revisions`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: outlineApiHeaders(true),
            body: JSON.stringify({
                scope_section_id: params.scopeSectionId,
                ...(params.label ? { label: params.label } : {}),
            }),
        });

        if (!response.ok) {
            return null;
        }

        const body = (await response.json()) as { revision: RevisionSummary };

        return body.revision;
    } catch {
        return null;
    }
}

/**
 * Fetch the grouped history for one section. Resolves to `null` on
 * any failure — callers show a load-error state rather than throwing.
 */
export async function fetchSectionHistory(
    projectSlug: string,
    workSlug: string,
    sectionId: number,
): Promise<SectionHistory | null> {
    try {
        const response = await fetch(
            `${worksBase(projectSlug, workSlug)}/sections/${sectionId}/history`,
            { credentials: 'same-origin', headers: outlineApiHeaders() },
        );

        if (!response.ok) {
            return null;
        }

        return (await response.json()) as SectionHistory;
    } catch {
        return null;
    }
}

/** Fetch one version's full payload for the read-only view modal. */
export async function fetchVersion(
    projectSlug: string,
    workSlug: string,
    versionId: number,
): Promise<VersionDetail | null> {
    try {
        const response = await fetch(`${worksBase(projectSlug, workSlug)}/versions/${versionId}`, {
            credentials: 'same-origin',
            headers: outlineApiHeaders(),
        });

        if (!response.ok) {
            return null;
        }

        return (await response.json()) as VersionDetail;
    } catch {
        return null;
    }
}

/**
 * Restore a version onto its section. The server auto-captures the
 * CURRENT state first as a `pre_restore` revision — the returned
 * `preRestoreRevision` is that guard, not the version being restored.
 */
export async function restoreVersion(
    projectSlug: string,
    workSlug: string,
    versionId: number,
): Promise<RestoreResult | null> {
    try {
        const response = await fetch(
            `${worksBase(projectSlug, workSlug)}/versions/${versionId}/restore`,
            {
                method: 'POST',
                credentials: 'same-origin',
                headers: outlineApiHeaders(true),
            },
        );

        if (!response.ok) {
            return null;
        }

        return (await response.json()) as RestoreResult;
    } catch {
        return null;
    }
}
