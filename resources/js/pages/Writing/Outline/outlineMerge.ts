import type { OutlineBeat, OutlineRow } from './outlineTypes';

export interface OutlineMergeConflict {
    key: string;
    field:
        | 'title'
        | 'synopsis'
        | 'beats'
        | 'structure'
        | 'deleted'
        | 'created'
        | 'durationSeconds';
    base: unknown;
    local: unknown;
    server: unknown;
}
export interface OutlineMergeResult {
    rows: OutlineRow[];
    conflicts: OutlineMergeConflict[];
}
const equal = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);
const identity = (row: OutlineRow) =>
    row.sectionId === null ? row.key : 'section:' + row.sectionId;
const shape = (rows: OutlineRow[]) =>
    rows.map((r) => ({ key: r.key, parentKey: r.parentKey }));
const editable = (row: OutlineRow) => ({
    title: row.title,
    synopsis: row.synopsis,
    beats: row.beats,
    parentKey: row.parentKey,
    durationSeconds: (row as OutlineRow & { durationSeconds?: number | null })
        .durationSeconds,
});

function mergeBeats(
    base: OutlineBeat[],
    local: OutlineBeat[],
    server: OutlineBeat[],
): { beats: OutlineBeat[]; conflict: boolean } {
    const all = new Set([...base, ...server, ...local].map((b) => b.id));
    const beats: OutlineBeat[] = [];
    let conflict = false;
    for (const id of all) {
        const b = base.find((v) => v.id === id),
            l = local.find((v) => v.id === id),
            s = server.find((v) => v.id === id);
        if (equal(l, s) || equal(s, b)) {
            if (l) beats.push(l);
            continue;
        }
        if (equal(l, b)) {
            if (s) beats.push(s);
            continue;
        }
        if (b && l && s) {
            const merged = { ...l };
            for (const field of ['text', 'done'] as const) {
                if (equal(l[field], b[field]))
                    Object.assign(merged, { [field]: s[field] });
                else if (
                    !equal(s[field], b[field]) &&
                    !equal(l[field], s[field])
                )
                    conflict = true;
            }
            beats.push(merged);
        } else {
            conflict = true;
            if (l) beats.push(l);
        }
    }
    return { beats, conflict };
}

/** Orders a valid forest without dropping an orphan or concealing a cycle. */
export function orderOutlineRows(
    rows: OutlineRow[],
    preference: { key: string; parentKey: string | null }[],
): OutlineRow[] {
    const ranks = new Map(preference.map((r, i) => [r.key, i]));
    const parentByKey = new Map(preference.map((r) => [r.key, r.parentKey]));
    const input = rows.map((r) =>
        parentByKey.has(r.key)
            ? { ...r, parentKey: parentByKey.get(r.key)! }
            : r,
    );
    const ordered: OutlineRow[] = [];
    const seen = new Set<string>();
    function walk(parentKey: string | null, depth: number) {
        for (const row of input
            .filter((r) => r.parentKey === parentKey)
            .sort(
                (a, b) =>
                    (ranks.get(a.key) ?? Infinity) -
                    (ranks.get(b.key) ?? Infinity),
            )) {
            if (seen.has(row.key)) continue;
            seen.add(row.key);
            ordered.push({ ...row, depth });
            walk(row.key, depth + 1);
        }
    }
    walk(null, 0);
    return [...ordered, ...input.filter((r) => !seen.has(r.key))];
}
export function invalidOutlineParents(rows: OutlineRow[]): string[] {
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return rows
        .filter((row) => {
            const seen = new Set([row.key]);
            let parent = row.parentKey;
            while (parent !== null) {
                if (!byKey.has(parent) || seen.has(parent)) return true;
                seen.add(parent);
                parent = byKey.get(parent)!.parentKey;
            }
            return false;
        })
        .map((r) => r.key);
}

export function mergeOutlineDraft(
    baseRows: OutlineRow[],
    localRows: OutlineRow[],
    serverRows: OutlineRow[],
    options: { ambiguous?: boolean } = {},
): OutlineMergeResult {
    const keys = new Map<string, string>();
    for (const row of [...localRows, ...baseRows, ...serverRows])
        if (!keys.has(identity(row))) keys.set(identity(row), row.key);
    function align(rows: OutlineRow[]): OutlineRow[] {
        const remap = new Map(rows.map((r) => [r.key, keys.get(identity(r))!]));
        return rows.map((r) => ({
            ...r,
            key: remap.get(r.key)!,
            parentKey:
                r.parentKey === null
                    ? null
                    : (remap.get(r.parentKey) ?? r.parentKey),
        }));
    }
    const base = align(baseRows),
        local = align(localRows),
        server = align(serverRows);
    const bm = new Map(base.map((r) => [r.key, r])),
        lm = new Map(local.map((r) => [r.key, r])),
        sm = new Map(server.map((r) => [r.key, r]));
    const rows: OutlineRow[] = [],
        conflicts: OutlineMergeConflict[] = [];
    for (const key of new Set(
        [...local, ...server, ...base].map((r) => r.key),
    )) {
        const b = bm.get(key),
            l = lm.get(key),
            s = sm.get(key);
        if (!b) {
            if (l) rows.push(l);
            else if (s) rows.push(s);
            continue;
        }
        if (!l || !s) {
            const survivor = l ?? s;
            if (survivor && !equal(editable(survivor), editable(b))) {
                conflicts.push({
                    key,
                    field: 'deleted',
                    base: b,
                    local: l ?? null,
                    server: s ?? null,
                });
                rows.push(survivor);
            }
            continue;
        }
        const merged = {
            ...s,
            key: l.key,
            parentKey: l.parentKey,
            depth: l.depth,
        };
        for (const field of ['title', 'synopsis', 'durationSeconds'] as const) {
            const bv = (b as unknown as Record<string, unknown>)[field],
                lv = (l as unknown as Record<string, unknown>)[field],
                sv = (s as unknown as Record<string, unknown>)[field];
            const value = equal(lv, bv) ? sv : lv;
            Object.assign(merged, { [field]: value });
            if (!equal(lv, sv) && !equal(lv, bv) && !equal(sv, bv))
                conflicts.push({ key, field, base: bv, local: lv, server: sv });
        }
        const beats = mergeBeats(b.beats, l.beats, s.beats);
        merged.beats = beats.beats;
        if (beats.conflict)
            conflicts.push({
                key,
                field: 'beats',
                base: b.beats,
                local: l.beats,
                server: s.beats,
            });
        rows.push(merged);
    }
    const bs = shape(base),
        ls = shape(local),
        ss = shape(server);
    const preference = equal(ls, bs) ? ss : ls;
    if (!equal(ls, ss) && !equal(ls, bs) && !equal(ss, bs))
        conflicts.push({
            key: '__tree__',
            field: 'structure',
            base: bs,
            local: ls,
            server: ss,
        });
    if (options.ambiguous) {
        const newServer = server.filter((r) => !bm.has(r.key));
        for (const row of local.filter((r) => r.sectionId === null)) {
            if (newServer.length)
                conflicts.push({
                    key: row.key,
                    field: 'created',
                    base: null,
                    local: row,
                    server: newServer,
                });
        }
    }
    return { rows: orderOutlineRows(rows, preference), conflicts };
}

export function resolveOutlineMerge(
    result: OutlineMergeResult,
    choices: Record<string, string>,
): OutlineRow[] {
    let rows = result.rows.map((r) => ({ ...r }));
    let preference = shape(rows);
    result.conflicts.forEach((conflict, index) => {
        const choice = choices[String(index)];
        if (!choice) throw new Error('Unresolved outline conflict');
        const value = choice === 'server' ? conflict.server : conflict.local;
        if (conflict.field === 'structure')
            preference = value as typeof preference;
        else if (conflict.field === 'deleted') {
            rows = rows.filter((r) => r.key !== conflict.key);
            if (value) {
                const row = value as OutlineRow;
                rows.push(
                    conflict.server === null
                        ? {
                              ...row,
                              sectionId: null,
                              tempId: row.key,
                              slug: null,
                          }
                        : row,
                );
            }
        } else if (conflict.field === 'created') {
            if (choice !== 'separate') {
                const match = (conflict.server as OutlineRow[]).find(
                    (r) => String(r.sectionId) === choice,
                );
                if (!match)
                    throw new Error('Choose the corresponding saved section');
                rows = rows
                    .filter((r) => r.key !== match.key)
                    .map((r) =>
                        r.key === conflict.key
                            ? {
                                  ...r,
                                  sectionId: match.sectionId,
                                  tempId: null,
                                  slug: match.slug,
                              }
                            : r.parentKey === match.key
                              ? { ...r, parentKey: conflict.key }
                              : r,
                    );
                preference = preference
                    .filter((r) => r.key !== match.key)
                    .map((r) =>
                        r.parentKey === match.key
                            ? { ...r, parentKey: conflict.key }
                            : r,
                    );
            }
        } else
            rows = rows.map((r) =>
                r.key === conflict.key ? { ...r, [conflict.field]: value } : r,
            );
    });
    return orderOutlineRows(rows, preference);
}
