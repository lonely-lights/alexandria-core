import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface SearchOptions {
    matchCase: boolean;
    wholeWord: boolean;
}
export interface TextMatch {
    from: number;
    to: number;
}
interface SearchState {
    query: string;
    options: SearchOptions;
    current: number;
}
const empty: SearchState = {
    query: "",
    options: { matchCase: false, wholeWord: false },
    current: 0,
};
const key = new PluginKey<SearchState>("writing-search");

/** Literal, block-local search: inline formatting may split a word, atoms may not. */
export function findWritingMatches(
    doc: Node,
    query: string,
    options: SearchOptions,
): TextMatch[] {
    if (!query || query.includes("\ufffc")) {
        return [];
    }

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = options.wholeWord
        ? `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`
        : escaped;
    const expression = new RegExp(pattern, options.matchCase ? "gu" : "giu");
    const matches: TextMatch[] = [];
    doc.descendants((node, pos) => {
        if (!node.isTextblock) {
            return true;
        }

        let text = "";
        node.forEach((child) => {
            text += child.isText ? child.text : "\ufffc".repeat(child.nodeSize);
        });

        for (const match of text.matchAll(expression)) {
            matches.push({
                from: pos + 1 + match.index,
                to: pos + 1 + match.index + match[0].length,
            });
        }

        return false;
    });

    return matches;
}

export const WritingSearch = Extension.create({
    name: "writingSearch",
    addProseMirrorPlugins() {
        return [
            new Plugin<SearchState>({
                key,
                state: {
                    init: () => empty,
                    apply: (tr, state) => tr.getMeta(key) ?? state,
                },
                props: {
                    decorations(state) {
                        const search = key.getState(state) ?? empty;
                        const matches = findWritingMatches(
                            state.doc,
                            search.query,
                            search.options,
                        );

                        return DecorationSet.create(
                            state.doc,
                            matches.map((match, i) =>
                                Decoration.inline(match.from, match.to, {
                                    class:
                                        i === search.current
                                            ? "writing-search-match writing-search-match--current"
                                            : "writing-search-match",
                                }),
                            ),
                        );
                    },
                },
            }),
        ];
    },
});

export function searchWriting(
    editor: Editor | null,
    query: string,
    options: SearchOptions,
    current = 0,
): TextMatch[] {
    if (!editor || editor.isDestroyed) {
        return [];
    }

    const matches = findWritingMatches(editor.state.doc, query, options);
    const search = {
        query,
        options,
        current: Math.max(0, Math.min(current, matches.length - 1)),
    };
    const previous = key.getState(editor.state);

    // Avoid an editor-tick -> search -> transaction render loop.
    if (
        !previous ||
        previous.query !== query ||
        previous.current !== search.current ||
        previous.options.matchCase !== options.matchCase ||
        previous.options.wholeWord !== options.wholeWord
    ) {
        editor.view.dispatch(
            editor.state.tr.setMeta(key, search).setMeta("addToHistory", false),
        );
    }

    return matches;
}

/** Re-resolve on execution. Replace-all is exactly one undo step and plain text, never HTML. */
export function replaceWriting(
    editor: Editor | null,
    query: string,
    replacement: string,
    options: SearchOptions,
    current?: number,
): number {
    if (!editor || editor.isDestroyed || !editor.isEditable) {
        return 0;
    }

    const matches = findWritingMatches(editor.state.doc, query, options);
    const targets =
        current === undefined ? matches : matches.slice(current, current + 1);

    if (!targets.length) {
        return 0;
    }

    const tr = closeHistory(editor.state.tr);

    for (const match of [...targets].reverse()) {
        tr.insertText(replacement, match.from, match.to);
    }

    editor.view.dispatch(tr);
    editor.view.dispatch(closeHistory(editor.state.tr));

    return targets.length;
}

export function selectWritingMatch(
    editor: Editor | null,
    match: TextMatch,
): void {
    if (
        !editor ||
        editor.isDestroyed ||
        match.to > editor.state.doc.content.size
    ) {
        return;
    }

    editor.view.dispatch(
        editor.state.tr
            .setSelection(
                TextSelection.create(editor.state.doc, match.from, match.to),
            )
            .scrollIntoView()
            .setMeta("addToHistory", false),
    );
}
