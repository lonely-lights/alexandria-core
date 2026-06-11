import { useEffect, useState } from 'react';

import useT from '@alexandria/hooks/useT';
import RichTextEditor from '@alexandria/components/editor/RichTextEditor';
import Tooltip from '@alexandria/components/ui/Tooltip';

import type { CurrentSection } from '../Workspace';
import SectionChrome from './SectionChrome';
import useSectionAutosave, { type SectionCountsCallback } from './useSectionAutosave';

/**
 * Workspace manuscript editor — Stage 8g.1 (Plan 2 Task 7).
 *
 * The center pane: a RichTextEditor wired to debounced JSON autosave
 * (PUT .../sections/{id}/content) via the shared useSectionAutosave
 * hook, wrapped in the shared SectionChrome (menu bar with inline
 * title / counts footer). Server-confirmed word counts flow back up
 * through `onCounts` so the Workspace header strip + Navigator rows
 * stay live without an Inertia round-trip. Switching sections (or
 * unmounting) flushes any pending save for the outgoing section before
 * state resets.
 */

export interface ManuscriptEditorProps {
    projectId: number;
    projectSlug: string;
    workSlug: string;
    section: CurrentSection;
    canUpdate: boolean;
    onCounts: SectionCountsCallback;
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
}: ManuscriptEditorProps) {
    const t = useT();
    const { status, wordCount, pageEstimate, noteChange, initialContent } =
        useSectionAutosave({ projectSlug, workSlug, section, onCounts });
    const [content, setContent] = useState(initialContent);
    const [printLayout, setPrintLayout] = useState(readPrintLayoutPreference);

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

    function togglePrintLayout() {
        const next = !printLayout;
        setPrintLayout(next);
        try {
            localStorage.setItem(PRINT_LAYOUT_STORAGE_KEY, String(next));
        } catch {
            // Storage unavailable (private mode / quota) — the toggle
            // still works for this session.
        }
    }

    const printLayoutToggleButton = (
        <Tooltip content={t('writing.workspace.print_layout')}>
            <button
                type="button"
                onClick={togglePrintLayout}
                aria-pressed={printLayout}
                className={`alex-toolbar-btn inline-flex h-8 w-8 shrink-0 items-center justify-center text-sm transition-colors ${printLayout ? 'alex-toolbar-btn--active' : ''}`}
                style={{
                    background: printLayout
                        ? 'color-mix(in srgb, var(--theme-brand-secondary-500) 18%, transparent)'
                        : 'transparent',
                    color: printLayout
                        ? 'var(--theme-brand-secondary-500)'
                        : 'var(--theme-base-content)',
                    borderRadius: 'var(--theme-radius-button)',
                }}
            >
                <i className="fa-solid fa-ruler-horizontal" />
            </button>
        </Tooltip>
    );

    return (
        <SectionChrome
            projectSlug={projectSlug}
            workSlug={workSlug}
            section={section}
            canUpdate={canUpdate}
            status={status}
            wordCount={wordCount}
            pageEstimate={pageEstimate}
            menuExtras={canUpdate ? printLayoutToggleButton : undefined}
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
                    printLayout={printLayout}
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
