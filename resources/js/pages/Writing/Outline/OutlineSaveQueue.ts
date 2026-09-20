import {
    buildOutlinePayload,
    reconcileTempIds,
    rowsFromProjection,
} from './outlinePayload';
import type {
    OutlineConversion,
    OutlineProjection,
    OutlineRow,
} from './outlineTypes';

export interface OutlineSaveSnapshot {
    rows: OutlineRow[];
    deleted: number[];
    force: number[];
    conversions: OutlineConversion[];
    baseVersion: string;
}
export interface OutlineSaveReply extends OutlineProjection {
    tempIds: Record<string, number>;
    blocked: { sectionId: number; reason: string }[];
}
export type OutlineSyncStatus =
    | 'idle'
    | 'dirty'
    | 'saving'
    | 'saved'
    | 'error'
    | 'conflict';
export interface OutlineQueueState {
    draft: OutlineSaveSnapshot;
    base: OutlineSaveSnapshot;
    status: OutlineSyncStatus;
    blocked: OutlineSaveReply['blocked'];
    conflict: OutlineProjection | null;
    ambiguous: boolean;
    error: string | null;
}
export class OutlineConflictError extends Error {
    constructor(readonly projection: OutlineProjection) {
        super('Outline changed elsewhere');
    }
}
export class OutlineValidationError extends Error {}
export type SendOutline = (
    draft: OutlineSaveSnapshot,
    keepalive: boolean,
) => Promise<OutlineSaveReply>;

/** One queue per mounted work. Local keys and newer edits survive acknowledgements. */
export class OutlineSaveQueue {
    private state: OutlineQueueState;
    private inFlight: Promise<boolean> | null = null;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private listeners = new Set<() => void>();
    private uncertain = false;
    private generation = 0;

    constructor(
        initial: OutlineSaveSnapshot,
        private send: SendOutline,
        private untitled: string,
        private load?: () => Promise<OutlineProjection>,
    ) {
        this.state = {
            draft: initial,
            base: initial,
            status: 'idle',
            blocked: [],
            conflict: null,
            ambiguous: false,
            error: null,
        };
    }
    getSnapshot = (): OutlineQueueState => this.state;
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };
    private signature(draft: OutlineSaveSnapshot): string {
        const payload = buildOutlinePayload(
            draft.rows,
            draft.deleted,
            draft.force,
            '',
            this.untitled,
            draft.conversions,
        );
        return JSON.stringify(payload);
    }
    get hasUnsaved(): boolean {
        return (
            this.inFlight !== null ||
            this.state.conflict !== null ||
            this.signature(this.state.draft) !== this.signature(this.state.base)
        );
    }
    private publish(patch: Partial<OutlineQueueState>): void {
        this.state = { ...this.state, ...patch };
        this.listeners.forEach((listener) => listener());
    }
    private clearTimer(): void {
        if (this.timer !== null) clearTimeout(this.timer);
        this.timer = null;
    }
    update(draft: OutlineSaveSnapshot): void {
        this.generation++;
        this.clearTimer();
        this.publish({
            draft: { ...draft, baseVersion: this.state.draft.baseVersion },
            status: this.state.conflict
                ? 'conflict'
                : this.inFlight
                  ? 'saving'
                  : 'dirty',
        });
        if (!this.hasUnsaved) {
            this.publish({ status: 'idle' });
            return;
        }
        if (!this.state.conflict && this.state.error === null)
            this.timer = setTimeout(() => {
                void this.flush();
            }, 800);
    }
    /** Replace a draft only after a deliberate reload/merge choice. */
    reset(
        projection: OutlineProjection,
        rows = rowsFromProjection(projection),
    ): void {
        if (this.inFlight) return;
        const base = {
            rows: rowsFromProjection(projection),
            deleted: [],
            force: [],
            conversions: [],
            baseVersion: projection.baseVersion,
        };
        this.clearTimer();
        this.uncertain = false;
        this.publish({
            base,
            draft: { ...base, rows },
            conflict: null,
            ambiguous: false,
            blocked: [],
            error: null,
            status: 'idle',
        });
    }
    resolve(projection: OutlineProjection, draft: OutlineSaveSnapshot): void {
        this.reset(projection);
        this.update({ ...draft, baseVersion: projection.baseVersion });
    }
    flush = (keepalive = false): Promise<boolean> => {
        this.clearTimer();
        if (this.inFlight) return this.inFlight;
        if (this.state.conflict) return Promise.resolve(false);
        if (!this.hasUnsaved) return Promise.resolve(true);
        // Assign before notifying listeners, which may synchronously request another flush.
        this.inFlight = Promise.resolve()
            .then(() => this.drain(keepalive))
            .finally(() => {
                this.inFlight = null;
                this.publish({});
            });
        this.publish({ status: 'saving', error: null });
        return this.inFlight;
    };
    private async drain(keepalive: boolean): Promise<boolean> {
        try {
            if (this.uncertain && this.load) {
                const projection = await this.load();
                if (projection.baseVersion !== this.state.draft.baseVersion) {
                    this.publish({
                        conflict: projection,
                        ambiguous: true,
                        status: 'conflict',
                    });
                    return false;
                }
            }
            this.uncertain = false;
            while (
                this.signature(this.state.draft) !==
                this.signature(this.state.base)
            ) {
                const submitted = structuredClone(this.state.draft);
                const generation = this.generation;
                const reply = await this.send(submitted, keepalive);
                this.acknowledge(submitted, reply);
                if (this.state.blocked.length) return false;
                if (generation === this.generation) break;
            }
            this.publish({ status: 'saved', error: null });
            return true;
        } catch (error) {
            if (error instanceof OutlineConflictError) {
                this.publish({
                    status: 'conflict',
                    conflict: error.projection,
                });
            } else {
                this.uncertain = !(error instanceof OutlineValidationError);
                this.publish({
                    status: 'error',
                    error:
                        error instanceof Error ? error.message : 'Save failed',
                });
            }
            return false;
        }
    }
    private acknowledge(
        submitted: OutlineSaveSnapshot,
        reply: OutlineSaveReply,
    ): void {
        const server = new Map(reply.rows.map((r) => [r.sectionId, r]));
        const ackRows = (rows: OutlineRow[]) =>
            reconcileTempIds(rows, reply.tempIds).map((row) => {
                const remote =
                    row.sectionId === null
                        ? undefined
                        : server.get(row.sectionId);
                return remote
                    ? {
                          ...row,
                          slug: remote.slug,
                          canBecomeBeat: remote.canBecomeBeat,
                          conversionBlockedReason:
                              remote.conversionBlockedReason,
                          hasContent: remote.has_content,
                      }
                    : row;
            });
        let rows = ackRows(this.state.draft.rows);
        const blockedIds = new Set(reply.blocked.map((b) => b.sectionId));
        const deleted = this.state.draft.deleted.filter(
            (id) => !submitted.deleted.includes(id) || blockedIds.has(id),
        );
        // A just-created row may have been removed locally before its ID arrived.
        for (const row of submitted.rows) {
            if (
                row.tempId &&
                reply.tempIds[row.tempId] !== undefined &&
                !rows.some((r) => r.key === row.key)
            )
                deleted.push(reply.tempIds[row.tempId]);
        }
        if (blockedIds.size) {
            const savedRows = rowsFromProjection(reply);
            for (const row of savedRows.filter((r) =>
                blockedIds.has(r.sectionId!),
            )) {
                if (rows.some((r) => r.sectionId === row.sectionId)) continue;
                const preceding = savedRows
                    .slice(0, savedRows.indexOf(row))
                    .reverse()
                    .find((r) =>
                        rows.some((local) => local.sectionId === r.sectionId),
                    );
                const index = preceding
                    ? rows.findIndex(
                          (r) => r.sectionId === preceding.sectionId,
                      ) + 1
                    : 0;
                const parent = rows.find(
                    (r) => r.sectionId === server.get(row.sectionId!)?.parentId,
                );
                rows = [
                    ...rows.slice(0, index),
                    { ...row, parentKey: parent?.key ?? null },
                    ...rows.slice(index),
                ];
            }
        }
        const conversions = this.state.draft.conversions.filter(
            (c) =>
                !submitted.conversions.some(
                    (sent) => sent.sourceSectionId === c.sourceSectionId,
                ),
        );
        const draft = {
            ...this.state.draft,
            rows,
            deleted: [...new Set(deleted)].filter((id) => !blockedIds.has(id)),
            force: this.state.draft.force.filter(
                (id) => !submitted.force.includes(id),
            ),
            conversions,
            baseVersion: reply.baseVersion,
        };
        const acknowledged = ackRows(submitted.rows);
        const keys = new Map(
            acknowledged
                .filter((r) => r.sectionId !== null)
                .map((r) => [r.sectionId!, r.key]),
        );
        const baseRows = rowsFromProjection(reply).map((r) => ({
            ...r,
            key: keys.get(r.sectionId!) ?? r.key,
            parentKey:
                r.parentKey === null
                    ? null
                    : (keys.get(
                          reply.rows.find((s) => s.sectionId === r.sectionId)!
                              .parentId!,
                      ) ?? r.parentKey),
        }));
        const base = {
            rows: baseRows,
            deleted: [],
            force: [],
            conversions: [],
            baseVersion: reply.baseVersion,
        };
        this.publish({
            draft,
            base,
            blocked: reply.blocked,
            status: reply.blocked.length ? 'error' : 'saving',
        });
    }
    keepBlocked(sectionId: number): void {
        this.publish({
            blocked: this.state.blocked.filter(
                (row) => row.sectionId !== sectionId,
            ),
            status: this.hasUnsaved ? 'dirty' : 'saved',
        });
    }
    stopTimer(): void {
        this.clearTimer();
    }
}
