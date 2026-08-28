import { useEffect, useMemo, useState, type Ref } from 'react';

import RichTextEditor from '@alexandria/components/editor/RichTextEditor';

import type { ScreenplaySceneLink } from '@alexandria/editor/screenplay/sceneLinks';
import PlanBlock from '../Outline/PlanBlock';
import { readPageDisplay, type PageDisplayMode } from '../pageDisplay';
import type { CurrentSection } from '../Workspace';
import type { WritingEditorBridge } from '../ribbon/writingRibbonContext';
import SectionChrome from './SectionChrome';
import { extractSectionOutline, type SectionOutlineItem } from './sectionOutline';
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
     * Ghost layer visibility — the outline-mode Task 6 plan block
     * (synopsis + beat checklist) rendered above the editor. Owned by
     * the Workspace the same way printLayout is; omitted (falsy)
     * mounts in FlowSection deliberately leave it out here since
     * FlowSection renders its own PlanBlock once, above the whole row.
     */
    showPlan?: boolean;
    /**
     * How a page boundary is drawn in print layout ('tight' | 'pages').
     * Same ownership story as printLayout: the Workspace passes it,
     * standalone mounts fall back to the stored preference.
     */
    pageDisplay?: PageDisplayMode;
    /** Side margin in proportional inches (ruler-draggable). */
    marginXIn?: number;
    /**
     * Editor chrome forwarded to RichTextEditor — the Workspace passes
     * 'none' once the ribbon owns the controls (Task 3). Ignored by
     * ScreenplayEditor (its toolbar is already gone).
     */
    chrome?: 'full' | 'none';
    /**
     * Who owns the scroll. `'self'` (default) keeps today's behavior —
     * the editor bounds itself to the pane and scrolls internally.
     * `'parent'` renders the surface non-scrolling and content-tall so
     * a stacked container (the continuous-flow scene stack) can own one
     * scrollport across many sections; manuscript rulers are suppressed
     * in that mode, page-break guides stay.
     */
    scrollMode?: 'self' | 'parent';
    /** Ribbon editor bridge — commands + capability queries (Ribbon Plan 2). */
    bridgeRef?: Ref<WritingEditorBridge>;
    /** Editor selection/content tick — the Workspace bumps `editorTick`. */
    onStateChange?: () => void;
    onOutlineChange?: (outline: SectionOutlineItem[]) => void;
    onSceneLinksChange?: (links: ScreenplaySceneLink[]) => void;
    onEntryLinkSelect?: () => void;
    /** Enable the floating "Add comment" affordance (Stage 11.5 Task 3). */
    enableComments?: boolean;
    /** Fires with selected range + snapshotted text when the user clicks "Add comment". */
    onAddComment?: (anchor: { from: number; to: number; text: string }) => void;
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
    showPlan,
    pageDisplay,
    marginXIn,
    chrome,
    scrollMode = 'self',
    bridgeRef,
    onStateChange,
    onOutlineChange,
    enableComments,
    onAddComment,
}: ManuscriptEditorProps) {
    const { noteChange, initialContent } =
        useSectionAutosave({ projectSlug, workSlug, section, onCounts });
    const [content, setContent] = useState(initialContent);

    // Read the stored preference ONCE (a function-call prop default
    // would re-read localStorage every render). The `??` fallback keeps
    // the editor self-sufficient until the Workspace passes the prop.
    const storedPrintLayout = useMemo(readPrintLayoutPreference, []);
    const effectivePrintLayout = printLayout ?? storedPrintLayout;
    const storedPageDisplay = useMemo(readPageDisplay, []);
    const effectivePageDisplay = pageDisplay ?? storedPageDisplay;

    function handleChange(wiki: string) {
        setContent(wiki);
        onOutlineChange?.(extractSectionOutline(wiki));
        noteChange(wiki);
    }

    // Reset local editor state on section switch (the autosave hook
    // resets its own state — and flushes the outgoing section's
    // pending save — on the same id change).
    useEffect(() => {
        setContent(section.content ?? '');
        onOutlineChange?.(extractSectionOutline(section.content));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section.id]);

    return (
        <SectionChrome>
            {showPlan && (
                <PlanBlock
                    section={section}
                    projectSlug={projectSlug}
                    workSlug={workSlug}
                    canUpdate={canUpdate}
                />
            )}

            {/* Manuscript — the editor's content wrapper scrolls */}
            {canUpdate ? (
                <RichTextEditor
                    key={section.id}
                    variant="manuscript"
                    /* In parent-scroll mode the surface must grow to
                       content height — a bounded `flex-1` here would
                       fight the stacked container that owns the scroll. */
                    className={scrollMode === 'self' ? 'min-h-0 flex-1' : undefined}
                    value={content}
                    onChange={handleChange}
                    onImmediateChange={(wiki) => onOutlineChange?.(extractSectionOutline(wiki))}
                    tier="pro"
                    enableEntryLinks
                    enableMentions={false}
                    projectId={projectId}
                    maxLength={0}
                    printLayout={effectivePrintLayout}
                    pageDisplay={effectivePageDisplay}
                    marginXIn={marginXIn}
                    chrome={chrome}
                    scrollMode={scrollMode}
                    bridgeRef={bridgeRef}
                    onStateChange={onStateChange}
                    enableComments={enableComments}
                    onAddComment={onAddComment}
                />
            ) : (
                <div
                    className={
                        scrollMode === 'self'
                            ? 'writing-workspace-scroll min-h-0 flex-1 overflow-y-auto'
                            : undefined
                    }
                >
                    <pre className="mx-auto w-full max-w-3xl px-6 pt-10 pb-[40vh] font-sans text-sm leading-relaxed whitespace-pre-wrap">
                        {content}
                    </pre>
                </div>
            )}
        </SectionChrome>
    );
}
