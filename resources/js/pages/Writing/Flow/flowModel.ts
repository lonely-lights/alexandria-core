/**
 * Flow model helpers — spec 2026-08-08 continuous-manuscript-scene-flow.
 *
 * The continuous view renders one long scroll of every section in a work.
 * Two things have to happen before a single pixel is drawn:
 *
 *  1. the nested `SectionNode` tree becomes a flat, render-order list, and
 *  2. each not-yet-loaded section reserves a plausible amount of vertical
 *     space so the scrollbar is honest and lazy hydration doesn't make the
 *     page jump under the reader.
 *
 * Both are pure functions of data the server already sends, so Vitest can
 * cover them without a DOM or React runtime.
 */

import type { SectionNode } from '../Workspace';

/** A section positioned in the flat render order of the flow. */
export interface FlatSection {
    node: SectionNode;
    /** 0 for roots, +1 per level of nesting. */
    depth: number;
    /** True when the node has children (a part/chapter, not a leaf scene). */
    isContainer: boolean;
}

/**
 * Words that fit on one rendered line. Prose runs wider than screenplay,
 * whose fixed 12pt Courier measure and dialogue gutters cost vertical space.
 */
export const PROSE_WORDS_PER_LINE = 11;
export const SCREENPLAY_WORDS_PER_LINE = 7;

/** Rendered line box, in px. */
export const LINE_HEIGHT_PX = 28;

/** Heading, rule, and padding around one section's body, in px. */
export const SECTION_CHROME_PX = 96;

/** Floor for a placeholder so empty sections stay clickable targets. */
export const MIN_PLACEHOLDER_PX = 120;

/**
 * Flatten the section tree depth-first into render order.
 *
 * Children are walked in array order — the server pre-sorts siblings by
 * `position`, so re-sorting here would only risk disagreeing with it.
 * Nodes are passed through by reference, not cloned, so callers can key
 * React elements off identity.
 */
export function flattenTree(sections: SectionNode[]): FlatSection[] {
    const flat: FlatSection[] = [];

    const walk = (nodes: SectionNode[], depth: number): void => {
        for (const node of nodes) {
            const children = node.children ?? [];

            flat.push({ node, depth, isContainer: children.length > 0 });

            if (children.length > 0) {
                walk(children, depth + 1);
            }
        }
    };

    walk(sections, 0);

    return flat;
}

/**
 * Estimate the height a section's body will occupy once loaded, in px.
 *
 * Deliberately coarse: it only has to be close enough that the scrollbar
 * doesn't lurch when real content replaces the placeholder. Negative or
 * absent word counts collapse to the floor rather than a negative height.
 */
export function estimatePlaceholderHeight(
    wordCount: number,
    format: 'prose' | 'screenplay',
): number {
    const wordsPerLine =
        format === 'screenplay'
            ? SCREENPLAY_WORDS_PER_LINE
            : PROSE_WORDS_PER_LINE;

    const words = Number.isFinite(wordCount) ? Math.max(0, wordCount) : 0;
    const lines = Math.ceil(words / wordsPerLine);

    return Math.max(
        MIN_PLACEHOLDER_PX,
        lines * LINE_HEIGHT_PX + SECTION_CHROME_PX,
    );
}
