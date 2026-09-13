import {
    createThreadHighlightsPlugin,
    setThreadHighlights,
    threadHighlightsKey,
} from '@alexandria/editor/extensions/threadHighlights';
import useT from '@alexandria/hooks/useT';
import type { Editor } from '@tiptap/core';
import { createContext, createElement, useContext, useEffect } from 'react';
import { fetchThreads } from './threadApi';
import type { PatternThread } from './threadApi';
import {
    THREAD_HIGHLIGHTS_CHANGED,
    THREAD_HIGHLIGHT_OPEN,
} from './threadHighlightEvents';
import type { ThreadHighlightOpen } from './threadHighlightEvents';
import ThreadHighlightTooltip from './ThreadHighlightTooltip';

export const ThreadHighlightContext = createContext<{
    projectSlug: string;
    sectionId: number;
} | null>(null);

/** Per-editor loading also covers inactive scenes in continuous manuscript view. */
export function useThreadHighlights(editor: Editor | null) {
    const context = useContext(ThreadHighlightContext);
    const projectSlug = context?.projectSlug;
    const sectionId = context?.sectionId;
    const t = useT();

    useEffect(() => {
        if (
            !editor ||
            editor.isDestroyed ||
            !projectSlug ||
            sectionId === undefined
        ) {
            return;
        }

        let cancelled = false;
        let request = 0;
        let threads: PatternThread[] = [];
        editor.registerPlugin(
            createThreadHighlightsPlugin((ids) => {
                const detail: ThreadHighlightOpen = {
                    projectSlug,
                    sectionId,
                    threads: threads
                        .filter((thread) => ids.includes(thread.id))
                        .map(({ id, title }) => ({ id, title })),
                };
                window.dispatchEvent(
                    new CustomEvent(THREAD_HIGHLIGHT_OPEN, { detail }),
                );
            }),
        );

        async function load() {
            const version = ++request;
            const result = await fetchThreads(projectSlug!, { sectionId });

            if (
                cancelled ||
                editor!.isDestroyed ||
                version !== request ||
                result === null
            ) {
                return;
            }

            threads = result;
            setThreadHighlights(
                editor!,
                result.flatMap((thread) =>
                    (thread.marks ?? [])
                        .filter(
                            (mark) =>
                                mark.work_section_id === sectionId &&
                                Boolean(mark.anchor_text),
                        )
                        .map((mark) => ({
                            id: mark.id,
                            threadId: thread.id,
                            anchorText: mark.anchor_text!,
                            offsetHint: mark.anchor_offset_hint ?? 0,
                            title: thread.title,
                            category: thread.card_name,
                            role: t(`writing.threads.role_${mark.role}`),
                        })),
                ),
            );
        }

        function changed(event: Event) {
            if (
                (event as CustomEvent<{ projectSlug: string }>).detail
                    ?.projectSlug === projectSlug
            ) {
                void load();
            }
        }
        void load();
        window.addEventListener(THREAD_HIGHLIGHTS_CHANGED, changed);
        window.addEventListener('focus', load);

        return () => {
            cancelled = true;
            window.removeEventListener(THREAD_HIGHLIGHTS_CHANGED, changed);
            window.removeEventListener('focus', load);

            if (!editor.isDestroyed) {
                editor.unregisterPlugin(threadHighlightsKey);
            }
        };
    }, [editor, projectSlug, sectionId, t]);

    return context && editor && !editor.isDestroyed
        ? createElement(ThreadHighlightTooltip, {
              editor,
              key: `${projectSlug}:${sectionId}`,
          })
        : null;
}
