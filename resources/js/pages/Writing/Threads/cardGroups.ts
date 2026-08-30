import type { PatternCard } from './threadApi';

/**
 * Group a card list by kind, kinds sorted alphabetically — the shared
 * shape behind the library page's sections and the mark-thread dialog's
 * grouped card select. Accepts null so callers can pass not-yet-loaded
 * state without guarding.
 */
export function groupCardsByKind(cards: PatternCard[] | null): [string, PatternCard[]][] {
    const groups = new Map<string, PatternCard[]>();

    for (const card of cards ?? []) {
        const list = groups.get(card.kind) ?? [];
        list.push(card);
        groups.set(card.kind, list);
    }

    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}
