import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import type { ScreenplaySceneLink } from '@alexandria/editor/screenplay/sceneLinks';

import ManuscriptEditor from '../Sections/ManuscriptEditor';
import ScreenplayEditor from '../Sections/ScreenplayEditor';
import type { PageDisplayMode } from '../pageDisplay';
import type { SectionOutlineItem } from '../Sections/sectionOutline';
import type { SectionCountsCallback } from '../Sections/useSectionAutosave';
import type { CurrentSection } from '../Workspace';
import type { WritingEditorBridge } from '../ribbon/writingRibbonContext';
import { estimatePlaceholderHeight, type FlatSection } from './flowModel';

/**
 * One row of the continuous manuscript flow — spec 2026-08-08.
 *
 * Every section in the work gets exactly one of these, hydrated or
 * not, and the wrapper element is the SAME element in both states so
 * the browser's scroll anchoring has something stable to hold onto
 * while content streams in underneath the reader.
 *
 * Three body states:
 *
 *  - **placeholder** — no content fetched yet; reserves an estimated
 *    height so the scrollbar stays honest,
 *  - **editor** — the real ManuscriptEditor/ScreenplayEditor in
 *    `scrollMode="parent"` (content-tall, no inner scrollport, rulers
 *    suppressed) so the stack above owns one scrollport for the book,
 *  - **ghost** — a hydrated but empty section, whose "Begin writing…"
 *    line is the affordance that mounts the editor on click. An empty
 *    ProseMirror in parent-scroll mode collapses to nothing, so
 *    without the ghost there would be no target to click.
 *
 * Above the body sits the typeset break: containers print their
 * heading, leaves print a centered ornament. Those strings are DATA
 * (the writer's own titles and labels), so they carry no lang key.
 */

/** Normalize a work's free-form format string to the two editor families. */
export function guessFormat(format: string): 'prose' | 'screenplay' {
    return format === 'screenplay' ? 'screenplay' : 'prose';
}

/** Min height for a just-engaged empty editor, so it stays clickable. */
const ENGAGED_MIN_HEIGHT_PX = 280;

const mutedText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const headingText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 85%, transparent)',
};

/* Scene-break ornament: two hairlines fading out toward the margins so
   the feather sits in the composition rather than on a ruled line. */
const ORNAMENT_RULE_INK = 'color-mix(in srgb, var(--theme-base-content) 25%, transparent)';

const ornamentRuleLeft: CSSProperties = {
    background: `linear-gradient(to right, transparent, ${ORNAMENT_RULE_INK})`,
};

const ornamentRuleRight: CSSProperties = {
    background: `linear-gradient(to left, transparent, ${ORNAMENT_RULE_INK})`,
};

const ornamentGlyph: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

export interface FlowSectionProps {
    row: FlatSection;
    /** null = not hydrated yet; the row renders its placeholder. */
    section: CurrentSection | null;
    /** False for the very first flat row — no scene break before the opening block. */
    showOrnament: boolean;
    /** Gates outline / scene-link forwarding to the workspace. */
    isActive: boolean;
    projectId: number;
    projectSlug: string;
    workSlug: string;
    /** The work's format — the placeholder's height model before hydration. */
    workFormat: string;
    canUpdate: boolean;
    printLayout: boolean;
    pageDisplay: PageDisplayMode;
    onCounts: SectionCountsCallback;
    onBridgeChange: (sectionId: number, bridge: WritingEditorBridge | null) => void;
    onEditorStateChange: () => void;
    onOutlineChange: (outline: SectionOutlineItem[]) => void;
    onSceneLinksChange: (links: ScreenplaySceneLink[]) => void;
    onEntryLinkSelect: () => void;
    onAddComment: (anchor: { from: number; to: number; text: string }) => void;
}

export default function FlowSection({
    row,
    section,
    showOrnament,
    isActive,
    projectId,
    projectSlug,
    workSlug,
    workFormat,
    canUpdate,
    printLayout,
    pageDisplay,
    onCounts,
    onBridgeChange,
    onEditorStateChange,
    onOutlineChange,
    onSceneLinksChange,
    onEntryLinkSelect,
    onAddComment,
}: FlowSectionProps) {
    const t = useT();
    const { node, depth, isContainer } = row;

    // The writer clicked the ghost on an empty section: mount the real
    // editor even though there is nothing to render yet.
    const [engaged, setEngaged] = useState(false);

    // Each row owns its bridge — the workspace ribbon binds to whichever
    // one belongs to the active scene (Task 6), so a shared ref would let
    // the last-mounted editor win regardless of where the caret is.
    const bridgeRef = useRef<WritingEditorBridge | null>(null);

    const handleStateChange = useCallback(() => {
        // Bridge identity churns as the editor re-creates its imperative
        // handle, so re-report on every tick rather than once on mount.
        onBridgeChange(node.id, bridgeRef.current);
        onEditorStateChange();
    }, [node.id, onBridgeChange, onEditorStateChange]);

    const hasText = (section?.content ?? '').trim() !== '';
    const showEditor = section !== null && (hasText || engaged);

    // Report the bridge once the editor is mounted (onStateChange only
    // fires on the first real selection/content change) and clear it on
    // unmount so a scrolled-away section can't keep driving the ribbon.
    useEffect(() => {
        if (!showEditor) {
            return;
        }

        onBridgeChange(node.id, bridgeRef.current);

        return () => onBridgeChange(node.id, null);
    }, [showEditor, node.id, onBridgeChange]);

    // Engaging an empty section should land the caret in it.
    useEffect(() => {
        if (engaged) {
            bridgeRef.current?.focus();
        }
    }, [engaged]);

    const noop = useCallback(() => {}, []);
    const format = section?.format ?? guessFormat(workFormat);

    return (
        <div
            data-flow-section=""
            data-flow-section-id={node.id}
            data-flow-section-slug={node.slug}
        >
            {isContainer ? (
                <h2
                    className="alex-flow-heading px-6 pt-12 pb-4 text-center font-semibold"
                    style={{ ...headingText, fontSize: depth === 0 ? '1.5rem' : '1.25rem' }}
                >
                    {node.label ? `${node.label} — ` : ''}
                    {node.title}
                </h2>
            ) : (
                showOrnament && (
                    <div
                        role="separator"
                        aria-label={node.title}
                        title={node.title}
                        data-flow-divider=""
                        className="alex-flow-ornament mx-auto my-10 flex max-w-xs items-center gap-4 select-none"
                    >
                        <span className="h-px flex-1" style={ornamentRuleLeft} />
                        <i
                            className="fa-light fa-feather text-xs"
                            aria-hidden="true"
                            style={ornamentGlyph}
                        />
                        <span className="h-px flex-1" style={ornamentRuleRight} />
                    </div>
                )
            )}

            {showEditor ? (
                <div style={engaged && !hasText ? { minHeight: ENGAGED_MIN_HEIGHT_PX } : undefined}>
                    {format === 'screenplay' ? (
                        <ScreenplayEditor
                            projectId={projectId}
                            projectSlug={projectSlug}
                            workSlug={workSlug}
                            section={section}
                            canUpdate={canUpdate}
                            onCounts={onCounts}
                            chrome="none"
                            printLayout={printLayout}
                            scrollMode="parent"
                            bridgeRef={bridgeRef}
                            onStateChange={handleStateChange}
                            onSceneLinksChange={isActive ? onSceneLinksChange : noop}
                            onEntryLinkSelect={onEntryLinkSelect}
                            enableComments={canUpdate}
                            onAddComment={onAddComment}
                        />
                    ) : (
                        <ManuscriptEditor
                            projectId={projectId}
                            projectSlug={projectSlug}
                            workSlug={workSlug}
                            section={section}
                            canUpdate={canUpdate}
                            onCounts={onCounts}
                            chrome="none"
                            printLayout={printLayout}
                            pageDisplay={pageDisplay}
                            scrollMode="parent"
                            bridgeRef={bridgeRef}
                            onStateChange={handleStateChange}
                            onOutlineChange={isActive ? onOutlineChange : noop}
                            enableComments={canUpdate}
                            onAddComment={onAddComment}
                        />
                    )}
                </div>
            ) : section !== null ? (
                /* Hydrated but empty. Read-only viewers get nothing —
                   an empty section has nothing to show them. */
                canUpdate && (
                <button
                    type="button"
                    data-flow-begin=""
                    onClick={() => setEngaged(true)}
                    /* The CTA stands in for a sheet that has no content
                       yet, so it takes the page's own footprint —
                       `my-6` is the sheet's 1.5rem block margin. */
                    className="alex-flow-begin alex-sheet-footprint my-6 block w-full cursor-pointer rounded-lg border border-dashed px-6 py-6"
                >
                    <span className="flex items-center justify-center gap-2.5 text-sm font-medium">
                        <i
                            className="fa-light fa-pen-nib alex-flow-begin-icon"
                            aria-hidden="true"
                        />
                        <span>{t('writing.flow.begin_writing')}</span>
                    </span>
                </button>
                )
            ) : (
                <div
                    data-flow-placeholder=""
                    aria-busy={node.has_content}
                    className="mx-auto w-full max-w-3xl px-6 py-8 text-sm italic"
                    style={{
                        ...mutedText,
                        minHeight: estimatePlaceholderHeight(
                            node.word_count,
                            guessFormat(workFormat),
                        ),
                    }}
                >
                    {node.has_content ? t('writing.flow.loading') : ''}
                </div>
            )}
        </div>
    );
}
