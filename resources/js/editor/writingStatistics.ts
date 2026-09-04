import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';

export interface TextStatistics {
    words: number;
    characters: number;
    charactersWithoutSpaces: number;
    paragraphs: number;
}

export interface WritingStatistics {
    section: TextStatistics;
    selection: TextStatistics | null;
}

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function visibleLeaf(node: PMNode): string {
    return node.type.name === 'mention'
        ? String(node.attrs.label ?? node.attrs.id ?? '')
        : '\n';
}

/** Visible characters, not UTF-16 units or URLs hidden behind linked text. */
export function measureText(
    doc: PMNode,
    from = 0,
    to = doc.content.size,
): TextStatistics {
    const text = doc.textBetween(from, to, '\n', visibleLeaf);
    const characters = (value: string) =>
        Array.from(segmenter.segment(value)).length;
    let paragraphs = 0;
    doc.nodesBetween(from, to, (node, pos) => {
        if (node.isTextblock) {
            const start = Math.max(0, from - pos - 1);
            const end = Math.min(node.content.size, to - pos - 1);

            if (
                end > start &&
                node.textBetween(start, end, '\n', visibleLeaf).trim()
            ) {
                paragraphs++;
            }
        }
    });

    return {
        words: text.split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word))
            .length,
        characters: characters(text.replace(/[\r\n]/g, '')),
        charactersWithoutSpaces: characters(text.replace(/\s/gu, '')),
        paragraphs,
    };
}

export function writingStatistics(
    editor: Editor | null,
): WritingStatistics | null {
    if (!editor || editor.isDestroyed) {
        return null;
    }

    const { doc, selection } = editor.state;

    return {
        section: measureText(doc),
        selection: selection.empty
            ? null
            : measureText(doc, selection.from, selection.to),
    };
}
