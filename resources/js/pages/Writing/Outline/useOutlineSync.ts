/**
 * useOutlineSync — outline-view load/save machinery, spec 2026-08-28
 * outline-mode Task 5.
 *
 * Loads the outline projection on mount (`GET /{work}/outline`),
 * debounces `setRows` edits into a full-row-set `PUT` (modeled on
 * `useSectionAutosave.ts`'s idle-debounce/flush-on-unmount lifecycle —
 * plain hoisted `function` declarations closing over refs, not
 * `useCallback`, so the save/timer functions can freely call each
 * other without a memoization dependency dance), and folds the
 * server's response back into the client tree.
 *
 * Row deletion is a two-step confirm dance driven by the server: a
 * blocked delete (a section with content/notes/comments, requested
 * without `force`) comes back in the PUT response's `blocked` list.
 * Rather than guess at the row's correct tree position to restore it,
 * a blocked save simply reloads the projection — the row reappears
 * exactly where the server has it, and `blocked` stays populated so
 * `OutlineView` can render its inline confirm. `forceDelete` re-requests
 * the same row with its id added to `force`, which the server always
 * honors.
 *
 * `deleteRow`/`forceDelete` reuse `outlineReducer`'s pure `delete`
 * action for the actual tree surgery, then diff old vs. new rows to
 * learn which persisted section ids left the tree — no separate
 * subtree-walk needs duplicating here.
 */

import { useEffect, useRef, useState } from 'react';

import { worksBase } from '@alexandria/lib/urls';

import { outlineApiHeaders as apiHeaders } from './outlineApi';
import { outlineReducer } from './outlineReducer';
import { buildOutlinePayload, reconcileTempIds, rowsFromProjection } from './outlinePayload';
import type { OutlineProjection, OutlineRow } from './outlineTypes';

export type OutlineSyncStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

export interface BlockedOutlineRow {
    sectionId: number;
    reason: string;
}

interface OutlineUpdateResponse extends OutlineProjection {
    tempIds: Record<string, number>;
    blocked: BlockedOutlineRow[];
}

interface OutlineConflictResponse extends OutlineProjection {
    conflict: true;
}

interface UseOutlineSyncArgs {
    projectSlug: string;
    workSlug: string;
}

export interface UseOutlineSyncResult {
    rows: OutlineRow[];
    setRows: (updater: OutlineRow[] | ((rows: OutlineRow[]) => OutlineRow[])) => void;
    deleteRow: (key: string) => void;
    forceDelete: (key: string) => void;
    /** Fire any pending debounced save immediately — wired to Enter and
     *  input blur so quick captures survive an instant refresh. */
    flush: () => void;
    status: OutlineSyncStatus;
    blocked: BlockedOutlineRow[];
    reload: () => void;
}

/** Idle debounce before an edit is flushed to the server. */
const SAVE_DELAY_MS = 800;

export default function useOutlineSync({
    projectSlug,
    workSlug,
}: UseOutlineSyncArgs): UseOutlineSyncResult {
    const [rows, setRowsState] = useState<OutlineRow[]>([]);
    const [status, setStatus] = useState<OutlineSyncStatus>('idle');
    const [blocked, setBlocked] = useState<BlockedOutlineRow[]>([]);

    const url = `${worksBase(projectSlug, workSlug)}/outline`;

    // Refs mirror the corresponding state so the debounce timer and the
    // fetch callbacks always see the latest values without becoming
    // stale closures across renders.
    const rowsRef = useRef<OutlineRow[]>(rows);
    const baseVersionRef = useRef<string>('');
    const deletedRef = useRef<Set<number>>(new Set());
    const forceRef = useRef<Set<number>>(new Set());
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingRef = useRef(false);
    // Raised the instant an edit exists that the server hasn't
    // confirmed — pending debounce OR an in-flight PUT. This is the
    // "unsaved work" flag the beforeunload guard reads.
    const savingRef = useRef(false);

    function fetchProjection(): Promise<OutlineProjection> {
        return fetch(url, { credentials: 'same-origin', headers: apiHeaders() }).then((response) =>
            response.ok
                ? (response.json() as Promise<OutlineProjection>)
                : Promise.reject(new Error(`HTTP ${response.status}`)),
        );
    }

    function applyProjection(projection: OutlineProjection) {
        baseVersionRef.current = projection.baseVersion;
        const next = rowsFromProjection(projection);
        rowsRef.current = next;
        setRowsState(next);
    }

    /** Public `reload` / mount load — a clean slate: drops any pending
     *  delete/force intent and clears `blocked` along with it. */
    function load() {
        fetchProjection()
            .then((projection) => {
                deletedRef.current = new Set();
                forceRef.current = new Set();
                applyProjection(projection);
                setBlocked([]);
                setStatus('idle');
            })
            .catch(() => setStatus('error'));
    }

    /** (Re)start the idle-debounce timer, WITHOUT touching `status` — the
     *  conflict path needs the timer armed while leaving the 'conflict'
     *  status visible until the re-save it schedules actually starts. */
    function armTimer() {
        pendingRef.current = true;

        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            fireSave();
        }, SAVE_DELAY_MS);
    }

    function flush() {
        if (!pendingRef.current) {
            return;
        }

        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        fireSave();
    }

    function fireSave(keepalive = false) {
        pendingRef.current = false;
        savingRef.current = true;
        setStatus('saving');

        const payload = buildOutlinePayload(
            rowsRef.current,
            Array.from(deletedRef.current),
            Array.from(forceRef.current),
            baseVersionRef.current,
        );

        fetch(url, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: apiHeaders(true),
            body: JSON.stringify(payload),
            // The page-teardown path (refresh/close mid-debounce) needs
            // the request to outlive the document.
            keepalive,
        })
            .then(async (response) => {
                if (response.status === 409) {
                    const conflictBody = (await response.json()) as OutlineConflictResponse;
                    const serverRows = rowsFromProjection(conflictBody);
                    const localByKey = new Map(rowsRef.current.map((row) => [row.key, row]));

                    // Adopt the server's structure but keep local title/
                    // synopsis edits for any row that survived on both sides.
                    const merged = serverRows.map((row) => {
                        const local = localByKey.get(row.key);

                        return local === undefined
                            ? row
                            : { ...row, title: local.title, synopsis: local.synopsis };
                    });

                    baseVersionRef.current = conflictBody.baseVersion;
                    rowsRef.current = merged;
                    setRowsState(merged);
                    setStatus('conflict');
                    // Re-arm the debounce so the merged tree still gets
                    // saved, without immediately clobbering the
                    // 'conflict' status this render just set.
                    armTimer();
                    return;
                }

                if (!response.ok) {
                    setStatus('error');
                    return;
                }

                const body = (await response.json()) as OutlineUpdateResponse;
                const reconciled = reconcileTempIds(rowsRef.current, body.tempIds ?? {});

                baseVersionRef.current = body.baseVersion;
                rowsRef.current = reconciled;
                setRowsState(reconciled);

                const blockedRows = body.blocked ?? [];
                const blockedIds = new Set(blockedRows.map((row) => row.sectionId));

                // Anything requested for deletion that ISN'T blocked was
                // actually removed server-side — forget it so a later
                // edit doesn't keep re-sending a stale deletion.
                for (const id of Array.from(deletedRef.current)) {
                    if (!blockedIds.has(id)) {
                        deletedRef.current.delete(id);
                        forceRef.current.delete(id);
                    }
                }

                setBlocked(blockedRows);

                if (blockedIds.size > 0) {
                    // The blocked rows still exist server-side but this
                    // response's own `rows` don't carry their tree
                    // position info beyond what reconcile already used —
                    // fetch the authoritative projection so they reappear
                    // exactly where the server has them. Deliberately NOT
                    // `load()`: that resets `deletedRef`/`blocked` for a
                    // clean slate, which would immediately erase the
                    // `blocked` state this branch just set.
                    fetchProjection()
                        .then((projection) => {
                            applyProjection(projection);
                            setStatus('saved');
                        })
                        .catch(() => setStatus('error'));
                    return;
                }

                setStatus('saved');
            })
            .catch(() => {
                // The edit never reached the server — it is still
                // unsaved work: re-raise the flag so the unload guard
                // and the next flush both cover it.
                pendingRef.current = true;
                setStatus('error');
            })
            .finally(() => {
                savingRef.current = false;
            });
    }

    function scheduleSave() {
        setStatus('dirty');
        armTimer();
    }

    function setRows(updater: OutlineRow[] | ((rows: OutlineRow[]) => OutlineRow[])) {
        setRowsState((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            rowsRef.current = next;
            return next;
        });
        scheduleSave();
    }

    /** Shared by `deleteRow`/`forceDelete`: run the reducer's pure
     *  `delete` action, diff which persisted section ids fell out of
     *  the tree, and queue those for the next save's `deleted` list. */
    function removeRowAndTrackDeletion(key: string) {
        const before = rowsRef.current;
        const { rows: after } = outlineReducer(before, { type: 'delete', key });

        if (after === before) {
            return;
        }

        const beforeIds = new Set(
            before.map((row) => row.sectionId).filter((id): id is number => id !== null),
        );
        const afterIds = new Set(
            after.map((row) => row.sectionId).filter((id): id is number => id !== null),
        );

        for (const id of beforeIds) {
            if (!afterIds.has(id)) {
                deletedRef.current.add(id);
            }
        }

        rowsRef.current = after;
        setRowsState(after);
        scheduleSave();
    }

    function deleteRow(key: string) {
        removeRowAndTrackDeletion(key);
    }

    function forceDelete(key: string) {
        const row = rowsRef.current.find((r) => r.key === key);

        if (row === undefined || row.sectionId === null) {
            return;
        }

        forceRef.current.add(row.sectionId);
        removeRowAndTrackDeletion(key);
    }

    // Load on mount (and whenever the target work changes); flush any
    // pending save on unmount so a save mid-debounce isn't lost when the
    // view is switched away from.
    useEffect(() => {
        load();

        // Refresh/close mid-debounce must not eat quick captures: fire
        // the pending save with keepalive so it outlives the document.
        const onPageHide = () => {
            if (pendingRef.current) {
                if (timerRef.current !== null) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }

                fireSave(true);
            }
        };
        window.addEventListener('pagehide', onPageHide);

        // Unsaved-work guard (owner, 2026-08-28): typing raises the
        // flag; a refresh/close attempt while it's up pauses on the
        // browser's leave-site dialog (custom copy isn't allowed by
        // modern browsers — the pause is the point) while the flush
        // races the save behind it. Staying on the page lets the
        // status chip flip to "Saved" as the all-clear. SPA (Inertia)
        // navigation never triggers this — only hard unloads.
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            if (pendingRef.current || savingRef.current) {
                flush();
                event.preventDefault();
                event.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', onBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            window.removeEventListener('pagehide', onPageHide);

            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }

            if (pendingRef.current) {
                fireSave();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    return { rows, setRows, deleteRow, forceDelete, flush, status, blocked, reload: load };
}
