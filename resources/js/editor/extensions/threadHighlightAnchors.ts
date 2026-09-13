import type { Node } from '@tiptap/pm/model';

/** Match the same space-separated text captured by the selection bubble. */
export function findThreadAnchor(
    doc: Node,
    quote: string,
    hint: number,
): { from: number; to: number } | null {
    if (!quote) {
        return null;
    }

    let text = '';
    const positions: Array<number | null> = [];
    let blocks = 0;
    doc.descendants((node, pos) => {
        if (node.isTextblock && blocks++ > 0) {
            text += ' ';
            positions.push(null);
        }

        if (node.isText && node.text) {
            text += node.text;

            for (let i = 0; i < node.text.length; i++) {
                positions.push(pos + i);
            }
        }
    });
    let best: { from: number; to: number } | null = null;
    let offset = text.indexOf(quote);

    while (offset !== -1) {
        const from = positions[offset];
        const end = positions[offset + quote.length - 1];

        if (
            from != null &&
            end != null &&
            (!best || Math.abs(from - hint) < Math.abs(best.from - hint))
        ) {
            best = { from, to: end + 1 };
        }

        offset = text.indexOf(quote, offset + 1);
    }

    return best;
}
