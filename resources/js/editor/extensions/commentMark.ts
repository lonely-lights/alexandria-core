import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const COMMENT_MARK_PLUGIN_KEY = new PluginKey('alexandriaCommentMark');

/**
 * TipTap mark for anchored comments — Stage 11.5 Task 3.
 *
 * Renders as <mark class="comment-mark" data-comment-id="N">…</mark>.
 * Clicking a marked span dispatches 'alexandria:comment-anchor-click' on
 * window so CommentRail can highlight the matching card and scroll to it.
 *
 * Marks live in TipTap's undo history (session-only in v1; anchor
 * persistence across page reloads deferred — the wiki serializer has no
 * comment-mark syntax). Orphaned comment rows — those whose commentId has
 * no live mark in the current doc — simply don't render in the rail; the
 * server row is retained for future re-anchoring.
 */
export const CommentMark = Mark.create({
    name: 'comment',

    addAttributes() {
        return {
            commentId: {
                default: null,
                parseHTML: (element) => {
                    const raw = element.getAttribute('data-comment-id');
                    if (raw === null) return null;
                    const id = Number.parseInt(raw, 10);
                    return Number.isFinite(id) ? id : null;
                },
                renderHTML: (attributes) => {
                    if (attributes.commentId === null || attributes.commentId === undefined) {
                        return {};
                    }
                    return { 'data-comment-id': String(attributes.commentId) };
                },
            },
        };
    },

    parseHTML() {
        return [{ tag: 'mark.comment-mark' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['mark', mergeAttributes({ class: 'comment-mark' }, HTMLAttributes), 0];
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: COMMENT_MARK_PLUGIN_KEY,
                props: {
                    handleClick(_view, _pos, event) {
                        const target = event.target as Element | null;
                        if (!target) return false;

                        const markEl = target.closest('mark.comment-mark');
                        if (!markEl) return false;

                        const raw = markEl.getAttribute('data-comment-id');
                        if (raw === null) return false;

                        const commentId = Number.parseInt(raw, 10);
                        if (!Number.isFinite(commentId)) return false;

                        window.dispatchEvent(
                            new CustomEvent('alexandria:comment-anchor-click', {
                                detail: { commentId },
                            }),
                        );

                        // Return false: don't consume — cursor positioning still works.
                        return false;
                    },
                },
            }),
        ];
    },
});
