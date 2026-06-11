import { router } from '@inertiajs/react';
import { useEffect, useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import RichTextEditor from '@alexandria/components/editor/RichTextEditor';
import Tooltip from '@alexandria/components/ui/Tooltip';

import type { CurrentSection } from '../Workspace';
import useSectionAutosave, { type SectionCountsCallback } from './useSectionAutosave';

/**
 * Workspace manuscript editor — Stage 8g.1 (Plan 2 Task 7).
 *
 * The center pane: an inline-editable section title over a RichTextEditor
 * wired to debounced JSON autosave (PUT .../sections/{id}/content) via
 * the shared useSectionAutosave hook. Server-confirmed word counts flow
 * back up through `onCounts` so the Workspace header strip + Navigator
 * rows stay live without an Inertia round-trip. Switching sections (or
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

/* ── Theme styles ── */

const labelChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    lineHeight: 1.5,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
};

const titleInputStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--theme-base-content)',
};

const menuBarStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const footerStyle: CSSProperties = {
    background: 'var(--theme-base-page)',
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const footerMetaStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const errorTextStyle: CSSProperties = {
    color: 'var(--theme-status-error-stroke)',
};

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
    const [title, setTitle] = useState(section.title);
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
        setTitle(section.title);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section.id]);

    // Re-sync the local title when the server-confirmed one changes
    // (after commitTitle's partial reload trims/normalizes it). Same
    // section id, so the reset effect above doesn't cover this.
    useEffect(() => {
        setTitle(section.title);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section.title]);

    function commitTitle() {
        const trimmed = title.trim();

        if (!canUpdate || trimmed === '' || trimmed === section.title) {
            setTitle(section.title);
            return;
        }

        router.put(`/works/${projectSlug}/${workSlug}/sections/${section.id}`, { title: trimmed }, {
            preserveScroll: true,
            preserveState: true,
            only: ['sections', 'currentSection'],
        });
    }

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

    const statusText =
        status === 'saving'
            ? t('writing.workspace.saving')
            : status === 'saved'
                ? t('writing.workspace.saved')
                : status === 'error'
                    ? t('writing.workspace.save_error')
                    : null;

    const wordsLabel = section.target_words !== null
        ? `${t('writing.workspace.words').replace(':count', wordCount.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', section.target_words.toLocaleString())}`
        : t('writing.workspace.words').replace(':count', wordCount.toLocaleString());

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* Menu bar — title + label on the left, save status on the right */}
            <div className="flex h-12 shrink-0 items-center gap-3 px-4" style={menuBarStyle}>
                {canUpdate ? (
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={commitTitle}
                        className="min-w-0 flex-1 text-lg font-semibold"
                        style={titleInputStyle}
                        aria-label={t('writing.workspace.section_title_placeholder')}
                        placeholder={t('writing.workspace.section_title_placeholder')}
                    />
                ) : (
                    <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">
                        {section.title}
                    </h2>
                )}
                {section.label && (
                    <span className="shrink-0" style={labelChipStyle}>
                        {section.label}
                    </span>
                )}
                {canUpdate && (
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
                )}
                {statusText && (
                    <span
                        className="shrink-0 text-xs"
                        style={status === 'error' ? errorTextStyle : footerMetaStyle}
                    >
                        {statusText}
                    </span>
                )}
            </div>

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

            {/* Footer bar — counts only */}
            <footer className="shrink-0" style={footerStyle}>
                <div className="flex items-center justify-end px-4 py-2 text-xs">
                    <span className="shrink-0 tabular-nums" style={footerMetaStyle}>
                        {wordsLabel}
                        {section.format === 'screenplay' && pageEstimate !== null && (
                            <> · {t('writing.workspace.pages').replace(':count', pageEstimate.toLocaleString())}</>
                        )}
                    </span>
                </div>
            </footer>
        </div>
    );
}
