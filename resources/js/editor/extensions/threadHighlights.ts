import type { Editor } from '@tiptap/core';
import { isHistoryTransaction } from '@tiptap/pm/history';
import type { Node } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { findThreadAnchor } from './threadHighlightAnchors';

export interface ThreadHighlight {
    id: number;
    threadId: number;
    anchorText: string;
    offsetHint: number;
    title: string;
    category: string;
    role: string;
}
interface TrackedHighlight extends ThreadHighlight {
    range: { from: number; to: number } | null;
    /** Snapshot the edited wording for undo without changing the saved quote. */
    deletedText?: string;
}
export const threadHighlightsKey = new PluginKey<TrackedHighlight[]>(
    'threadHighlights',
);

function decorations(doc: Node, highlights: TrackedHighlight[]): DecorationSet {
    const live = highlights.filter(
        (item) => item.range && item.range.from < item.range.to,
    );
    const boundaries = [
        ...new Set(live.flatMap((item) => [item.range!.from, item.range!.to])),
    ].sort((a, b) => a - b);
    const spans: Decoration[] = [];

    for (let i = 0; i < boundaries.length - 1; i++) {
        const from = boundaries[i];
        const to = boundaries[i + 1];
        const overlapping = live.filter(
            (item) => item.range!.from <= from && item.range!.to >= to,
        );

        if (!overlapping.length) {
            continue;
        }

        const ids = [...new Set(overlapping.map((item) => item.threadId))];
        const label = overlapping
            .map((item) => `${item.title}: ${item.category}, ${item.role}`)
            .join('\n');
        spans.push(
            Decoration.inline(from, to, {
                class: 'writing-thread-highlight',
                'data-thread-highlight': ids.join(','),
                'data-thread-marks': overlapping
                    .map((item) => item.id)
                    .join(','),
                'aria-label': label,
                role: 'button',
                tabindex: '0',
            }),
        );
    }

    return DecorationSet.create(doc, spans);
}

export function createThreadHighlightsPlugin(
    onOpen: (threadIds: number[]) => void,
): Plugin<TrackedHighlight[]> {
    function open(target: EventTarget | null): boolean {
        const span =
            target instanceof Element
                ? target.closest('[data-thread-highlight]')
                : null;

        if (!span) {
            return false;
        }

        const ids = (span.getAttribute('data-thread-highlight') ?? '')
            .split(',')
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0);

        if (!ids.length) {
            return false;
        }

        onOpen(ids);

        return true;
    }

    return new Plugin<TrackedHighlight[]>({
        key: threadHighlightsKey,
        state: {
            init: () => [],
            apply(tr, previous) {
                const incoming = tr.getMeta(threadHighlightsKey) as
                    | ThreadHighlight[]
                    | undefined;

                if (incoming) {
                    return incoming.map((item) => {
                        const existing = previous.find(
                            (old) =>
                                old.id === item.id &&
                                old.anchorText === item.anchorText &&
                                old.offsetHint === item.offsetHint,
                        );

                        return {
                            ...item,
                            deletedText: existing?.deletedText,
                            range: existing
                                ? existing.range
                                : findThreadAnchor(
                                      tr.doc,
                                      item.anchorText,
                                      item.offsetHint,
                                  ),
                        };
                    });
                }

                if (!tr.docChanged) {
                    return previous;
                }

                return previous.map((item) => {
                    if (!item.range) {
                        return item;
                    }

                    const collapsed = item.range.from === item.range.to;
                    const restoreText = item.deletedText ?? item.anchorText;

                    if (collapsed && isHistoryTransaction(tr)) {
                        const candidate =
                            findThreadAnchor(
                                tr.doc,
                                restoreText,
                                item.range.from,
                            ) ??
                            findThreadAnchor(
                                tr.doc,
                                item.anchorText,
                                item.offsetHint,
                            );
                        const inverse = tr.mapping.invert();

                        if (
                            candidate &&
                            (inverse.mapResult(candidate.from, 1).deleted ||
                                inverse.mapResult(candidate.to, -1).deleted)
                        ) {
                            return {
                                ...item,
                                range: candidate,
                                deletedText: undefined,
                            };
                        }
                    }

                    const from = tr.mapping.map(
                        item.range.from,
                        collapsed ? -1 : 1,
                    );
                    const to = Math.max(
                        from,
                        tr.mapping.map(item.range.to, collapsed ? 1 : -1),
                    );
                    // Keep a deleted anchor at its mapped position, so undo can
                    // restore it without jumping to a repeated phrase elsewhere.
                    const restored =
                        !collapsed ||
                        tr.doc.textBetween(from, to, ' ') === restoreText;

                    return {
                        ...item,
                        range: { from, to: restored ? to : from },
                        deletedText:
                            !collapsed && from === to
                                ? tr.before.textBetween(
                                      item.range.from,
                                      item.range.to,
                                      ' ',
                                  )
                                : collapsed && !restored
                                  ? item.deletedText
                                  : undefined,
                    };
                });
            },
        },
        props: {
            decorations: (state) =>
                decorations(
                    state.doc,
                    threadHighlightsKey.getState(state) ?? [],
                ),
            handleClick(view, _pos, event) {
                if (
                    !view.state.selection.empty ||
                    event.detail > 1 ||
                    event.ctrlKey ||
                    event.metaKey ||
                    event.shiftKey ||
                    event.altKey
                ) {
                    return false;
                }

                return open(event.target);
            },
            handleDOMEvents: {
                keydown(_view, event) {
                    if (
                        (event.key === 'Enter' || event.key === ' ') &&
                        open(event.target)
                    ) {
                        event.preventDefault();

                        return true;
                    }

                    return false;
                },
            },
        },
    });
}

export function setThreadHighlights(
    editor: Editor,
    highlights: ThreadHighlight[],
): void {
    if (editor.isDestroyed || !threadHighlightsKey.getState(editor.state)) {
        return;
    }

    editor.view.dispatch(
        editor.state.tr
            .setMeta(threadHighlightsKey, highlights)
            .setMeta('addToHistory', false),
    );
}
