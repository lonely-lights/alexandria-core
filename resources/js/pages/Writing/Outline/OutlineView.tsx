import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, CSSProperties, KeyboardEvent } from 'react';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import useT from '@alexandria/hooks/useT';
import DurationInput from '../pacing/DurationInput';
import MarkerReadout from '../pacing/MarkerReadout';
import { pacingNodesFromOutline } from '../pacing/pacingAdapters';
import { buildPacingModel } from '../pacing/pacingModel';
import PacingSummary from '../pacing/PacingSummary';
import type { PacingMarkerInput } from '../pacing/pacingTypes';
import SectionTiming from '../pacing/SectionTiming';

import type { ThreadSectionRef } from '../Threads/MarkThreadModal';
import MarkerPlacementModal from './MarkerPlacementModal';
import {
    readCollapsedKeys,
    rowHasNested,
    visibleOutlineRows,
    writeCollapsedKeys,
} from './outlineCollapse';
import OutlineConflictNotice from './OutlineConflictNotice';
import OutlineDeviceLabels from './OutlineDeviceLabels';
import { hasOutlineData } from './outlineDraft';

import { beatKey, outlineReducer } from './outlineReducer';
import type { OutlineAction } from './outlineReducer';
import type { OutlineBeat, OutlineRow } from './outlineTypes';
import { parseOutlinePaste } from './parseOutlinePaste';
import useOutlineSync from './useOutlineSync';
import type { BlockedOutlineRow } from './useOutlineSync';
import useOutlineThreads from './useOutlineThreads';

/**
 * Full-pane outline editor — spec 2026-08-28 outline-mode Task 5.
 *
 * A flat, indented list of a work's sections: title + muted synopsis
 * on the row itself, beats as check-off sub-rows underneath. All
 * structural editing (Enter/Tab/Shift-Tab/Alt+Up/Alt+Down/Backspace,
 * multi-line paste) runs through the pure `outlineReducer` — this
 * component only wires DOM events to actions and renders the result.
 *
 * `onNavigate` is part of this component's public interface (it mirrors
 * Task 7's read-only `OutlineSidebar`) but the outline projection
 * (Task 2/4) doesn't carry a section `slug` yet — Task 7 adds it. Until
 * then there's nothing valid to pass, so no control here calls it; the
 * prop is accepted so `Workspace.tsx`'s wiring already type-checks
 * against the shape both views will share.
 */

export interface OutlineViewProps {
    workId: number;
    threadsRefreshSignal?: number;
    onOpenThread?: (id: number) => void;
    markerRequest?: number | null;
    onMarkerRequestHandled?: () => void;
    onMarkersChange?: (markers: PacingMarkerInput[]) => void;
    onDraftChange?: (rows: OutlineRow[]) => void;
    targetRuntimeSeconds?: number | null;
    markers?: PacingMarkerInput[];
    projectSlug: string;
    workSlug: string;
    canUpdate: boolean;
    onNavigate: (slug: string) => void;
    /** Opens MarkThreadModal locked to this row's section (Devices &
     *  Tropes Task 5). Omitted for a not-yet-saved row (no sectionId). */
    onRequestMarkThread?: (section: ThreadSectionRef) => void;
}

const paneStyle: CSSProperties = {
    height: '100%',
    overflowY: 'auto',
    padding: '1rem 1.5rem 3rem',
};

const headerRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
};

const statusChipStyle: CSSProperties = {
    fontSize: '0.75rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
};

const conflictChipStyle: CSSProperties = {
    ...statusChipStyle,
    color: 'var(--theme-brand-secondary-500)',
    fontWeight: 600,
};

const errorChipStyle: CSSProperties = {
    ...statusChipStyle,
    color: 'var(--theme-status-error-stroke)',
    fontWeight: 600,
};

const rowStyle: CSSProperties = {
    marginBottom: '0.375rem',
};

const rowLineStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.1875rem 0.375rem',
};

const labelChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    lineHeight: 1.6,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    flexShrink: 0,
};

const titleInputStyle: CSSProperties = {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--theme-base-content)',
    fontFamily: 'inherit',
    fontSize: '0.9375rem',
    fontWeight: 600,
    padding: '0.125rem 0',
    minWidth: '6rem',
    // Columnar layout (owner, 2026-08-28 walkthrough): titles on the
    // left, synopses aligned in their own column — with NO separator
    // glyph between them.
    flex: '1 1 40%',
};

const synopsisInputStyle: CSSProperties = {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    fontFamily: 'inherit',
    fontSize: '0.8125rem',
    fontStyle: 'italic',
    padding: '0.125rem 0',
    flex: '1 1 60%',
    minWidth: '4rem',
};

/** Chevron on any row with something nested; the spacer twin keeps
 *  chevron-less rows aligned. */
const collapseBtnStyle: CSSProperties = {
    width: '1.125rem',
    flexShrink: 0,
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
    fontSize: '0.6875rem',
};

const collapseSpacerStyle: CSSProperties = {
    width: '1.125rem',
    flexShrink: 0,
};

const iconBtnStyle: CSSProperties = {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    fontSize: '0.75rem',
    padding: '0.125rem 0.25rem',
    flexShrink: 0,
};

const blockedHintStyle: CSSProperties = {
    color: 'var(--theme-status-error-stroke)',
    fontSize: '0.75rem',
    marginTop: '0.125rem',
};

const blockedConfirmStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.1875rem',
    padding: '0.25rem 0.5rem',
    borderRadius: 'var(--theme-radius-button)',
    background:
        'color-mix(in srgb, var(--theme-status-error-stroke) 10%, transparent)',
    color: 'var(--theme-status-error-stroke)',
    fontSize: '0.75rem',
};

const confirmBtnStyle: CSSProperties = {
    border: 'none',
    borderRadius: 'var(--theme-radius-button)',
    background: 'var(--theme-status-error-stroke)',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '0.125rem 0.5rem',
    cursor: 'pointer',
};

const keepBtnStyle: CSSProperties = {
    border: 'none',
    background: 'none',
    color: 'inherit',
    fontSize: '0.75rem',
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
};

const beatsWrapStyle: CSSProperties = {
    marginTop: '0.125rem',
    // 1.75rem to sit under the title + 1.125rem for the collapse
    // chevron/spacer column the row line now carries before it.
    marginLeft: '2.875rem',
};

const beatRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.0625rem 0',
};

function beatCheckStyle(done: boolean): CSSProperties {
    return {
        width: '0.8125rem',
        height: '0.8125rem',
        borderRadius: '999px',
        border: `1.5px solid ${done ? 'var(--theme-brand-primary-500)' : 'color-mix(in srgb, var(--theme-base-content) 35%, transparent)'}`,
        background: done ? 'var(--theme-brand-primary-500)' : 'transparent',
        cursor: 'pointer',
        flexShrink: 0,
        padding: 0,
    };
}

function beatTextStyle(done: boolean): CSSProperties {
    return {
        fontSize: '0.8125rem',
        color: done
            ? 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)'
            : 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
        textDecoration: done ? 'line-through' : 'none',
        flex: 1,
    };
}

const emptyStateStyle: CSSProperties = {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
    fontSize: '0.875rem',
};

const addFirstBtnStyle: CSSProperties = {
    marginTop: '0.75rem',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
    background: 'none',
    color: 'var(--theme-base-content)',
    padding: '0.375rem 0.875rem',
    fontSize: '0.8125rem',
    cursor: 'pointer',
};

function blockedFor(
    row: OutlineRow,
    blocked: BlockedOutlineRow[],
): BlockedOutlineRow | undefined {
    return row.sectionId === null
        ? undefined
        : blocked.find((b) => b.sectionId === row.sectionId);
}

export default function OutlineView({
    workId,
    threadsRefreshSignal = 0,
    onOpenThread,
    markerRequest = null,
    onMarkerRequestHandled,
    onMarkersChange,
    projectSlug,
    workSlug,
    canUpdate,
    onRequestMarkThread,
    onDraftChange,
    targetRuntimeSeconds = null,
    markers = [],
}: OutlineViewProps) {
    const t = useT();
    const {
        rows,
        markers: savedMarkers,
        placeMarker,
        hierarchy,
        ready,
        setRows,
        deleteRow,
        forceDelete,
        convertRow,
        undoConversion,
        hasConversions,
        conflict,
        base,
        draft,
        ambiguous,
        resolveConflict,
        discardConflict,
        error,
        flush,
        status,
        blocked,
        keepBlocked,
    } = useOutlineSync({
        refreshKey: JSON.stringify([targetRuntimeSeconds, markers]),
        projectSlug,
        workSlug,
    });

    useEffect(() => {
        if (ready) {
            onDraftChange?.(rows);
        }
    }, [rows, ready, onDraftChange]);
    useEffect(() => {
        if (ready) {
            onMarkersChange?.(savedMarkers);
        }
    }, [ready, savedMarkers, onMarkersChange]);
    const [placement, setPlacement] = useState<{
        index: number;
        sectionKey?: string;
    } | null>(null);
    const [followThreadId, setFollowThreadId] = useState<number | null>(null);
    const devices = useOutlineThreads(
        projectSlug,
        workId,
        threadsRefreshSignal,
    );
    const followedThread = devices.threads.find(
        (thread) => thread.id === followThreadId,
    );
    const activePlacement =
        placement ?? (markerRequest === null ? null : { index: markerRequest });
    const closePlacement = () => {
        setPlacement(null);
        onMarkerRequestHandled?.();
    };
    const pacing = buildPacingModel(
        pacingNodesFromOutline(rows),
        targetRuntimeSeconds,
        ready ? savedMarkers : markers,
    );
    const timingByKey = new Map(pacing.rows.map((r) => [r.key, r]));
    const inputRefs = useRef(new Map<string, HTMLInputElement>());
    const pendingFocusRef = useRef<string | null>(null);
    const [blockedHintKey, setBlockedHintKey] = useState<string | null>(null);
    const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(() =>
        readCollapsedKeys(workSlug),
    );

    function jumpToRow(key: string) {
        const row = rows.find((r) => r.key === key);

        if (!row) {
            return;
        }

        const ancestors = new Set<string>();
        let parent = row.parentKey;

        while (parent) {
            ancestors.add(parent);
            parent = rows.find((r) => r.key === parent)?.parentKey ?? null;
        }

        setCollapsedKeys(
            (previous) =>
                new Set([...previous].filter((k) => !ancestors.has(k))),
        );
        pendingFocusRef.current = key;
        requestAnimationFrame(() => {
            const input = inputRefs.current.get(key);
            input?.scrollIntoView({ block: 'center' });
            input?.focus({ preventScroll: true });
        });
    }
    function followThread(id: number) {
        setFollowThreadId((current) => (current === id ? null : id));
        // Expose every appearance while preserving unrelated collapsed sections.
        const marked = new Set(
            (
                devices.threads.find((thread) => thread.id === id)?.marks ?? []
            ).map((m) => m.work_section_id),
        );
        const ancestors = new Set<string>();

        for (const row of rows.filter(
            (r) => r.sectionId !== null && marked.has(r.sectionId),
        )) {
            let parent = row.parentKey;

            while (parent) {
                ancestors.add(parent);
                parent = rows.find((r) => r.key === parent)?.parentKey ?? null;
            }
        }

        setCollapsedKeys(
            (previous) =>
                new Set([...previous].filter((k) => !ancestors.has(k))),
        );
    }
    const invalidDurationKeys = useRef(new Set<string>());
    function endMarkerHost(sectionId: number | null): string | null {
        const index = rows.findIndex(
            (r) => r.sectionId === sectionId && sectionId !== null,
        );

        if (index < 0) {
            return null;
        }

        const visible = new Set(
            visibleOutlineRows(rows, collapsedKeys).map((r) => r.key),
        );
        let host = rows[index].key;

        for (
            let i = index + 1;
            i < rows.length && rows[i].depth > rows[index].depth;
            i++
        ) {
            if (visible.has(rows[i].key)) {
                host = rows[i].key;
            }
        }

        return host;
    }
    function toggleCollapsed(key: string) {
        if (!collapsedKeys.has(key)) {
            const start = rows.findIndex((r) => r.key === key);

            for (
                let i = start + 1;
                i < rows.length && rows[i].depth > rows[start].depth;
                i++
            ) {
                if (invalidDurationKeys.current.has(rows[i].key)) {
                    document
                        .querySelector<HTMLInputElement>(
                            '[data-outline-row="' +
                                CSS.escape(rows[i].key) +
                                '"] input[aria-invalid="true"]',
                        )
                        ?.focus();

                    return;
                }
            }
        }

        setCollapsedKeys((prev) => {
            const next = new Set(prev);

            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }

            writeCollapsedKeys(workSlug, next);

            return next;
        });
    }

    useEffect(() => {
        if (pendingFocusRef.current === null) {
            return;
        }

        const el = inputRefs.current.get(pendingFocusRef.current);
        pendingFocusRef.current = null;
        el?.focus();
    }, [rows]);

    function flashBlockedHint(key: string) {
        setBlockedHintKey(key);
        window.setTimeout(() => {
            setBlockedHintKey((current) => (current === key ? null : current));
        }, 2500);
    }

    /** Run a reducer action, apply it, and — if it minted a brand new
     *  row (Enter, or Shift-Tab promoting a beat) — focus it once it's
     *  mounted. */
    function dispatch(action: OutlineAction) {
        if (
            ['indent', 'outdent', 'move', 'paste', 'enter', 'delete'].includes(
                action.type,
            )
        ) {
            const invalid = rows.find((row) =>
                invalidDurationKeys.current.has(row.key),
            );

            if (invalid) {
                document
                    .querySelector<HTMLInputElement>(
                        '[data-outline-row="' +
                            CSS.escape(invalid.key) +
                            '"] input[aria-invalid="true"]',
                    )
                    ?.focus();

                return;
            }
        }

        const before = rows;
        const result = outlineReducer(before, action, { hierarchy });

        if (result.blockedHint !== null) {
            flashBlockedHint(result.blockedHint);
        }

        if (result.rows !== before) {
            if (action.type === 'indent' || action.type === 'outdent') {
                const nextRow = result.rows.find(
                    (row) => row.key === (result.focusKey ?? action.key),
                );
                const parents = new Set<string>();
                let parent = nextRow?.parentKey;

                while (parent && !parents.has(parent)) {
                    parents.add(parent);
                    parent = result.rows.find(
                        (row) => row.key === parent,
                    )?.parentKey;
                }

                setCollapsedKeys(
                    (previous) =>
                        new Set(
                            [...previous].filter((key) => !parents.has(key)),
                        ),
                );
            }

            if (result.focusKey !== null) {
                // The reducer knows exactly where the cursor moves next
                // (beat conversions/insertions) — trust it over the
                // created-row diff.
                pendingFocusRef.current = result.focusKey;
            } else {
                const beforeKeys = new Set(before.map((row) => row.key));
                const created = result.rows.find(
                    (row) => !beforeKeys.has(row.key),
                );

                if (created !== undefined) {
                    pendingFocusRef.current = created.key;
                }
            }

            if (result.conversion) {
                convertRow(result.conversion, result.rows);
            } else {
                setRows(result.rows);
            }
        }
    }

    function toggleBeat(row: OutlineRow, beat: OutlineBeat) {
        dispatch({ type: 'toggle-beat', key: row.key, beatId: beat.id });
    }

    function handleKeyDown(
        event: KeyboardEvent<HTMLInputElement>,
        row: OutlineRow,
    ) {
        if (
            !canUpdate ||
            ('nativeEvent' in event &&
                'isComposing' in event.nativeEvent &&
                event.nativeEvent.isComposing)
        ) {
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            dispatch({ type: 'enter', key: row.key });
            // Enter is a natural commit point — don't leave the new
            // line's predecessors sitting in the debounce window.
            void flush();

            return;
        }

        if (event.key === 'Tab' && !event.shiftKey) {
            event.preventDefault();
            dispatch({ type: 'indent', key: row.key });

            return;
        }

        if (event.key === 'Tab' && event.shiftKey) {
            event.preventDefault();
            dispatch({ type: 'outdent', key: row.key });

            return;
        }

        if (event.altKey && event.key === 'ArrowUp') {
            event.preventDefault();
            dispatch({ type: 'move', key: row.key, dir: 'up' });

            return;
        }

        if (event.altKey && event.key === 'ArrowDown') {
            event.preventDefault();
            dispatch({ type: 'move', key: row.key, dir: 'down' });

            return;
        }

        if (
            event.key === 'Backspace' &&
            !invalidDurationKeys.current.has(row.key) &&
            !hasOutlineData(row) &&
            !rows.some((r) => r.parentKey === row.key)
        ) {
            event.preventDefault();
            deleteRow(row.key);
        }
    }

    function handleBeatKeyDown(
        event: KeyboardEvent<HTMLButtonElement>,
        row: OutlineRow,
        beat: OutlineBeat,
    ) {
        if (
            !canUpdate ||
            ('nativeEvent' in event &&
                'isComposing' in event.nativeEvent &&
                event.nativeEvent.isComposing)
        ) {
            return;
        }

        if (event.key === 'Tab' && event.shiftKey) {
            event.preventDefault();
            dispatch({ type: 'outdent', key: beatKey(row.key, beat.id) });
        }
    }

    function handleBeatInputKeyDown(
        event: KeyboardEvent<HTMLInputElement>,
        row: OutlineRow,
        beat: OutlineBeat,
    ) {
        if (
            !canUpdate ||
            ('nativeEvent' in event &&
                'isComposing' in event.nativeEvent &&
                event.nativeEvent.isComposing)
        ) {
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            dispatch({ type: 'enter', key: beatKey(row.key, beat.id) });
            void flush();

            return;
        }

        if (event.key === 'Tab' && event.shiftKey) {
            event.preventDefault();
            dispatch({ type: 'outdent', key: beatKey(row.key, beat.id) });

            return;
        }

        if (event.key === 'Tab') {
            // Beats are the deepest tier — swallow Tab so focus doesn't
            // wander off mid-outline.
            event.preventDefault();

            return;
        }

        if (event.key === 'Backspace' && beat.text === '') {
            event.preventDefault();
            dispatch({ type: 'delete', key: beatKey(row.key, beat.id) });
        }
    }

    function handlePaste(
        event: ClipboardEvent<HTMLInputElement>,
        row: OutlineRow,
    ) {
        if (
            !canUpdate ||
            ('nativeEvent' in event &&
                'isComposing' in event.nativeEvent &&
                event.nativeEvent.isComposing)
        ) {
            return;
        }

        const text = event.clipboardData.getData('text/plain');

        if (!text.includes('\n')) {
            // A single line pastes into the field normally.
            return;
        }

        event.preventDefault();
        dispatch({
            type: 'paste',
            anchorKey: row.key,
            lines: parseOutlinePaste(text),
        });
    }

    function handleAddFirstRow() {
        const key = `t-${crypto.randomUUID()}`;
        setRows([
            {
                key,
                sectionId: null,
                tempId: key,
                parentKey: null,
                depth: 0,
                label: hierarchy[0]?.label ?? 'Section',
                isStructural: hierarchy[0]?.isStructural ?? false,
                title: '',
                slug: null,
                synopsis: null,
                beats: [],
            },
        ]);
        pendingFocusRef.current = key;
    }

    return (
        <div style={paneStyle} data-outline-view="">
            {conflict && (
                <OutlineConflictNotice
                    base={base}
                    draft={draft}
                    projection={conflict}
                    ambiguous={ambiguous}
                    onResolve={resolveConflict}
                    onDiscard={discardConflict}
                />
            )}
            {status === 'error' && (
                <div role="alert">
                    <span>{error ?? t('writing.workspace.save_error')}</span>{' '}
                    <button
                        type="button"
                        onClick={() => {
                            void flush();
                        }}
                    >
                        {t('writing.outline.retry_save')}
                    </button>
                </div>
            )}
            {status === 'error' && hasConversions && (
                <button type="button" onClick={undoConversion}>
                    {t('writing.outline.undo_conversion')}
                </button>
            )}
            <div style={headerRowStyle}>
                <h2
                    className="text-sm font-semibold"
                    style={{ color: 'var(--theme-base-content)' }}
                >
                    {t('writing.outline.title')}
                </h2>
                {status === 'saving' && (
                    <span style={statusChipStyle}>
                        {t('writing.workspace.saving')}
                    </span>
                )}
                {status === 'saved' && (
                    <span style={statusChipStyle}>
                        {t('writing.workspace.saved')}
                    </span>
                )}
                {status === 'error' && (
                    <span style={errorChipStyle}>
                        {t('writing.workspace.save_error')}
                    </span>
                )}
                {status === 'conflict' && (
                    <span style={conflictChipStyle}>
                        {t('writing.outline.status_conflict')}
                    </span>
                )}
            </div>

            {devices.failed && (
                <p role="status" className="mb-3 text-sm">
                    {t('writing.threads.outline_load_failed')}{' '}
                    <button
                        type="button"
                        className="underline"
                        onClick={devices.retry}
                    >
                        {t('writing.threads.outline_retry')}
                    </button>
                </p>
            )}
            {followedThread && (
                <div
                    className="border-current/20 sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded border p-2 text-xs"
                    style={{ background: 'var(--theme-base-surface)' }}
                    data-outline-following
                >
                    <strong>{followedThread.title}</strong>
                    {rows
                        .filter(
                            (r) =>
                                r.sectionId !== null &&
                                devices.bySection
                                    .get(r.sectionId)
                                    ?.some(
                                        (m) => m.thread.id === followThreadId,
                                    ),
                        )
                        .map((r) => (
                            <button
                                type="button"
                                className="border-current/20 rounded border px-2 py-1"
                                key={r.key}
                                onClick={() => jumpToRow(r.key)}
                            >
                                {r.title}
                            </button>
                        ))}
                    <button
                        type="button"
                        className="ml-auto underline"
                        onClick={() => setFollowThreadId(null)}
                    >
                        {t('writing.threads.stop_following')}
                    </button>
                </div>
            )}
            <PacingSummary totals={pacing.totals} empty={rows.length === 0} />
            {pacing.markers
                .filter((m) => m.landing === null)
                .map((m, i) => (
                    <MarkerReadout
                        key={i}
                        marker={m}
                        sectionTitle={
                            rows.find((r) => r.sectionId === m.anchorSectionId)
                                ?.title
                        }
                        onPlace={
                            canUpdate
                                ? () =>
                                      setPlacement({
                                          index: pacing.markers.indexOf(m),
                                      })
                                : undefined
                        }
                    />
                ))}
            {rows.length === 0 ? (
                <div style={emptyStateStyle}>
                    <p>{t('writing.outline.empty')}</p>
                    {canUpdate && (
                        <button
                            type="button"
                            style={addFirstBtnStyle}
                            onClick={handleAddFirstRow}
                            disabled={!ready}
                        >
                            {t('writing.outline.add_first')}
                        </button>
                    )}
                </div>
            ) : (
                visibleOutlineRows(rows, collapsedKeys).map((row) => {
                    const blockedEntry = blockedFor(row, blocked);
                    const hasNested = rowHasNested(rows, rows.indexOf(row));
                    const isCollapsed = collapsedKeys.has(row.key);

                    return (
                        <div
                            key={row.key}
                            data-outline-row={row.key}
                            data-outline-thread-match={
                                followThreadId !== null &&
                                row.sectionId !== null &&
                                devices.bySection
                                    .get(row.sectionId)
                                    ?.some(
                                        (m) => m.thread.id === followThreadId,
                                    )
                                    ? 'true'
                                    : undefined
                            }
                            style={{
                                ...rowStyle,
                                background:
                                    followThreadId !== null &&
                                    row.sectionId !== null &&
                                    devices.bySection
                                        .get(row.sectionId)
                                        ?.some(
                                            (m) =>
                                                m.thread.id === followThreadId,
                                        )
                                        ? 'color-mix(in srgb, var(--theme-brand-primary-500) 7%, transparent)'
                                        : undefined,
                                paddingLeft: `${row.depth * 1.5}rem`,
                            }}
                        >
                            {pacing.markers
                                .filter(
                                    (m) =>
                                        m.anchorSectionId === row.sectionId &&
                                        row.sectionId !== null &&
                                        m.anchorEdge === 'start',
                                )
                                .map((m, i) => (
                                    <MarkerReadout
                                        key={i}
                                        marker={m}
                                        sectionTitle={
                                            rows.find(
                                                (r) =>
                                                    r.sectionId ===
                                                    m.anchorSectionId,
                                            )?.title
                                        }
                                        onPlace={
                                            canUpdate
                                                ? () =>
                                                      setPlacement({
                                                          index: pacing.markers.indexOf(
                                                              m,
                                                          ),
                                                      })
                                                : undefined
                                        }
                                    />
                                ))}
                            <div style={rowLineStyle}>
                                {hasNested ? (
                                    <button
                                        type="button"
                                        style={collapseBtnStyle}
                                        aria-expanded={!isCollapsed}
                                        aria-label={
                                            isCollapsed
                                                ? t('writing.outline.expand')
                                                : t('writing.outline.collapse')
                                        }
                                        onClick={() => toggleCollapsed(row.key)}
                                    >
                                        <i
                                            className={`fa-solid ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'}`}
                                            aria-hidden="true"
                                        />
                                    </button>
                                ) : (
                                    <span
                                        style={collapseSpacerStyle}
                                        aria-hidden="true"
                                    />
                                )}
                                {row.label !== '' && (
                                    <span style={labelChipStyle}>
                                        {row.label}
                                    </span>
                                )}
                                <input
                                    ref={(el) => {
                                        if (el) {
                                            inputRefs.current.set(row.key, el);
                                        } else {
                                            inputRefs.current.delete(row.key);
                                        }
                                    }}
                                    type="text"
                                    value={row.title}
                                    disabled={!canUpdate}
                                    placeholder={t(
                                        'writing.outline.title_placeholder',
                                    )}
                                    style={titleInputStyle}
                                    onChange={(event) =>
                                        dispatch({
                                            type: 'edit',
                                            key: row.key,
                                            title: event.target.value,
                                            synopsis: row.synopsis,
                                        })
                                    }
                                    onKeyDown={(event) =>
                                        handleKeyDown(event, row)
                                    }
                                    onPaste={(event) => handlePaste(event, row)}
                                    onBlur={() => flush()}
                                />
                                <input
                                    type="text"
                                    value={row.synopsis ?? ''}
                                    disabled={!canUpdate}
                                    placeholder={t(
                                        'writing.outline.synopsis_placeholder',
                                    )}
                                    style={synopsisInputStyle}
                                    onChange={(event) =>
                                        dispatch({
                                            type: 'edit',
                                            key: row.key,
                                            title: row.title,
                                            synopsis:
                                                event.target.value === ''
                                                    ? null
                                                    : event.target.value,
                                        })
                                    }
                                    onKeyDown={(event) =>
                                        handleKeyDown(event, row)
                                    }
                                    onBlur={() => flush()}
                                />
                                {canUpdate && (
                                    <DropdownMenu
                                        align="right"
                                        density="compact"
                                        menuClassName="w-48"
                                        trigger={
                                            <button
                                                type="button"
                                                style={iconBtnStyle}
                                                aria-label={t(
                                                    'writing.workspace.section_options',
                                                )}
                                                title={t(
                                                    'writing.workspace.section_options',
                                                )}
                                            >
                                                <i
                                                    className="fa-solid fa-ellipsis-vertical"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        }
                                        items={[
                                            ...(savedMarkers.length
                                                ? [
                                                      {
                                                          label: t(
                                                              'writing.pacing.place_marker',
                                                          ),
                                                          icon: 'fa-location-dot',
                                                          onClick: () =>
                                                              setPlacement({
                                                                  index: 0,
                                                                  sectionKey:
                                                                      row.key,
                                                              }),
                                                      },
                                                  ]
                                                : []),
                                            ...(row.sectionId !== null &&
                                            onRequestMarkThread
                                                ? [
                                                      {
                                                          label: t(
                                                              'writing.threads.mark_action',
                                                          ),
                                                          icon: 'fa-book-bookmark',
                                                          onClick: () =>
                                                              onRequestMarkThread(
                                                                  {
                                                                      id: row.sectionId as number,
                                                                      title: row.title,
                                                                  },
                                                              ),
                                                      },
                                                  ]
                                                : []),
                                        ]}
                                    />
                                )}
                                {canUpdate && (
                                    <button
                                        type="button"
                                        style={iconBtnStyle}
                                        aria-label={t(
                                            'writing.outline.delete_row',
                                        )}
                                        onClick={() => deleteRow(row.key)}
                                    >
                                        <i
                                            className="fa-solid fa-trash"
                                            aria-hidden="true"
                                        />
                                    </button>
                                )}
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.6rem',
                                    flexWrap: 'wrap',
                                    padding: '0.25rem 0 0.5rem',
                                }}
                            >
                                <label
                                    style={{
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        gap: '0.4rem',
                                        alignItems: 'center',
                                    }}
                                >
                                    {t(
                                        'writing.pacing.' +
                                            (timingByKey.get(row.key)!
                                                .isContainer
                                                ? 'budget'
                                                : 'duration'),
                                    )}
                                    <DurationInput
                                        onValidityChange={(valid) => {
                                            if (valid) {
                                                invalidDurationKeys.current.delete(
                                                    row.key,
                                                );
                                            } else {
                                                invalidDurationKeys.current.add(
                                                    row.key,
                                                );
                                            }
                                        }}
                                        value={row.durationSeconds ?? null}
                                        label={
                                            t(
                                                'writing.pacing.' +
                                                    (timingByKey.get(row.key)!
                                                        .isContainer
                                                        ? 'budget'
                                                        : 'duration'),
                                            ) +
                                            ' — ' +
                                            (row.title ||
                                                t(
                                                    'writing.outline.title_placeholder',
                                                ))
                                        }
                                        disabled={!canUpdate}
                                        onCommit={(seconds) =>
                                            setRows((current) =>
                                                current.map((r) =>
                                                    r.key === row.key
                                                        ? {
                                                              ...r,
                                                              durationSeconds:
                                                                  seconds,
                                                          }
                                                        : r,
                                                ),
                                            )
                                        }
                                    />
                                </label>
                                <SectionTiming
                                    row={timingByKey.get(row.key)!}
                                />
                            </div>
                            {pacing.markers
                                .filter(
                                    (m) =>
                                        endMarkerHost(m.anchorSectionId) ===
                                            row.key && m.anchorEdge === 'end',
                                )
                                .map((m, i) => (
                                    <MarkerReadout
                                        key={i}
                                        marker={m}
                                        sectionTitle={
                                            rows.find(
                                                (r) =>
                                                    r.sectionId ===
                                                    m.anchorSectionId,
                                            )?.title
                                        }
                                        onPlace={
                                            canUpdate
                                                ? () =>
                                                      setPlacement({
                                                          index: pacing.markers.indexOf(
                                                              m,
                                                          ),
                                                      })
                                                : undefined
                                        }
                                    />
                                ))}
                            <OutlineDeviceLabels
                                marks={
                                    row.sectionId === null
                                        ? []
                                        : (devices.bySection.get(
                                              row.sectionId,
                                          ) ?? [])
                                }
                                selectedThreadId={followThreadId}
                                onOpen={(id) => onOpenThread?.(id)}
                                onFollow={followThread}
                            />
                            {blockedHintKey === row.key && (
                                <div style={blockedHintStyle}>
                                    {t(
                                        'writing.outline.beat_conversion_blocked',
                                    )}
                                </div>
                            )}

                            {blockedEntry !== undefined && (
                                <div style={blockedConfirmStyle}>
                                    <span>
                                        {t(
                                            `writing.outline.blocked_${blockedEntry.reason}`,
                                            t(
                                                'writing.outline.blocked_generic',
                                            ),
                                        )}
                                    </span>
                                    <button
                                        type="button"
                                        style={confirmBtnStyle}
                                        onClick={() => forceDelete(row.key)}
                                    >
                                        {t('writing.outline.force_delete')}
                                    </button>
                                    <button
                                        type="button"
                                        style={keepBtnStyle}
                                        onClick={() =>
                                            keepBlocked(blockedEntry.sectionId)
                                        }
                                    >
                                        {t('writing.outline.keep_row')}
                                    </button>
                                </div>
                            )}

                            {row.beats.length > 0 && !isCollapsed && (
                                <div style={beatsWrapStyle}>
                                    {row.beats.map((beat) => (
                                        <div key={beat.id} style={beatRowStyle}>
                                            <button
                                                type="button"
                                                role="checkbox"
                                                aria-checked={beat.done}
                                                aria-label={beat.text}
                                                disabled={!canUpdate}
                                                style={beatCheckStyle(
                                                    beat.done,
                                                )}
                                                onClick={() =>
                                                    toggleBeat(row, beat)
                                                }
                                                onKeyDown={(event) =>
                                                    handleBeatKeyDown(
                                                        event,
                                                        row,
                                                        beat,
                                                    )
                                                }
                                            />
                                            <input
                                                type="text"
                                                value={beat.text}
                                                readOnly={!canUpdate}
                                                placeholder={t(
                                                    'writing.outline.beat_placeholder',
                                                )}
                                                aria-label={t(
                                                    'writing.outline.beat_placeholder',
                                                )}
                                                ref={(el) => {
                                                    const k = beatKey(
                                                        row.key,
                                                        beat.id,
                                                    );

                                                    if (el) {
                                                        inputRefs.current.set(
                                                            k,
                                                            el,
                                                        );
                                                    } else {
                                                        inputRefs.current.delete(
                                                            k,
                                                        );
                                                    }
                                                }}
                                                style={{
                                                    ...beatTextStyle(beat.done),
                                                    flex: 1,
                                                    minWidth: 0,
                                                    background: 'transparent',
                                                    border: 'none',
                                                    outline: 'none',
                                                    font: 'inherit',
                                                    padding: 0,
                                                }}
                                                onChange={(event) =>
                                                    dispatch({
                                                        type: 'edit-beat',
                                                        key: row.key,
                                                        beatId: beat.id,
                                                        text: event.target
                                                            .value,
                                                    })
                                                }
                                                onKeyDown={(event) =>
                                                    handleBeatInputKeyDown(
                                                        event,
                                                        row,
                                                        beat,
                                                    )
                                                }
                                                onBlur={() => flush()}
                                            />
                                            {canUpdate && (
                                                <button
                                                    type="button"
                                                    style={iconBtnStyle}
                                                    aria-label={t(
                                                        'writing.outline.delete_beat',
                                                    )}
                                                    onClick={() =>
                                                        dispatch({
                                                            type: 'delete',
                                                            key: beatKey(
                                                                row.key,
                                                                beat.id,
                                                            ),
                                                        })
                                                    }
                                                >
                                                    <i
                                                        className="fa-solid fa-xmark"
                                                        aria-hidden="true"
                                                    />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
            {canUpdate &&
                ready &&
                activePlacement &&
                savedMarkers[activePlacement.index] && (
                    <MarkerPlacementModal
                        key={
                            String(activePlacement.index) +
                            ('sectionKey' in activePlacement
                                ? activePlacement.sectionKey
                                : '')
                        }
                        rows={rows}
                        markers={savedMarkers}
                        initialIndex={activePlacement.index}
                        initialSectionKey={
                            'sectionKey' in activePlacement
                                ? activePlacement.sectionKey
                                : undefined
                        }
                        target={targetRuntimeSeconds}
                        onSave={placeMarker}
                        onClose={closePlacement}
                        onJump={jumpToRow}
                    />
                )}
        </div>
    );
}
