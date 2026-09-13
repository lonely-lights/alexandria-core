export const THREAD_HIGHLIGHTS_CHANGED = 'alexandria:thread-highlights-changed';
export const THREAD_HIGHLIGHT_OPEN = 'alexandria:thread-highlight-open';

export interface ThreadHighlightOpen {
    projectSlug: string;
    sectionId: number;
    threads: Array<{ id: number; title: string }>;
}

export function notifyThreadHighlightsChanged(projectSlug: string): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent(THREAD_HIGHLIGHTS_CHANGED, {
                detail: { projectSlug },
            }),
        );
    }
}
