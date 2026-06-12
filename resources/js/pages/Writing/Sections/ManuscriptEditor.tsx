import { useEffect, useMemo, useState, type Ref } from 'react';

import RichTextEditor from '@alexandria/components/editor/RichTextEditor';

import type { CurrentSection } from '../Workspace';
import type { WritingEditorBridge } from '../ribbon/writingRibbonContext';
import SectionChrome from './SectionChrome';
import useSectionAutosave, { type SectionCountsCallback } from './useSectionAutosave';

/**
 * Workspace manuscript editor — Stage 8g.1 (Plan 2 Task 7).
 *
 * The center pane: a RichTextEditor wired to debounced JSON autosave
 * (PUT .../sections/{id}/content) via the shared useSectionAutosave
 * hook, wrapped in the shared SectionChrome (identity strip with
 * inline title + save status). Server-confirmed word/page counts flow
 * back up through `onCounts` so the workspace status bar + Navigator
 * rows stay live without an Inertia round-trip. Switching sections (or
 * unmounting) flushes any pending save for the outgoing section before
 * state resets.
 *
 * Ribbon Plan 2: the editor is headless-capable — `bridgeRef` exposes
 * the WritingEditorBridge, `onStateChange` ticks the workspace, and
 * `printLayout` is owned by the Workspace (which also owns the ruler
 * toggle via the ribbon's View group).
 */

export interface ManuscriptEditorProps {
    projectId: number;
    projectSlug: string;
    workSlug: string;
    section: CurrentSection;
    canUpdate: boolean;
    onCounts: SectionCountsCallback;
    /**
     * Word-style print layout — lifted to the Workspace (Ribbon Plan 2
     * Task 3 always passes it, persisting through the exported storage
     * helpers below). When omitted, the editor falls back to the
     * stored preference read once on mount, so standalone mounts keep
     * today's behavior.
     */
    printLayout?: boolean;
    /**
     * Editor chrome forwarded to RichTextEditor — the Workspace passes
     * 'none' once the ribbon owns the controls (Task 3). Ignored by
     * ScreenplayEditor (its toolbar is already gone).
     */
    chrome?: 'full' | 'none';
    /** Ribbon editor bridge — commands + capability queries (Ribbon Plan 2). */
    bridgeRef?: Ref<WritingEditorBridge>;
    /** Editor selection/content tick — the Workspace bumps `editorTick`. */
    onStateChange?: () => void;
}

export const PRINT_LAYOUT_STORAGE_KEY = 'alexandria.writing.print_layout';

/** Read the persisted print-layout preference once on mount. */
export function readPrintLayoutPreference(): boolean {
    try {
        return localStorage.getItem(PRINT_LAYOUT_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

export default function ManuscriptEditor({
    projectId,
    projectSlug,
    workSlug,
    section,
    canUpdate,
    onCounts,
    printLayout,
    chrome,
    bridgeRef,
    onStateChange,
}: ManuscriptEditorProps) {
    const { status, noteChange, initialContent } =
        useSectionAutosave({ projectSlug, workSlug, section, onCounts });
    const [content, setContent] = useState(initialContent);

    // Read the stored preference ONCE (a function-call prop default
    // would re-read localStorage every render). The `??` fallback keeps
    // the editor self-sufficient until the Workspace passes the prop.
    const storedPrintLayout = useMemo(readPrintLayoutPreference, []);
    const effectivePrintLayout = printLayout ?? storedPrintLayout;

    function handleChange(wiki: string) {
        setContent(wiki);
        noteChange(wiki);
    }

    // Reset local editor state on section switch (the autosave hook
    // resets its own state — and flushes the outgoing section's
    // pending save — on the same id change).
    useEffect(() => {
        setContent(section.content ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section.id]);

    return (
        <SectionChrome
            projectSlug={projectSlug}
            workSlug={workSlug}
            section={section}
            canUpdate={canUpdate}
            status={status}
        >
            {/* Manuscript — the editor's content wrapper scrolls */}
            {canUpdate ? (
                <RichTextEditor
                    key={section.id}
                    variant="manuscript"
                    className="min-h-0 flex-1"
                    value={content}
                    onChange={handleChange}
                    tier="pro"
                    enableEntryLinks
                    enableMentions={false}
                    projectId={projectId}
                    maxLength={0}
                    printLayout={effectivePrintLayout}
                    chrome={chrome}
                    bridgeRef={bridgeRef}
                    onStateChange={onStateChange}
                />
            ) : (
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <pre className="mx-auto w-full max-w-3xl px-6 pt-10 pb-[40vh] font-sans text-sm leading-relaxed whitespace-pre-wrap">
                        {content}
                    </pre>
                </div>
            )}
        </SectionChrome>
    );
}
