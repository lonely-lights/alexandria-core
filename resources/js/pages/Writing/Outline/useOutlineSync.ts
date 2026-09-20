import {
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import useT from '@alexandria/hooks/useT';
import { worksBase } from '@alexandria/lib/urls';
import { WritingSaveContext } from '../Sections/WritingSaveContext';
import { outlineApiHeaders } from './outlineApi';
import { buildOutlinePayload } from './outlinePayload';
import { outlineReducer } from './outlineReducer';
import {
    OutlineSaveQueue,
    OutlineConflictError,
    OutlineValidationError,
} from './OutlineSaveQueue';
import type { OutlineSaveReply, OutlineSaveSnapshot } from './OutlineSaveQueue';
import type {
    OutlineProjection,
    OutlineRow,
    OutlineTier,
    OutlineConversion,
} from './outlineTypes';
export type { OutlineSyncStatus } from './OutlineSaveQueue';
export interface BlockedOutlineRow {
    sectionId: number;
    reason: string;
}
interface UseOutlineSyncArgs {
    refreshKey?: string;
    projectSlug: string;
    workSlug: string;
}

export default function useOutlineSync({
    projectSlug,
    workSlug,
    refreshKey,
}: UseOutlineSyncArgs) {
    const t = useT();
    const coordinator = useContext(WritingSaveContext);
    const url = worksBase(projectSlug, workSlug) + '/outline';
    const untitled = t('writing.outline.title_placeholder');
    const [hierarchy, setHierarchy] = useState<OutlineTier[]>([]);
    const [loadedQueue, setLoadedQueue] = useState<OutlineSaveQueue | null>(
        null,
    );
    const [loadFailed, setLoadFailed] = useState(false);
    const originals = useRef(new Map<number, OutlineRow>());
    const queue = useMemo(() => {
        const load = async (): Promise<OutlineProjection> => {
            const response = await fetch(url, {
                credentials: 'same-origin',
                headers: outlineApiHeaders(),
            });

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            return response.json();
        };

        return new OutlineSaveQueue(
            {
                rows: [],
                deleted: [],
                force: [],
                conversions: [],
                baseVersion: '',
            },
            async (draft, keepalive) => {
                const response = await fetch(url, {
                    method: 'PUT',
                    credentials: 'same-origin',
                    headers: outlineApiHeaders(true),
                    body: JSON.stringify(
                        buildOutlinePayload(
                            draft.rows,
                            draft.deleted,
                            draft.force,
                            draft.baseVersion,
                            untitled,
                            draft.conversions,
                        ),
                    ),
                    keepalive,
                });

                if (response.status === 409) {
                    throw new OutlineConflictError(await response.json());
                }

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));

                    if (response.status >= 500) {
                        throw new Error(
                            data.message ?? 'HTTP ' + response.status,
                        );
                    }

                    throw new OutlineValidationError(
                        Object.values(data.errors ?? {})
                            .flat()
                            .join(' ') ||
                            data.message ||
                            'HTTP ' + response.status,
                    );
                }

                return response.json() as Promise<OutlineSaveReply>;
            },
            untitled,
            load,
        );
    }, [url, untitled]);
    const ready = loadedQueue === queue;
    const state = useSyncExternalStore(
        queue.subscribe,
        queue.getSnapshot,
        queue.getSnapshot,
    );
    const load = async (discard = false) => {
        if (queue.hasUnsaved && !discard) {
            return;
        }

        try {
            const response = await fetch(url, {
                credentials: 'same-origin',
                headers: outlineApiHeaders(),
            });

            if (!response.ok) {
                throw new Error('Load failed');
            }

            const projection: OutlineProjection = await response.json();
            queue.reset(projection);
            setHierarchy(projection.hierarchy ?? []);
            setLoadedQueue(queue);
            setLoadFailed(false);
        } catch {
            setLoadFailed(true);
        }
    };
    useEffect(() => {
        let active = true;
        const mayReload = !queue.hasUnsaved;

        if (mayReload) {
            fetch(url, {
                credentials: 'same-origin',
                headers: outlineApiHeaders(),
            })
                .then(async (response) => {
                    if (!response.ok) {
                        throw new Error('Load failed');
                    }

                    const projection: OutlineProjection = await response.json();

                    if (active && !queue.hasUnsaved) {
                        queue.reset(projection);
                        setHierarchy(projection.hierarchy ?? []);
                        setLoadedQueue(queue);
                        setLoadFailed(false);
                    }
                })
                .catch(() => {
                    if (active) {
                        setLoadFailed(true);
                    }
                });
        }

        const unregister = coordinator?.register(queue);
        const unload = (event: BeforeUnloadEvent) => {
            if (!queue.hasUnsaved) {
                return;
            }

            void queue.flush();
            event.preventDefault();
            event.returnValue = '';
        };
        const hide = () => {
            void queue.flush(true);
        };

        // The shared provider owns these when mounted; standalone consumers retain protection.
        if (!coordinator) {
            window.addEventListener('beforeunload', unload);
            window.addEventListener('pagehide', hide);
        }

        return () => {
            active = false;
            unregister?.();
            queue.stopTimer();
            window.removeEventListener('beforeunload', unload);
            window.removeEventListener('pagehide', hide);
        };
    }, [queue, url, coordinator, refreshKey]);
    function setRows(
        updater: OutlineRow[] | ((rows: OutlineRow[]) => OutlineRow[]),
    ) {
        if (!ready) {
            return;
        }

        const draft = queue.getSnapshot().draft;
        queue.update({
            ...draft,
            rows: typeof updater === 'function' ? updater(draft.rows) : updater,
        });
    }
    function deleteRow(key: string, force = false) {
        const draft = queue.getSnapshot().draft;
        const result = outlineReducer(
            draft.rows,
            { type: 'delete', key },
            { hierarchy },
        );
        const removed = draft.rows
            .filter(
                (r) =>
                    r.sectionId !== null &&
                    !result.rows.some((next) => next.key === r.key),
            )
            .map((r) => r.sectionId!);
        queue.update({
            ...draft,
            rows: result.rows,
            deleted: [...new Set([...draft.deleted, ...removed])],
            force: force
                ? [...new Set([...draft.force, ...removed])]
                : draft.force,
        });
    }
    function convertRow(conversion: OutlineConversion, rows: OutlineRow[]) {
        const draft = queue.getSnapshot().draft;
        const source = draft.rows.find(
            (r) => r.sectionId === conversion.sourceSectionId,
        );

        if (!source) {
            return;
        }

        originals.current.set(source.sectionId!, source);
        queue.update({
            ...draft,
            rows,
            conversions: [...draft.conversions, conversion],
            deleted: [...draft.deleted, source.sectionId!],
        });
    }
    function undoConversion() {
        const draft = queue.getSnapshot().draft;
        const conversion = draft.conversions.at(-1);

        if (!conversion) {
            return;
        }

        const source = originals.current.get(conversion.sourceSectionId);

        if (!source) {
            return;
        }

        const rows = draft.rows.map((r) =>
            r.key === conversion.targetKey
                ? {
                      ...r,
                      beats: r.beats.filter((b) => b.id !== conversion.beatId),
                  }
                : r,
        );
        let index = rows.findIndex((r) => r.key === conversion.targetKey) + 1;

        while (index < rows.length && rows[index].depth > source.depth) {
            index++;
        }

        rows.splice(index, 0, source);
        queue.update({
            ...draft,
            rows,
            conversions: draft.conversions.slice(0, -1),
            deleted: draft.deleted.filter((id) => id !== source.sectionId),
        });
    }
    function resolveConflict(draft: OutlineSaveSnapshot) {
        const projection = queue.getSnapshot().conflict;

        if (projection) {
            queue.resolve(projection, draft);
            setHierarchy(projection.hierarchy ?? hierarchy);
        }
    }
    function discardConflict() {
        const projection = queue.getSnapshot().conflict;

        if (projection) {
            queue.reset(projection);
            setHierarchy(projection.hierarchy ?? hierarchy);
        }
    }

    return {
        rows: state.draft.rows,
        hierarchy,
        ready,
        setRows,
        deleteRow,
        forceDelete: (key: string) => deleteRow(key, true),
        convertRow,
        undoConversion,
        hasConversions: state.draft.conversions.length > 0,
        flush: queue.flush,
        status: loadFailed ? ('error' as const) : state.status,
        blocked: state.blocked,
        keepBlocked: (id: number) => queue.keepBlocked(id),
        reload: () => {
            void load();
        },
        conflict: state.conflict,
        base: state.base,
        draft: state.draft,
        ambiguous: state.ambiguous,
        error: state.error,
        resolveConflict,
        discardConflict,
    };
}
