import { router } from '@inertiajs/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import RichTextEditor from '@alexandria/components/editor/RichTextEditor';

import type { CurrentSection } from '../Workspace';

/**
 * Workspace manuscript editor — Stage 8g.1 (Plan 2 Task 7).
 *
 * The center pane: an inline-editable section title over a RichTextEditor
 * wired to debounced JSON autosave (PUT .../sections/{id}/content).
 * Server-confirmed word counts flow back up through `onCounts` so the
 * Workspace header strip + Navigator rows stay live without an Inertia
 * round-trip. Switching sections (or unmounting) flushes any pending
 * save for the outgoing section before state resets.
 */

interface ManuscriptEditorProps {
    projectId: number;
    projectSlug: string;
    workSlug: string;
    section: CurrentSection;
    canUpdate: boolean;
    onCounts: (sectionId: number, sectionWords: number, workWords: number, pages: number | null) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 1200;

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

function getCsrfToken(): string {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? ''
    );
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
    const [content, setContent] = useState(section.content ?? '');
    const [title, setTitle] = useState(section.title);
    const [status, setStatus] = useState<SaveStatus>('idle');
    const [wordCount, setWordCount] = useState(section.word_count);
    const [pageEstimate, setPageEstimate] = useState<number | null>(null);

    // Refs let the section-switch cleanup flush the OUTGOING section's
    // pending save with its latest content, even though state has
    // already moved on by the time the cleanup runs.
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingRef = useRef(false);
    const latestContentRef = useRef(section.content ?? '');
    const sectionIdRef = useRef(section.id);

    function fireSave(sectionId: number, wiki: string) {
        pendingRef.current = false;

        fetch(`/works/${projectSlug}/${workSlug}/sections/${sectionId}/content`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': getCsrfToken(),
            },
            body: JSON.stringify({ content: wiki }),
        })
            .then((response) =>
                response.ok
                    ? (response.json() as Promise<{
                          word_count: number;
                          page_estimate: number | null;
                          work_word_count: number;
                      }>)
                    : Promise.reject(new Error(`HTTP ${response.status}`)),
            )
            .then((payload) => {
                onCounts(sectionId, payload.word_count, payload.work_word_count, payload.page_estimate);

                if (sectionIdRef.current === sectionId) {
                    setWordCount(payload.word_count);
                    setPageEstimate(payload.page_estimate);
                    setStatus('saved');
                }
            })
            .catch(() => {
                // Content state is untouched — the next keystroke
                // reschedules the save, retrying naturally.
                if (sectionIdRef.current === sectionId) {
                    setStatus('error');
                }
            });
    }

    function handleChange(wiki: string) {
        setContent(wiki);
        latestContentRef.current = wiki;
        pendingRef.current = true;
        setStatus('saving');

        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            fireSave(section.id, latestContentRef.current);
        }, AUTOSAVE_DELAY_MS);
    }

    // Reset on section switch; the cleanup flushes the previous
    // section's pending save (it closes over the previous render's
    // section.id + the refs holding its latest content). Also covers
    // unmount — a fire-and-forget fetch is fine there.
    useEffect(() => {
        sectionIdRef.current = section.id;
        latestContentRef.current = section.content ?? '';
        pendingRef.current = false;
        setContent(section.content ?? '');
        setTitle(section.title);
        setWordCount(section.word_count);
        setPageEstimate(null);
        setStatus('idle');

        return () => {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            if (pendingRef.current) {
                fireSave(section.id, latestContentRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section.id]);

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
        <div className="flex min-h-full flex-col">
            <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
                {/* Title row */}
                <div className="mb-6 flex items-center gap-3">
                    {canUpdate ? (
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={commitTitle}
                            className="min-w-0 flex-1 text-2xl font-bold"
                            style={titleInputStyle}
                            aria-label={t('writing.workspace.section_title_placeholder')}
                            placeholder={t('writing.workspace.section_title_placeholder')}
                        />
                    ) : (
                        <h2 className="min-w-0 flex-1 truncate text-2xl font-bold">
                            {section.title}
                        </h2>
                    )}
                    {section.label && (
                        <span className="shrink-0" style={labelChipStyle}>
                            {section.label}
                        </span>
                    )}
                </div>

                {/* Manuscript */}
                {canUpdate ? (
                    <RichTextEditor
                        key={section.id}
                        value={content}
                        onChange={handleChange}
                        tier="pro"
                        enableEntryLinks
                        enableMentions={false}
                        projectId={projectId}
                        maxLength={0}
                    />
                ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {content}
                    </pre>
                )}
            </div>

            {/* Footer bar */}
            <footer className="sticky bottom-0" style={footerStyle}>
                <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-6 py-2 text-xs">
                    <span style={status === 'error' ? errorTextStyle : footerMetaStyle}>
                        {statusText}
                    </span>
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
