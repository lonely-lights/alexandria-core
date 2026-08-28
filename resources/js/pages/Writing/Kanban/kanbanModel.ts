/**
 * Kanban board (né Beat Board) domain model — spec 2026-08-28 Kanban board (né Beat Board) Task 2.
 *
 * The board view groups the same flat `OutlineRow[]` tree the outline
 * view edits into columns and cards: each depth-0 row (an act, or a
 * standalone work) is a column, and every leaf row beneath it (a row
 * with no children of its own — a "scene") is a card, in document
 * order. Rows in between (chapters) aren't cards themselves; they
 * only supply a divider label above the first card of the group they
 * contain.
 *
 * `rows` is always the same flat, pre-order array `outlinePayload.ts`
 * works with: parents appear before their children, and a node's
 * subtree is the contiguous run of rows following it with a strictly
 * greater `depth`.
 */

import type { OutlineRow } from '../Outline/outlineTypes';

export interface KanbanCardModel {
    row: OutlineRow;
    dividerTitle: string | null;
}

export interface KanbanColumn {
    key: string;
    title: string;
    containerRow: OutlineRow | null;
    cards: KanbanCardModel[];
}

export interface CardDrop {
    cardKey: string;
    targetColumnKey: string;
    beforeCardKey: string | null;
}

const ROOT_COLUMN_KEY = 'root';

/** True when no other row in the tree names `key` as its parent. */
function isLeaf(rows: OutlineRow[], key: string): boolean {
    return !rows.some((candidate) => candidate.parentKey === key);
}

/**
 * The contiguous run of rows following `rows[rootIndex]` that make up
 * its subtree — every row until the next one at or above its depth.
 */
function subtreeOf(rows: OutlineRow[], rootIndex: number): OutlineRow[] {
    const rootDepth = rows[rootIndex].depth;
    const subtree: OutlineRow[] = [];

    for (let i = rootIndex + 1; i < rows.length; i++) {
        if (rows[i].depth <= rootDepth) {
            break;
        }
        subtree.push(rows[i]);
    }

    return subtree;
}

/** The leaf cards (in document order) belonging to a column. */
function columnCards(rows: OutlineRow[], containerRow: OutlineRow | null): OutlineRow[] {
    if (containerRow === null) {
        return rows.filter((r) => r.depth === 0 && isLeaf(rows, r.key));
    }

    const rootIndex = rows.findIndex((r) => r.key === containerRow.key);
    if (rootIndex === -1) {
        return [];
    }

    return subtreeOf(rows, rootIndex).filter((r) => isLeaf(rows, r.key));
}

/**
 * The divider title for each card in a column: the title of the
 * nearest ancestor strictly between the card and the column root
 * (e.g. a chapter), shown only on the first card of each contiguous
 * run sharing that same ancestor. Cards parented directly on the
 * column root (no intermediate container) never get a divider.
 */
function buildCardModels(
    rows: OutlineRow[],
    containerRow: OutlineRow | null,
    cards: OutlineRow[],
): KanbanCardModel[] {
    const rowsByKey = new Map(rows.map((r) => [r.key, r]));
    const rootKey = containerRow?.key ?? null;

    let previousIntermediateKey: string | null | undefined = undefined;

    return cards.map((card) => {
        const intermediateKey = card.parentKey !== rootKey ? card.parentKey : null;
        const isNewGroup = intermediateKey !== previousIntermediateKey;
        previousIntermediateKey = intermediateKey;

        if (!isNewGroup || intermediateKey === null) {
            return { row: card, dividerTitle: null };
        }

        const ancestor = rowsByKey.get(intermediateKey);
        return { row: card, dividerTitle: ancestor?.title ?? null };
    });
}

/**
 * Build the board's columns from the outline tree. Depth-0 rows with
 * children become real columns; depth-0 rows that are themselves
 * leaves (a flat, unstructured work) are collected into one synthetic
 * `{ key: 'root', title: '' }` column that appears first whenever it
 * has any cards.
 */
export function buildKanbanColumns(rows: OutlineRow[]): KanbanColumn[] {
    const depthZeroRows = rows.filter((r) => r.depth === 0);
    const rootLeaves = depthZeroRows.filter((r) => isLeaf(rows, r.key));
    const containers = depthZeroRows.filter((r) => !isLeaf(rows, r.key));

    const columns: KanbanColumn[] = [];

    if (rootLeaves.length > 0) {
        columns.push({
            key: ROOT_COLUMN_KEY,
            title: '',
            containerRow: null,
            cards: buildCardModels(rows, null, rootLeaves),
        });
    }

    for (const containerRow of containers) {
        const cards = columnCards(rows, containerRow);
        columns.push({
            key: containerRow.key,
            title: containerRow.title,
            containerRow,
            cards: buildCardModels(rows, containerRow, cards),
        });
    }

    return columns;
}

/** The last row of a container's subtree, or the container itself if it has none. */
function lastRowOfSubtreeOrSelf(rows: OutlineRow[], containerRow: OutlineRow): string {
    const rootIndex = rows.findIndex((r) => r.key === containerRow.key);
    if (rootIndex === -1) {
        return containerRow.key;
    }

    const subtree = subtreeOf(rows, rootIndex);
    return subtree.length > 0 ? subtree[subtree.length - 1].key : containerRow.key;
}

/**
 * Translate a card drop into a new complete row array for
 * `useOutlineSync.setRows`. See the Task 2 brief for the full
 * adjacency semantics; unknown `cardKey`/`targetColumnKey`/
 * `beforeCardKey` values are a no-op, returning `rows` unchanged.
 */
export function applyCardDrop(rows: OutlineRow[], drop: CardDrop): OutlineRow[] {
    const movedRow = rows.find((r) => r.key === drop.cardKey);
    if (movedRow === undefined) {
        return rows;
    }

    let containerRow: OutlineRow | null = null;
    if (drop.targetColumnKey !== ROOT_COLUMN_KEY) {
        const found = rows.find((r) => r.key === drop.targetColumnKey && r.depth === 0);
        if (found === undefined) {
            return rows;
        }
        containerRow = found;
    }

    let newParentKey: string | null;
    let newDepth: number;
    let insertBeforeKey: string | null = null;
    let insertAfterKey: string | null = null;

    if (drop.beforeCardKey !== null) {
        const referenceRow = rows.find((r) => r.key === drop.beforeCardKey);
        if (referenceRow === undefined) {
            return rows;
        }
        newParentKey = referenceRow.parentKey;
        newDepth = referenceRow.depth;
        insertBeforeKey = referenceRow.key;
    } else {
        const cards = columnCards(rows, containerRow);
        if (cards.length > 0) {
            const lastCard = cards[cards.length - 1];
            newParentKey = lastCard.parentKey;
            newDepth = lastCard.depth;
            insertAfterKey = lastCard.key;
        } else {
            newParentKey = containerRow?.key ?? null;
            newDepth = containerRow !== null ? containerRow.depth + 1 : 0;
            insertAfterKey = containerRow !== null ? lastRowOfSubtreeOrSelf(rows, containerRow) : null;
        }
    }

    const updatedMovedRow: OutlineRow = {
        ...movedRow,
        parentKey: newParentKey,
        depth: newDepth,
    };

    const rest = rows.filter((r) => r.key !== drop.cardKey);

    if (insertBeforeKey !== null) {
        const index = rest.findIndex((r) => r.key === insertBeforeKey);
        const result = [...rest];
        result.splice(index, 0, updatedMovedRow);
        return result;
    }

    if (insertAfterKey !== null) {
        const index = rest.findIndex((r) => r.key === insertAfterKey);
        const result = [...rest];
        result.splice(index + 1, 0, updatedMovedRow);
        return result;
    }

    return [updatedMovedRow, ...rest];
}
