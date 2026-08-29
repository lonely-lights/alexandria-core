/**
 * Fetch helpers for the Devices & Tropes HTTP surface — Task 5 (design
 * doc 2026-08-29-devices-tropes-design.md, Task 3's controllers are the
 * source of truth for these shapes). Mirrors revisionApi.ts's idiom:
 * `outlineApiHeaders` supplies the csrf/json headers (imported, not
 * copied), and every call resolves to `null` on any failure so callers
 * keep a single, silent-retry-friendly branch instead of a thrown-error
 * path.
 *
 * Two different "status" shapes exist on the wire — read PatternThreadController
 * closely before touching this file:
 *  - thread rows (index/store/update) flatten status into top-level
 *    `status: 'kept'|'open'` + `unplanted: boolean` fields
 *    ({@see PatternThreadController::threadRow}) — NOT the nested
 *    `{state, unplanted}` shape the design prose describes.
 *  - mark responses (marks.store/update) DO nest it as `thread_status:
 *    {state, unplanted}` ({@see PatternThreadController::storeMark}),
 *    since that's the raw return of `PatternThreadService::status()`.
 *
 * Fix round 1: `PatternThreadController::promises` now maps each
 * group's `scope_type` through the same short-name table every other
 * endpoint uses — `PatternThreadService::promiseGroup` still returns
 * the raw FQCN internally, but the controller normalizes it before the
 * response leaves PHP, so `PromiseGroup.scope_type` is the short
 * `PatternScopeType` union like everywhere else.
 *
 * Task 6 addition: `writing.threads.index`/`store`/`update` never
 * return a thread's FULL mark history — `marks` is only populated when
 * a single `section_id` filters the request (see this file's header
 * note above), and store/update omit it entirely. ThreadDetailModal
 * needs every mark in order to render its marks list, so Task 6 added
 * a dedicated `GET writing.threads.show` endpoint
 * ({@see PatternThreadController::show}) that always returns the
 * thread's complete mark set, each carrying a `section_title` (marks
 * ordered oldest-first by `created_at` — the design doc's "story
 * order" simplified to pin order, since a thread's marks can span
 * different works via Entry scope and there's no single manuscript
 * position to sort by across works).
 */

import { writingUrl } from '@alexandria/lib/urls';

import { outlineApiHeaders } from '../Outline/outlineApi';

export type PatternCardKind = string;

export interface PatternCard {
    id: number;
    name: string;
    slug: string;
    kind: PatternCardKind;
    definition: string;
    craft_guidance: string | null;
    pitfalls: string | null;
    shape: string | null;
    is_seeded: boolean;
    created_at: string;
    updated_at: string;
}

export interface CardInput {
    name: string;
    kind: string;
    definition: string;
    craft_guidance?: string | null;
    pitfalls?: string | null;
    shape?: string | null;
}

export interface CardDeleteResult {
    deleted: true;
    threads_kept: number;
}

/** The wire vocabulary every thread/mark endpoint speaks — short names,
 *  mapped server-side to the real morph FQCNs (see
 *  PatternThreadController::SCOPE_TYPES). */
export type PatternScopeType = 'section' | 'work' | 'entry';

export type PatternStance =
    | 'straight'
    | 'subverted'
    | 'lampshaded'
    | 'inverted'
    | 'averted'
    | 'played_with';

export const PATTERN_STANCES: PatternStance[] = [
    'straight',
    'subverted',
    'lampshaded',
    'inverted',
    'averted',
    'played_with',
];

export type PatternMarkRole = 'setup' | 'develop' | 'payoff';

export interface PatternMark {
    id: number;
    pattern_thread_id: number;
    role: PatternMarkRole;
    work_section_id: number;
    anchor_text: string | null;
    anchor_offset_hint: number | null;
    note: string | null;
    created_at: string;
    updated_at: string;
}

export interface MarkInput {
    role: PatternMarkRole;
    work_section_id: number;
    anchor_text?: string | null;
    anchor_offset_hint?: number | null;
    note?: string | null;
}

/** `PatternThreadService::status()`'s raw return shape — used only for
 *  the mark endpoints' nested `thread_status` field. */
export interface PatternThreadStatus {
    state: 'kept' | 'open';
    unplanted: boolean;
}

export interface MarkResult {
    mark: PatternMark;
    thread_status: PatternThreadStatus;
}

/** One `writing.threads.index/store/update` row. `status`/`unplanted`
 *  are flat fields on the wire (see this file's header note) — not the
 *  nested shape the design doc's prose describes. `marks` is only
 *  populated by `index` when a `section_id` filter narrows the request;
 *  it's absent from store/update responses. */
export interface PatternThread {
    id: number;
    pattern_card_id: number;
    card_name: string;
    title: string;
    stance: PatternStance | null;
    scope_type: PatternScopeType;
    scope_id: number;
    entry_id: number | null;
    notes: string | null;
    status: 'kept' | 'open';
    unplanted: boolean;
    created_at: string;
    updated_at: string;
    marks?: PatternMark[];
}

export interface ThreadInput {
    pattern_card_id: number;
    title: string;
    stance?: PatternStance | null;
    scope_type: PatternScopeType;
    scope_id: number;
    entry_id?: number | null;
    notes?: string | null;
}

export interface ThreadFilters {
    workId?: number;
    sectionId?: number;
    cardId?: number;
    status?: 'open' | 'kept';
}

/** One row of `PatternThreadService::promises()`'s cross-work grouping. */
export interface PromiseThreadRow {
    id: number;
    title: string;
    card_name: string;
    stance: PatternStance | null;
    unplanted: boolean;
    setup_location: string | null;
    created_at: string;
}

export interface PromiseGroup {
    scope_type: PatternScopeType;
    scope_id: number;
    scope_title: string;
    threads: PromiseThreadRow[];
}

/** `GET writing.scope_options` response — the scope picker's "linked
 *  compendium entry" branch: the entry a work is linked to (via
 *  `works.entry_id`), plus its ancestor chain, nearest-first (immediate
 *  parent first, root last) — the order the picker renders them in. */
export interface ScopeOptions {
    work: { id: number; title: string };
    entry: { id: number; name: string } | null;
    entry_ancestors: Array<{ id: number; name: string }>;
}

function threadsQuery(filters: ThreadFilters): string {
    const params = new URLSearchParams();

    if (filters.workId !== undefined) {
        params.set('work_id', String(filters.workId));
    }

    if (filters.sectionId !== undefined) {
        params.set('section_id', String(filters.sectionId));
    }

    if (filters.cardId !== undefined) {
        params.set('card_id', String(filters.cardId));
    }

    if (filters.status !== undefined) {
        params.set('status', filters.status);
    }

    const qs = params.toString();

    return qs === '' ? '' : `?${qs}`;
}

/* ── Cards ── */

export async function fetchCards(projectSlug: string): Promise<PatternCard[] | null> {
    try {
        const response = await fetch(`${writingUrl(projectSlug)}/cards`, {
            credentials: 'same-origin',
            headers: outlineApiHeaders(),
        });

        if (!response.ok) {
            return null;
        }

        const body = (await response.json()) as { cards: PatternCard[] };

        return body.cards;
    } catch {
        return null;
    }
}

export async function createCard(projectSlug: string, input: CardInput): Promise<PatternCard | null> {
    try {
        const response = await fetch(`${writingUrl(projectSlug)}/cards`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: outlineApiHeaders(true),
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            return null;
        }

        const body = (await response.json()) as { card: PatternCard };

        return body.card;
    } catch {
        return null;
    }
}

export async function updateCard(
    projectSlug: string,
    cardId: number,
    input: CardInput,
): Promise<PatternCard | null> {
    try {
        const response = await fetch(`${writingUrl(projectSlug)}/cards/${cardId}`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: outlineApiHeaders(true),
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            return null;
        }

        const body = (await response.json()) as { card: PatternCard };

        return body.card;
    } catch {
        return null;
    }
}

export async function deleteCard(projectSlug: string, cardId: number): Promise<CardDeleteResult | null> {
    try {
        const response = await fetch(`${writingUrl(projectSlug)}/cards/${cardId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: outlineApiHeaders(),
        });

        if (!response.ok) {
            return null;
        }

        return (await response.json()) as CardDeleteResult;
    } catch {
        return null;
    }
}

/* ── Threads ── */

export async function fetchThreads(
    projectSlug: string,
    filters: ThreadFilters = {},
): Promise<PatternThread[] | null> {
    try {
        const response = await fetch(`${writingUrl(projectSlug)}/threads${threadsQuery(filters)}`, {
            credentials: 'same-origin',
            headers: outlineApiHeaders(),
        });

        if (!response.ok) {
            return null;
        }

        const body = (await response.json()) as { threads: PatternThread[] };

        return body.threads;
    } catch {
        return null;
    }
}

export async function createThread(projectSlug: string, input: ThreadInput): Promise<PatternThread | null> {
    try {
        const response = await fetch(`${writingUrl(projectSlug)}/threads`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: outlineApiHeaders(true),
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            return null;
        }

        const body = (await response.json()) as { thread: PatternThread };

        return body.thread;
    } catch {
        return null;
    }
}

/** A mark as returned by `writing.threads.show` — the same wire shape
 *  plus the pinned section's title, since that endpoint spans every
 *  section a thread's marks touch (unlike the `section_id`-filtered
 *  `index` rows, where the caller already knows the one section). */
export interface PatternMarkWithSection extends PatternMark {
    section_title: string;
}

/** `writing.threads.show`'s response shape — a thread row whose `marks`
 *  is always populated (see this file's header note) and ordered by
 *  pin time. */
export interface PatternThreadDetail extends PatternThread {
    marks: PatternMarkWithSection[];
}

export async function fetchThread(
    projectSlug: string,
    threadId: number,
): Promise<PatternThreadDetail | null> {
    try {
        const response = await fetch(`${writingUrl(projectSlug)}/threads/${threadId}`, {
            credentials: 'same-origin',
            headers: outlineApiHeaders(),
        });

        if (!response.ok) {
            return null;
        }

        const body = (await response.json()) as { thread: PatternThreadDetail };

        return body.thread;
    } catch {
        return null;
    }
}

export async function updateThread(
    projectSlug: string,
    threadId: number,
    input: ThreadInput,
): Promise<PatternThread | null> {
    try {
        const response = await fetch(`${writingUrl(projectSlug)}/threads/${threadId}`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: outlineApiHeaders(true),
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            return null;
        }

        const body = (await response.json()) as { thread: PatternThread };

        return body.thread;
    } catch {
        return null;
    }
}

export async function deleteThread(projectSlug: string, threadId: number): Promise<boolean> {
    try {
        const response = await fetch(`${writingUrl(projectSlug)}/threads/${threadId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: outlineApiHeaders(),
        });

        return response.ok;
    } catch {
        return false;
    }
}

/* ── Marks ── */

export async function createMark(
    projectSlug: string,
    threadId: number,
    input: MarkInput,
): Promise<MarkResult | null> {
    try {
        const response = await fetch(`${writingUrl(projectSlug)}/threads/${threadId}/marks`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: outlineApiHeaders(true),
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            return null;
        }

        return (await response.json()) as MarkResult;
    } catch {
        return null;
    }
}

export async function updateMark(
    projectSlug: string,
    markId: number,
    input: MarkInput,
): Promise<MarkResult | null> {
    try {
        const response = await fetch(`${writingUrl(projectSlug)}/marks/${markId}`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: outlineApiHeaders(true),
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            return null;
        }

        return (await response.json()) as MarkResult;
    } catch {
        return null;
    }
}

export async function deleteMark(projectSlug: string, markId: number): Promise<boolean> {
    try {
        const response = await fetch(`${writingUrl(projectSlug)}/marks/${markId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: outlineApiHeaders(),
        });

        return response.ok;
    } catch {
        return false;
    }
}

/* ── Cross-work promises ── */

export async function fetchPromises(projectSlug: string): Promise<PromiseGroup[] | null> {
    try {
        const response = await fetch(`${writingUrl(projectSlug)}/promises`, {
            credentials: 'same-origin',
            headers: outlineApiHeaders(),
        });

        if (!response.ok) {
            return null;
        }

        const body = (await response.json()) as { promises: PromiseGroup[] };

        return body.promises;
    } catch {
        return null;
    }
}

/* ── Scope-picker data (fix round 1) ── */

export async function fetchScopeOptions(projectSlug: string, workId: number): Promise<ScopeOptions | null> {
    try {
        const response = await fetch(
            `${writingUrl(projectSlug)}/scope-options?work_id=${encodeURIComponent(String(workId))}`,
            { credentials: 'same-origin', headers: outlineApiHeaders() },
        );

        if (!response.ok) {
            return null;
        }

        return (await response.json()) as ScopeOptions;
    } catch {
        return null;
    }
}
