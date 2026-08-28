/**
 * Outline paste parser — spec 2026-08-28 outline-mode Task 4.
 *
 * Turns a pasted plain-text outline (from a notes app, a doc, a plan)
 * into flat `{ depth, title, synopsis }` lines the outline view can
 * insert as rows. Pure and defensive — arbitrary pasted text must never
 * throw, it should just produce the best-effort reading of each line.
 */

/** One line of a pasted outline, before it becomes an `OutlineRow`. */
export interface ParsedOutlineLine {
    depth: number;
    title: string;
    synopsis: string | null;
}

/** Leading `- ` / `* ` list markers, stripped after de-indenting. */
const LIST_MARKER = /^[-*]\s+/;

/**
 * The first space-dash-space (hyphen, en dash, or em dash) in a line
 * splits title from synopsis. Bare hyphens inside a word (`Twelve-cycle`)
 * never match — both sides require a surrounding space.
 */
const SYNOPSIS_SPLIT = / (—|–|-) /;

/**
 * Parse a block of pasted text into outline lines.
 *
 * Blank/whitespace-only lines are skipped. Depth comes from leading
 * tabs (one tab = one depth level) or, absent tabs, from leading
 * 2-space groups (`floor(leadingSpaces / 2)`). List markers are
 * stripped once the indentation is removed. The synopsis is whatever
 * follows the first qualifying dash split, trimmed; an empty synopsis
 * becomes `null`.
 */
export function parseOutlinePaste(text: string): ParsedOutlineLine[] {
    const lines: ParsedOutlineLine[] = [];

    for (const rawLine of text.split('\n')) {
        if (rawLine.trim() === '') {
            continue;
        }

        const leadingMatch = rawLine.match(/^[\t ]*/);
        const leading = leadingMatch ? leadingMatch[0] : '';
        const tabCount = (leading.match(/\t/g) ?? []).length;
        const depth = tabCount > 0 ? tabCount : Math.floor(leading.length / 2);

        const content = rawLine
            .slice(leading.length)
            .replace(LIST_MARKER, '')
            .trim();

        if (content === '') {
            continue;
        }

        const splitMatch = content.match(SYNOPSIS_SPLIT);

        if (splitMatch === null || splitMatch.index === undefined) {
            lines.push({ depth, title: content, synopsis: null });
            continue;
        }

        const title = content.slice(0, splitMatch.index).trim();
        const synopsisText = content
            .slice(splitMatch.index + splitMatch[0].length)
            .trim();

        lines.push({
            depth,
            title,
            synopsis: synopsisText === '' ? null : synopsisText,
        });
    }

    return lines;
}
