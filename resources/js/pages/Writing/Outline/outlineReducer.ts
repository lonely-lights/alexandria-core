/**
 * Outline structure reducer — spec 2026-08-28 outline-mode Task 5.
 *
 * Pure keyboard/paste/structure logic for the outline view, kept apart
 * from `OutlineView.tsx` so it's testable without a DOM. `rows` is
 * always a flat, pre-order-traversal array — parents immediately
 * precede their descendants, exactly the shape `rowsFromProjection`
 * builds and `buildOutlinePayload` expects back. A row's whole subtree
 * is therefore always a contiguous slice of the array.
 *
 * Beats are NOT rows — they live inside `OutlineRow.beats`. To let a
 * beat be a keyboard target (Shift-Tab to promote it, Delete to drop
 * it) without inventing a second addressing scheme, this module mints
 * a synthetic composite key for a beat via `beatKey(rowKey, beatId)`;
 * `outlineReducer` recognizes that shape on `outdent`/`delete` and
 * dispatches accordingly. `OutlineView` uses the same helper to target
 * a beat sub-row's controls.
 */

import type { ParsedOutlineLine } from './parseOutlinePaste';
import type { OutlineBeat, OutlineRow } from './outlineTypes';

export type OutlineAction =
    | { type: 'enter'; key: string }
    | { type: 'indent'; key: string }
    | { type: 'outdent'; key: string }
    | { type: 'move'; key: string; dir: 'up' | 'down' }
    | { type: 'edit'; key: string; title: string; synopsis: string | null }
    | { type: 'paste'; anchorKey: string; lines: ParsedOutlineLine[] }
    | { type: 'toggle-beat'; key: string; beatId: string }
    | { type: 'edit-beat'; key: string; beatId: string; text: string }
    | { type: 'delete'; key: string };

export interface OutlineReducerResult {
    rows: OutlineRow[];
    /** The key of a row that refused a beat conversion, else null. */
    blockedHint: string | null;
    /** A key (row key or synthetic beat key) the view should focus after
     *  applying this result — set when an action creates or converts the
     *  element the writer's cursor logically moves into (Tab folding a
     *  row into a beat, Enter minting the next beat). Null when the
     *  view's own created-row diff suffices. */
    focusKey: string | null;
}

const BEAT_KEY_SEP = '::beat::';

/** Build the synthetic key that addresses one row's beat as a keyboard target. */
export function beatKey(rowKey: string, beatId: string): string {
    return `${rowKey}${BEAT_KEY_SEP}${beatId}`;
}

function parseBeatKey(key: string): { rowKey: string; beatId: string } | null {
    const idx = key.indexOf(BEAT_KEY_SEP);

    if (idx === -1) {
        return null;
    }

    return { rowKey: key.slice(0, idx), beatId: key.slice(idx + BEAT_KEY_SEP.length) };
}

function ok(rows: OutlineRow[], focusKey: string | null = null): OutlineReducerResult {
    return { rows, blockedHint: null, focusKey };
}

function blockedResult(rows: OutlineRow[], key: string): OutlineReducerResult {
    return { rows, blockedHint: key, focusKey: null };
}

function deepestDepth(rows: OutlineRow[]): number {
    return rows.reduce((max, row) => Math.max(max, row.depth), 0);
}

/** Index of the last row (inclusive) in the contiguous subtree rooted at `rows[index]`. */
function subtreeEnd(rows: OutlineRow[], index: number): number {
    const depth = rows[index].depth;
    let end = index;

    while (end + 1 < rows.length && rows[end + 1].depth > depth) {
        end += 1;
    }

    return end;
}

function newTempKey(): string {
    return `t-${crypto.randomUUID()}`;
}

/** A beat's single `text` field — fold title + synopsis when both are present. */
function beatTextFrom(title: string, synopsis: string | null): string {
    return synopsis !== null && synopsis.trim() !== '' ? `${title} — ${synopsis}` : title;
}

function enter(rows: OutlineRow[], key: string): OutlineReducerResult {
    const beatRef = parseBeatKey(key);

    if (beatRef !== null) {
        // Enter inside a beat: mint the next (empty) beat right after it.
        const parentIdx = rows.findIndex((row) => row.key === beatRef.rowKey);

        if (parentIdx === -1) {
            return ok(rows);
        }

        const parent = rows[parentIdx];
        const beatIdx = parent.beats.findIndex((b) => b.id === beatRef.beatId);

        if (beatIdx === -1) {
            return ok(rows);
        }

        const newBeat: OutlineBeat = { id: `b-${crypto.randomUUID()}`, text: '', done: false };
        const beats = [
            ...parent.beats.slice(0, beatIdx + 1),
            newBeat,
            ...parent.beats.slice(beatIdx + 1),
        ];

        return ok(
            rows.map((r, i) => (i === parentIdx ? { ...r, beats } : r)),
            beatKey(parent.key, newBeat.id),
        );
    }

    const idx = rows.findIndex((row) => row.key === key);

    if (idx === -1) {
        return ok(rows);
    }

    const row = rows[idx];
    const end = subtreeEnd(rows, idx);
    const newKey = newTempKey();
    const sibling: OutlineRow = {
        key: newKey,
        sectionId: null,
        tempId: newKey,
        parentKey: row.parentKey,
        depth: row.depth,
        label: row.label,
        title: '',
        slug: null,
        synopsis: null,
        beats: [],
    };

    return ok([...rows.slice(0, end + 1), sibling, ...rows.slice(end + 1)]);
}

function indent(rows: OutlineRow[], key: string): OutlineReducerResult {
    const idx = rows.findIndex((row) => row.key === key);

    if (idx <= 0) {
        // No previous row to become a parent.
        return ok(rows);
    }

    const row = rows[idx];
    const target = rows[idx - 1];
    const newDepth = row.depth + 1;

    if (newDepth > target.depth + 1) {
        // Would skip past the immediately preceding row's own depth —
        // e.g. row is already the target's first child. No-op.
        return ok(rows);
    }

    const deepest = deepestDepth(rows);

    if (newDepth > deepest) {
        // Beat conversion — only a contentless (temp-only) row may
        // fold itself into a beat; a persisted section refuses.
        if (row.sectionId !== null) {
            return blockedResult(rows, key);
        }

        // A row being folded into a beat must itself be a leaf — its
        // own descendants (if any) have nowhere to go.
        if (subtreeEnd(rows, idx) !== idx) {
            return blockedResult(rows, key);
        }

        const beat: OutlineBeat = {
            id: `b-${crypto.randomUUID()}`,
            text: beatTextFrom(row.title, row.synopsis),
            done: false,
        };
        const withoutRow = rows.filter((_, i) => i !== idx);

        return ok(
            withoutRow.map((r) =>
                r.key === target.key ? { ...r, beats: [...r.beats, beat] } : r,
            ),
            beatKey(target.key, beat.id),
        );
    }

    // Normal indent: reparent under `target`; the whole subtree's
    // depth shifts by the same delta as the row itself.
    const delta = newDepth - row.depth;
    const end = subtreeEnd(rows, idx);

    return ok(
        rows.map((r, i) => {
            if (i < idx || i > end) {
                return r;
            }

            return i === idx
                ? { ...r, depth: newDepth, parentKey: target.key }
                : { ...r, depth: r.depth + delta };
        }),
    );
}

function outdent(rows: OutlineRow[], key: string): OutlineReducerResult {
    const beatRef = parseBeatKey(key);

    if (beatRef !== null) {
        const parentIdx = rows.findIndex((row) => row.key === beatRef.rowKey);

        if (parentIdx === -1) {
            return ok(rows);
        }

        const parent = rows[parentIdx];
        const beat = parent.beats.find((b) => b.id === beatRef.beatId);

        if (beat === undefined) {
            return ok(rows);
        }

        const newKey = newTempKey();
        const promoted: OutlineRow = {
            key: newKey,
            sectionId: null,
            tempId: newKey,
            parentKey: parent.key,
            depth: parent.depth + 1,
            label: 'Scene',
            title: beat.text,
            slug: null,
            synopsis: null,
            beats: [],
        };

        const withoutBeat = rows.map((r, i) =>
            i === parentIdx ? { ...r, beats: r.beats.filter((b) => b.id !== beatRef.beatId) } : r,
        );
        const insertAt = subtreeEnd(withoutBeat, parentIdx) + 1;

        return ok([...withoutBeat.slice(0, insertAt), promoted, ...withoutBeat.slice(insertAt)]);
    }

    const idx = rows.findIndex((row) => row.key === key);

    if (idx === -1) {
        return ok(rows);
    }

    const row = rows[idx];

    if (row.parentKey === null) {
        // Already a root — nowhere to outdent to.
        return ok(rows);
    }

    const parent = rows.find((r) => r.key === row.parentKey);
    const newParentKey = parent?.parentKey ?? null;
    const end = subtreeEnd(rows, idx);

    return ok(
        rows.map((r, i) => {
            if (i < idx || i > end) {
                return r;
            }

            return i === idx
                ? { ...r, depth: r.depth - 1, parentKey: newParentKey }
                : { ...r, depth: r.depth - 1 };
        }),
    );
}

function move(rows: OutlineRow[], key: string, dir: 'up' | 'down'): OutlineReducerResult {
    const idx = rows.findIndex((row) => row.key === key);

    if (idx === -1) {
        return ok(rows);
    }

    const row = rows[idx];
    const siblingKeys = rows.filter((r) => r.parentKey === row.parentKey).map((r) => r.key);
    const pos = siblingKeys.indexOf(key);
    const targetKey = dir === 'up' ? siblingKeys[pos - 1] : siblingKeys[pos + 1];

    if (targetKey === undefined) {
        return ok(rows);
    }

    const targetIdx = rows.findIndex((r) => r.key === targetKey);
    const [aIdx, bIdx] = idx < targetIdx ? [idx, targetIdx] : [targetIdx, idx];
    const aEnd = subtreeEnd(rows, aIdx);
    const bEnd = subtreeEnd(rows, bIdx);

    // Adjacent siblings' subtrees are contiguous in a pre-order list —
    // nothing else can be interposed between them.
    const blockA = rows.slice(aIdx, aEnd + 1);
    const blockB = rows.slice(bIdx, bEnd + 1);

    return ok([...rows.slice(0, aIdx), ...blockB, ...blockA, ...rows.slice(bEnd + 1)]);
}

function edit(
    rows: OutlineRow[],
    key: string,
    title: string,
    synopsis: string | null,
): OutlineReducerResult {
    return ok(rows.map((row) => (row.key === key ? { ...row, title, synopsis } : row)));
}

function toggleBeat(rows: OutlineRow[], key: string, beatId: string): OutlineReducerResult {
    return ok(
        rows.map((row) =>
            row.key === key
                ? {
                      ...row,
                      beats: row.beats.map((b) => (b.id === beatId ? { ...b, done: !b.done } : b)),
                  }
                : row,
        ),
    );
}

function editBeat(
    rows: OutlineRow[],
    key: string,
    beatId: string,
    text: string,
): OutlineReducerResult {
    return ok(
        rows.map((row) =>
            row.key === key
                ? { ...row, beats: row.beats.map((b) => (b.id === beatId ? { ...b, text } : b)) }
                : row,
        ),
    );
}

function deleteAction(rows: OutlineRow[], key: string): OutlineReducerResult {
    const beatRef = parseBeatKey(key);

    if (beatRef !== null) {
        const parent = rows.find((row) => row.key === beatRef.rowKey);
        const beatIdx = parent?.beats.findIndex((b) => b.id === beatRef.beatId) ?? -1;
        // Cursor retreats to the previous beat, or the row's title when
        // the first beat is deleted.
        const focusKey =
            parent !== undefined && beatIdx > 0
                ? beatKey(parent.key, parent.beats[beatIdx - 1].id)
                : (parent?.key ?? null);

        return ok(
            rows.map((row) =>
                row.key === beatRef.rowKey
                    ? { ...row, beats: row.beats.filter((b) => b.id !== beatRef.beatId) }
                    : row,
            ),
            focusKey,
        );
    }

    const idx = rows.findIndex((row) => row.key === key);

    if (idx === -1) {
        return ok(rows);
    }

    const end = subtreeEnd(rows, idx);

    return ok([...rows.slice(0, idx), ...rows.slice(end + 1)]);
}

/**
 * Insert `lines` (already parsed by `parseOutlinePaste`) as the last
 * children of `anchorKey`'s subtree. A line's absolute depth is
 * `anchor.depth + 1 + line.depth`; a line deeper than the work's
 * current deepest section depth becomes a beat of its nearest
 * ancestor line (or the anchor itself, if none of the pasted lines
 * are shallower).
 */
function paste(
    rows: OutlineRow[],
    anchorKey: string,
    lines: ParsedOutlineLine[],
): OutlineReducerResult {
    if (lines.length === 0) {
        return ok(rows);
    }

    const anchorIdx = rows.findIndex((row) => row.key === anchorKey);

    if (anchorIdx === -1) {
        return ok(rows);
    }

    const anchor = rows[anchorIdx];
    const deepest = deepestDepth(rows);
    const maxRelDepth = deepest - anchor.depth - 1;

    const inserted: OutlineRow[] = [];
    const extraBeatsByHostKey = new Map<string, OutlineBeat[]>();
    // Indentation stack of CREATED ROWS only — a too-deep line becomes a
    // beat and is never pushed, so a further, even-deeper line still
    // resolves to the same row ancestor.
    const stack: Array<{ relDepth: number; key: string }> = [{ relDepth: -1, key: anchor.key }];

    const addBeat = (hostKey: string, beat: OutlineBeat) => {
        const list = extraBeatsByHostKey.get(hostKey) ?? [];
        list.push(beat);
        extraBeatsByHostKey.set(hostKey, list);
    };

    for (const line of lines) {
        while (stack.length > 1 && stack[stack.length - 1].relDepth >= line.depth) {
            stack.pop();
        }

        const parentKey = stack[stack.length - 1].key;

        if (line.depth > maxRelDepth) {
            addBeat(parentKey, {
                id: `b-${crypto.randomUUID()}`,
                text: beatTextFrom(line.title, line.synopsis),
                done: false,
            });
            continue;
        }

        const key = newTempKey();

        inserted.push({
            key,
            sectionId: null,
            tempId: key,
            parentKey,
            depth: anchor.depth + 1 + line.depth,
            label: 'Scene',
            title: line.title,
            slug: null,
            synopsis: line.synopsis,
            beats: [],
        });
        stack.push({ relDepth: line.depth, key });
    }

    const withInsertedBeats = inserted.map((row) => {
        const extra = extraBeatsByHostKey.get(row.key);

        return extra === undefined ? row : { ...row, beats: [...row.beats, ...extra] };
    });

    const anchorExtraBeats = extraBeatsByHostKey.get(anchor.key);
    const patchedAnchor =
        anchorExtraBeats === undefined ? anchor : { ...anchor, beats: [...anchor.beats, ...anchorExtraBeats] };

    const insertAt = subtreeEnd(rows, anchorIdx) + 1;

    return ok([
        ...rows.slice(0, anchorIdx),
        patchedAnchor,
        ...rows.slice(anchorIdx + 1, insertAt),
        ...withInsertedBeats,
        ...rows.slice(insertAt),
    ]);
}

export function outlineReducer(rows: OutlineRow[], action: OutlineAction): OutlineReducerResult {
    switch (action.type) {
        case 'enter':
            return enter(rows, action.key);
        case 'indent':
            return indent(rows, action.key);
        case 'outdent':
            return outdent(rows, action.key);
        case 'move':
            return move(rows, action.key, action.dir);
        case 'edit':
            return edit(rows, action.key, action.title, action.synopsis);
        case 'paste':
            return paste(rows, action.anchorKey, action.lines);
        case 'toggle-beat':
            return toggleBeat(rows, action.key, action.beatId);
        case 'edit-beat':
            return editBeat(rows, action.key, action.beatId, action.text);
        case 'delete':
            return deleteAction(rows, action.key);
        default:
            return ok(rows);
    }
}
