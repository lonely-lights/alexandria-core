interface ListItem {
    text: string;
    children: WikiList[];
}

interface WikiList {
    marker: string;
    items: ListItem[];
}

/** Mixed marker paths preserve the parent type: *# means numbered under bullet. */
export function parseWikiLists(text: string): string {
    const output: string[] = [];
    let roots: WikiList[] = [];
    let stack: WikiList[] = [];

    const render = (list: WikiList): string => {
        const tag = list.marker === '*' ? 'ul' : 'ol';

        return `<${tag}>${list.items.map((item) => `<li>${item.text}${item.children.map(render).join('')}</li>`).join('')}</${tag}>`;
    };
    const flush = () => {
        if (roots.length) {
            output.push(roots.map(render).join('\n'));
            roots = [];
            stack = [];
        }
    };

    for (const line of text.split('\n')) {
        const match = line.match(/^([*#]+)[ \t]+(.*)$/);

        if (!match) {
            flush();
            output.push(line);
            continue;
        }

        const markers = match[1].slice(0, 32);
        let common = 0;

        while (
            common < markers.length &&
            common < stack.length &&
            stack[common].marker === markers[common]
        ) {
            common++;
        }

        stack = stack.slice(0, common);

        // Normalize skipped levels rather than inventing empty parent items.
        if (common < markers.length) {
            const list: WikiList = { marker: markers[common], items: [] };
            const parent = stack.at(-1)?.items.at(-1);
            (parent?.children ?? roots).push(list);
            stack.push(list);
        }

        stack.at(-1)!.items.push({ text: match[2], children: [] });
    }

    flush();

    return output.join('\n');
}
