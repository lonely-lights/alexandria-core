import { useEffect, useMemo, useRef, useState } from 'react';

import { worksBase } from '@alexandria/lib/urls';

import type { CurrentSection } from '../Workspace';

/**
 * useSectionAutosave — the workspace editors' shared autosave machinery
 * (Stage 8g.1 Plan 3 Task 2), lifted verbatim from ManuscriptEditor so
 * the prose and screenplay editors share identical save semantics.
 *
 * Debounced JSON autosave (PUT .../sections/{id}/content): a 3s idle
 * debounce with a 20s max-pending backstop, server-confirmed counts
 * flowing back up through `onCounts`, and a section-switch (or
 * unmount) cleanup that flushes the OUTGOING section's pending save.
 */

/**
 * `dirty` = unsaved changes exist but no request is in flight yet —
 * callers render NOTHING in the status slot so typing doesn't flicker
 * a "Saving…" indicator on every keystroke. `saving` is set only when
 * the fetch actually starts.
 */
export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

/** Server-confirmed counts from an autosave response. */
export type SectionCountsCallback = (
    sectionId: number,
    sectionWords: number,
    workWords: number,
    pages: number | null,
) => void;

/** Idle debounce — save fires this long after the user stops typing. */
const AUTOSAVE_DELAY_MS = 3000;

/**
 * Max-pending backstop — started on the FIRST unsaved change; if the
 * user types continuously past this window (so the idle debounce never
 * fires), flush immediately. Guarantees long unbroken typing still
 * persists every ~20s.
 */
const MAX_PENDING_MS = 20000;

function getCsrfToken(): string {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? ''
    );
}

interface UseSectionAutosaveArgs {
    projectSlug: string;
    workSlug: string;
    /** Internal state resets on section.id change; the outgoing section's pending save flushes. */
    section: CurrentSection;
    onCounts: SectionCountsCallback;
}

interface UseSectionAutosaveResult {
    status: SaveStatus;
    wordCount: number;
    pageEstimate: number | null;
    /** Call with the latest serialized content on every edit. */
    noteChange: (serialized: string) => void;
    /** `section.content ?? ''` snapshot for the current section id. */
    initialContent: string;
}

export default function useSectionAutosave({
    projectSlug,
    workSlug,
    section,
    onCounts,
}: UseSectionAutosaveArgs): UseSectionAutosaveResult {
    const [status, setStatus] = useState<SaveStatus>('idle');
    const [wordCount, setWordCount] = useState(section.word_count);
    const [pageEstimate, setPageEstimate] = useState<number | null>(null);

    // Refs let the section-switch cleanup flush the OUTGOING section's
    // pending save with its latest content, even though state has
    // already moved on by the time the cleanup runs.
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingRef = useRef(false);
    const latestContentRef = useRef(section.content ?? '');
    const sectionIdRef = useRef(section.id);

    function fireSave(sectionId: number, serialized: string) {
        pendingRef.current = false;

        // A save (idle-debounce, max-pending flush, or section-switch
        // flush) resets the max-pending window — it restarts on the
        // next unsaved change.
        if (maxTimerRef.current !== null) {
            clearTimeout(maxTimerRef.current);
            maxTimerRef.current = null;
        }

        if (sectionIdRef.current === sectionId) {
            setStatus('saving');
        }

        fetch(`${worksBase(projectSlug, workSlug)}/sections/${sectionId}/content`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': getCsrfToken(),
            },
            body: JSON.stringify({ content: serialized }),
        })
            .then((response) =>
                response.ok
                    ? (response.json() as Promise<{
                          word_count: number;
                          page_estimate: number | null;
                          work_word_count: number;
                      }>)
                    : Promise.reject(new Error(`HTTP ${response.status}`)),
            )
            .then((payload) => {
                onCounts(sectionId, payload.word_count, payload.work_word_count, payload.page_estimate);

                if (sectionIdRef.current === sectionId) {
                    setWordCount(payload.word_count);
                    setPageEstimate(payload.page_estimate);
                    setStatus('saved');
                }
            })
            .catch(() => {
                // Content refs are untouched — the next keystroke
                // reschedules the save, retrying naturally.
                if (sectionIdRef.current === sectionId) {
                    setStatus('error');
                }
            });
    }

    function noteChange(serialized: string) {
        latestContentRef.current = serialized;
        pendingRef.current = true;
        setStatus('dirty');

        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            fireSave(section.id, latestContentRef.current);
        }, AUTOSAVE_DELAY_MS);

        // Max-pending backstop: starts on the first unsaved change and
        // is NOT reset by further keystrokes, so continuous typing that
        // keeps deferring the idle debounce still flushes within
        // MAX_PENDING_MS. fireSave clears it on every save path.
        if (maxTimerRef.current === null) {
            maxTimerRef.current = setTimeout(() => {
                maxTimerRef.current = null;
                if (pendingRef.current) {
                    if (timerRef.current !== null) {
                        clearTimeout(timerRef.current);
                        timerRef.current = null;
                    }
                    fireSave(section.id, latestContentRef.current);
                }
            }, MAX_PENDING_MS);
        }
    }

    // Reset on section switch; the cleanup flushes the previous
    // section's pending save (it closes over the previous render's
    // section.id + the refs holding its latest content). Also covers
    // unmount — a fire-and-forget fetch is fine there.
    useEffect(() => {
        sectionIdRef.current = section.id;
        latestContentRef.current = section.content ?? '';
        pendingRef.current = false;
        setWordCount(section.word_count);
        setPageEstimate(null);
        setStatus('idle');

        return () => {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            // fireSave clears the max-pending timer on the flush path;
            // clear it here too for the no-pending case so a stale
            // backstop never survives a section switch or unmount.
            if (maxTimerRef.current !== null) {
                clearTimeout(maxTimerRef.current);
                maxTimerRef.current = null;
            }
            if (pendingRef.current) {
                fireSave(section.id, latestContentRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section.id]);

    // Snapshot keyed on section id, NOT on content: autosave responses
    // never rewrite the prop mid-edit, but a partial reload that
    // re-hydrates currentSection with the same id must not yank the
    // editor's local state out from under the user.
    const initialContent = useMemo(
        () => section.content ?? '',
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [section.id],
    );

    return { status, wordCount, pageEstimate, noteChange, initialContent };
}
