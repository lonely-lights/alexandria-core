import {
    useState,
    type CSSProperties,
    type DragEvent,
    type KeyboardEvent,
} from 'react';

import useT from '@alexandria/hooks/useT';

import { applyCardDrop, buildBoardColumns, type BoardColumn } from './boardModel';
import BoardCard from './BoardCard';
import { patchBeatDone } from '../Outline/outlineApi';
import { moodAccent } from './moodPalette';
import useOutlineSync from '../Outline/useOutlineSync';
import type { OutlineBeat, OutlineRow } from '../Outline/outlineTypes';

/**
 * Beat Board — full-pane columns view, spec 2026-08-28 Beat Board Task 4.
 *
 * The spatial sibling to `OutlineView`: the same flat `OutlineRow[]` tree,
 * grouped into act columns of scene cards via `buildBoardColumns`. Every
 * structural change (drag reorder/reparent, keyboard reorder) goes through
 * `applyCardDrop` → `setRows` — this component never talks to the bulk
 * outline PUT directly, exactly like `OutlineView`. Field/beat edits patch
 * the row array the same way `OutlineView`'s reducer dispatch does, just
 * without a reducer: `handleRowEdit` is a plain key-matched merge, since a
 * card only ever edits itself (no create/indent/reparent-by-typing to
 * arbitrate).
 *
 * Two obligations carried from Task 3's ledger, both discharged here:
 * `onBeatToggle` implements the real beats PATCH (`OutlineView.toggleBeat`,
 * copied verbatim minus its already-guarded-in-BoardCard null-section
 * branch), and `dragHandleProps` supplies `draggable` + `onDragStart` (plus
 * `onKeyDown` for the Alt-↑/↓ fallback — BoardCard spreads the whole prop
 * bag onto its outer div, so a keydown on the nested title input still
 * bubbles up to it).
 *
 * Drop targets: gaps (before/after a card, precise), a card's own body
 * (resolved to before/after by vertical midpoint — `cardMidpointTarget`
 * reuses the neighboring gap's identity so its indicator lights up, no
 * separate highlight styling needed), and the column body as a coarse
 * append-at-end fallback for drops that land in empty space. Every
 * `applyDrop` call — mouse or Alt-↑/↓ — flushes immediately: a drop is a
 * deliberate commit gesture, not a fast-typing edit that should ride the
 * debounce.
 */

export interface BoardViewProps {
    projectSlug: string;
    workSlug: string;
    canUpdate: boolean;
    onNavigate: (slug: string) => void;
}

interface DropTarget {
    columnKey: string;
    beforeCardKey: string | null;
}

const paneStyle: CSSProperties = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem 1.5rem 0',
};

const headerRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
    flexShrink: 0,
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

const boardScrollStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    flex: 1,
    minHeight: 0,
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingBottom: '1.5rem',
};

const columnStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    width: '280px',
    minWidth: '280px',
    maxHeight: '100%',
    borderRadius: 'var(--theme-radius-button)',
    background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};

const columnHeaderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '0.5rem',
    padding: '0.625rem 0.75rem 0.375rem',
    flexShrink: 0,
};

const columnTitleStyle: CSSProperties = {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: 'var(--theme-base-content)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const columnCountStyle: CSSProperties = {
    fontSize: '0.6875rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
    flexShrink: 0,
};

const columnBodyStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: '3rem',
    overflowY: 'auto',
    padding: '0 0.5rem 0.5rem',
};

const dividerStyle: CSSProperties = {
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    padding: '0.5rem 0.125rem 0.25rem',
};

const cardWrapStyle = (dragging: boolean): CSSProperties => ({
    opacity: dragging ? 0.4 : 1,
    marginBottom: '0.5rem',
});

function gapStyle(active: boolean): CSSProperties {
    return {
        height: active ? '0.5rem' : '0.375rem',
        margin: '0.0625rem 0',
        borderRadius: '999px',
        background: active
            ? 'var(--theme-brand-secondary-500)'
            : 'transparent',
        transition: 'background 0.1s ease',
    };
}

const emptyStateStyle: CSSProperties = {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
    fontSize: '0.875rem',
    flex: 1,
};

export default function BoardView({ projectSlug, workSlug, canUpdate, onNavigate }: BoardViewProps) {
    const t = useT();
    const { rows, setRows, flush, status } = useOutlineSync({ projectSlug, workSlug });

    const [draggingKey, setDraggingKey] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

    const columns = buildBoardColumns(rows);

    function handleRowEdit(key: string, patch: Partial<OutlineRow>) {
        setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    }

    async function handleBeatToggle(row: OutlineRow, beat: OutlineBeat) {
        if (row.sectionId === null) {
            return;
        }

        const beats = await patchBeatDone(projectSlug, workSlug, row.sectionId, beat.id, !beat.done);

        if (beats !== null) {
            setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, beats } : r)));
        }
    }

    /** Shared by drag-drop and the keyboard fallback: a same-position drop
     *  (the card's own leading gap) is a no-op that would otherwise splice
     *  the row in before itself and land it at the wrong end of the array.
     *  A drop — mouse or Alt-arrow — is a deliberate commit gesture exactly
     *  like Enter in the outline view, so `flush()` follows `setRows`
     *  immediately rather than waiting on the 800ms debounce. */
    function applyDrop(cardKey: string, targetColumnKey: string, beforeCardKey: string | null) {
        if (!canUpdate || cardKey === beforeCardKey) {
            return;
        }

        const next = applyCardDrop(rows, { cardKey, targetColumnKey, beforeCardKey });

        if (next !== rows) {
            setRows(next);
            flush();
        }
    }

    function handleDragStart(event: DragEvent<HTMLDivElement>, cardKey: string) {
        if (!canUpdate) {
            return;
        }

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cardKey);
        setDraggingKey(cardKey);
    }

    function handleDragEnd() {
        setDraggingKey(null);
        setDropTarget(null);
    }

    function handleGapDragOver(event: DragEvent<HTMLDivElement>, target: DropTarget) {
        if (!canUpdate || draggingKey === null) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        setDropTarget(target);
    }

    function handleGapDrop(event: DragEvent<HTMLDivElement>, target: DropTarget) {
        event.preventDefault();
        event.stopPropagation();

        const cardKey = event.dataTransfer.getData('text/plain') || draggingKey;

        if (cardKey !== null && cardKey !== '') {
            applyDrop(cardKey, target.columnKey, target.beforeCardKey);
        }

        handleDragEnd();
    }

    function handleColumnDragOver(event: DragEvent<HTMLDivElement>, columnKey: string) {
        if (!canUpdate || draggingKey === null) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDropTarget({ columnKey, beforeCardKey: null });
    }

    function handleColumnDrop(event: DragEvent<HTMLDivElement>, columnKey: string) {
        event.preventDefault();

        const cardKey = event.dataTransfer.getData('text/plain') || draggingKey;

        if (cardKey !== null && cardKey !== '') {
            applyDrop(cardKey, columnKey, null);
        }

        handleDragEnd();
    }

    /** Resolve a card-body hover to an insertion point by vertical midpoint:
     *  the top half targets "before this card" (the same identity as this
     *  card's own leading gap), the bottom half targets "before the next
     *  card" (the same identity as the next card's leading gap, or the
     *  column's trailing gap when this is the last card). Reusing those
     *  existing gap identities means the drop indicator that lights up is
     *  literally the neighboring gap — no separate highlight styling
     *  needed for the card-body path. */
    function cardMidpointTarget(
        event: DragEvent<HTMLDivElement>,
        column: BoardColumn,
        cardIndex: number,
    ): DropTarget {
        const rect = event.currentTarget.getBoundingClientRect();
        const midpointY = rect.top + rect.height / 2;

        if (event.clientY < midpointY) {
            return { columnKey: column.key, beforeCardKey: column.cards[cardIndex].row.key };
        }

        const next = column.cards[cardIndex + 1];
        return { columnKey: column.key, beforeCardKey: next ? next.row.key : null };
    }

    function handleCardDragOver(event: DragEvent<HTMLDivElement>, column: BoardColumn, cardIndex: number) {
        // A card can't be its own drop target — self-hover during a drag
        // (a slight tremor over the dragged card itself) shouldn't light
        // up an indicator or claim the event from whatever's underneath.
        if (!canUpdate || draggingKey === null || column.cards[cardIndex].row.key === draggingKey) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        setDropTarget(cardMidpointTarget(event, column, cardIndex));
    }

    function handleCardDrop(event: DragEvent<HTMLDivElement>, column: BoardColumn, cardIndex: number) {
        if (column.cards[cardIndex].row.key === draggingKey) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const target = cardMidpointTarget(event, column, cardIndex);
        const cardKey = event.dataTransfer.getData('text/plain') || draggingKey;

        if (cardKey !== null && cardKey !== '') {
            applyDrop(cardKey, target.columnKey, target.beforeCardKey);
        }

        handleDragEnd();
    }

    /** Alt-↑/↓ on a focused card title: swap with the previous/next sibling
     *  card in the same column. Bound via `dragHandleProps.onKeyDown` on the
     *  card's outer div, so a keydown inside BoardCard's nested title input
     *  bubbles up and reaches it. */
    function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>, column: BoardColumn, cardIndex: number) {
        if (!canUpdate || !event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) {
            return;
        }

        event.preventDefault();

        const cards = column.cards;
        const cardKey = cards[cardIndex].row.key;

        if (event.key === 'ArrowUp') {
            if (cardIndex === 0) {
                return;
            }

            applyDrop(cardKey, column.key, cards[cardIndex - 1].row.key);
            return;
        }

        if (cardIndex === cards.length - 1) {
            return;
        }

        const afterNext = cards[cardIndex + 2];
        applyDrop(cardKey, column.key, afterNext ? afterNext.row.key : null);
    }

    function isGapActive(columnKey: string, beforeCardKey: string | null): boolean {
        return (
            dropTarget !== null &&
            dropTarget.columnKey === columnKey &&
            dropTarget.beforeCardKey === beforeCardKey
        );
    }

    return (
        <div style={paneStyle} data-board-view="">
            <div style={headerRowStyle}>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-base-content)' }}>
                    {t('writing.board.title')}
                </h2>
                {status === 'saving' && <span style={statusChipStyle}>{t('writing.workspace.saving')}</span>}
                {status === 'saved' && <span style={statusChipStyle}>{t('writing.workspace.saved')}</span>}
                {status === 'error' && <span style={errorChipStyle}>{t('writing.workspace.save_error')}</span>}
                {status === 'conflict' && (
                    <span style={conflictChipStyle}>{t('writing.outline.status_conflict')}</span>
                )}
            </div>

            {columns.length === 0 ? (
                <div style={emptyStateStyle}>{t('writing.board.empty')}</div>
            ) : (
                <div style={boardScrollStyle}>
                    {columns.map((column) => (
                        <div key={column.key} style={columnStyle} data-board-column={column.key}>
                            <div style={columnHeaderStyle}>
                                <span style={columnTitleStyle}>
                                    {column.title !== '' ? column.title : t('writing.board.untitled_column')}
                                </span>
                                <span style={columnCountStyle}>
                                    {t('writing.board.column_count').replace(
                                        ':count',
                                        String(column.cards.length),
                                    )}
                                </span>
                            </div>

                            <div
                                style={columnBodyStyle}
                                onDragOver={(event) => handleColumnDragOver(event, column.key)}
                                onDrop={(event) => handleColumnDrop(event, column.key)}
                            >
                                {column.cards.map((cardModel, cardIndex) => (
                                    <div key={cardModel.row.key}>
                                        <div
                                            style={gapStyle(isGapActive(column.key, cardModel.row.key))}
                                            onDragOver={(event) =>
                                                handleGapDragOver(event, {
                                                    columnKey: column.key,
                                                    beforeCardKey: cardModel.row.key,
                                                })
                                            }
                                            onDrop={(event) =>
                                                handleGapDrop(event, {
                                                    columnKey: column.key,
                                                    beforeCardKey: cardModel.row.key,
                                                })
                                            }
                                        />

                                        {cardModel.dividerTitle !== null && (
                                            <div style={dividerStyle}>{cardModel.dividerTitle}</div>
                                        )}

                                        <div
                                            style={cardWrapStyle(draggingKey === cardModel.row.key)}
                                            onDragOver={(event) => handleCardDragOver(event, column, cardIndex)}
                                            onDrop={(event) => handleCardDrop(event, column, cardIndex)}
                                        >
                                            <BoardCard
                                                card={cardModel}
                                                projectSlug={projectSlug}
                                                workSlug={workSlug}
                                                canUpdate={canUpdate}
                                                accent={moodAccent(cardModel.row.mood)}
                                                onRowEdit={handleRowEdit}
                                                onBeatToggle={handleBeatToggle}
                                                onOpen={onNavigate}
                                                dragHandleProps={{
                                                    draggable: canUpdate,
                                                    onDragStart: (event) =>
                                                        handleDragStart(event, cardModel.row.key),
                                                    onDragEnd: handleDragEnd,
                                                    onKeyDown: (event) =>
                                                        handleCardKeyDown(event, column, cardIndex),
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}

                                <div
                                    style={gapStyle(isGapActive(column.key, null))}
                                    onDragOver={(event) =>
                                        handleGapDragOver(event, { columnKey: column.key, beforeCardKey: null })
                                    }
                                    onDrop={(event) =>
                                        handleGapDrop(event, { columnKey: column.key, beforeCardKey: null })
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
