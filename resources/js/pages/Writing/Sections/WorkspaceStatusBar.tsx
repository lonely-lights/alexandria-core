import { Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import { worksBase } from '@alexandria/lib/urls';

import type { WorkLengthPlan } from './WorkSettingsModal';
import WritingSaveStatus from './WritingSaveStatus';

/**
 * Workspace status bar — Word-style anatomy (ribbon transitions).
 *
 * One bottom-attached line spanning the full workspace width, merging
 * what used to be the ribbon tab row's leading breadcrumb + trailing
 * cluster (progress bar, work counts) with the per-section counts
 * that lived in SectionChrome's footer. The work-status chip moved UP
 * to the merged ribbon header's leading cluster (Workspace.tsx).
 *
 * Desktop (≥ md), left → right: breadcrumb (project › work) · spacer ·
 * current-section counts · divider · work progress.
 * Mobile (< md): a centered compact line with section and work words;
 * targets and progress bars hide below md. A text selection temporarily
 * replaces the section count with its exact word count on both layouts.
 *
 * Counts are assembled in Workspace from the editors' existing
 * `onCounts` flow (server-confirmed autosave values overlaying the
 * Inertia props) — no new editor plumbing.
 */

interface StatusBarProject {
    name: string;
    slug: string;
}

interface StatusBarWork {
    title: string;
    line_count: number;
    target_words: number | null;
    target_pages: number | null;
    page_estimate: number;
    length_plan: WorkLengthPlan | null;
}

interface WorkspaceStatusBarProps {
    project: StatusBarProject;
    work: StatusBarWork;
    /** Live work-level word count (autosave overlay ?? work.word_count). */
    workWords: number;
    hasSection: boolean;
    /** Live current-section word count (autosave overlay ?? section.word_count). */
    sectionWords: number;
    /** Live selected words; null means no selection (zero is meaningful). */
    selectedWords?: number | null;
    onOpenStatistics?: () => void;
    sectionTarget: number | null;
    /** Server-confirmed page estimate for the current section (null until the first save). */
    sectionPages: number | null;
    sectionFormat: 'prose' | 'screenplay' | null;
}

/** Compact count for the mobile line: <1000 verbatim, else `X.Yk`. */
function abbreviateCount(count: number): string {
    if (count < 1000) {
        return count.toLocaleString();
    }

    return `${(count / 1000).toFixed(1)}k`;
}

/* ── Theme styles ── */

const barStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const crumbSeparatorStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const metaTextStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

/* ── Shared mini progress bar (work tracker + per-section tracker) ── */

function MiniProgressBar({ ratio, widthClass = 'w-32' }: { ratio: number; widthClass?: string }) {
    return (
        <div
            aria-hidden="true"
            className={`h-1 ${widthClass} shrink-0 overflow-hidden rounded-full`}
            style={{
                background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
            }}
        >
            <div
                className="h-full rounded-full"
                style={{
                    width: `${Math.min(100, ratio * 100)}%`,
                    background: 'var(--theme-brand-primary-500)',
                }}
            />
        </div>
    );
}

/* ── Work progress (the old ribbon trailing cluster's bar + counts) ── */

function WorkProgress({ work, workWords }: { work: StatusBarWork; workWords: number }) {
    const t = useT();
    const targetLines = work.length_plan?.target_lines ?? null;

    // Word target wins when several exist (words > lines > pages).
    // Line counts — and the page estimate derived from them — only
    // refresh with full prop reloads (the autosave response carries
    // word/page counts only) — accepted props-only freshness in v1.
    let countLabel: string;
    let progressRatio: number | null = null;

    if (work.target_words !== null) {
        countLabel = `${t('writing.workspace.words').replace(':count', workWords.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', work.target_words.toLocaleString())}`;
        progressRatio = work.target_words > 0 ? workWords / work.target_words : null;
    } else if (targetLines !== null) {
        countLabel = `${t('writing.workspace.lines').replace(':count', work.line_count.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', targetLines.toLocaleString())}`;
        progressRatio = targetLines > 0 ? work.line_count / targetLines : null;
    } else if (work.target_pages !== null) {
        countLabel = t('writing.workspace.pages_of_target')
            .replace(':count', work.page_estimate.toLocaleString())
            .replace(':target', work.target_pages.toLocaleString());
        progressRatio = work.target_pages > 0 ? work.page_estimate / work.target_pages : null;
    } else {
        // No target set: label the work total so it can't read as a duplicate
        // of the section counter when both sit in the bar.
        countLabel = t('writing.workspace.words_total').replace(':count', workWords.toLocaleString());
    }

    return (
        <>
            {progressRatio !== null && <MiniProgressBar ratio={progressRatio} />}
            <span className="shrink-0 tabular-nums" style={metaTextStyle}>
                {countLabel}
            </span>
        </>
    );
}

/* ── Component ── */

export default function WorkspaceStatusBar({
    project,
    work,
    workWords,
    hasSection,
    sectionWords,
    selectedWords = null,
    onOpenStatistics,
    sectionTarget,
    sectionPages,
    sectionFormat,
}: WorkspaceStatusBarProps) {
    const t = useT();

    const selectionLabel = selectedWords === null ? null : t(
        selectedWords === 1 ? 'writing.workspace.selected_word' : 'writing.workspace.selected_words',
    ).replace(':count', selectedWords.toLocaleString());

    // Labeled "Section: …" so the current-section count reads distinctly
    // from the work total that sits beside it in the bar.
    const sectionWordsLabel =
        sectionTarget !== null
            ? t('writing.workspace.section_words_of_target')
                  .replace(':count', sectionWords.toLocaleString())
                  .replace(':target', sectionTarget.toLocaleString())
            : t('writing.workspace.section_words').replace(':count', sectionWords.toLocaleString());

    // A per-section tracker bar that mirrors the work tracker — only when
    // the section carries its own word target.
    const sectionRatio =
        sectionTarget !== null && sectionTarget > 0 ? sectionWords / sectionTarget : null;

    return (
        <div className="flex h-11 shrink-0 items-center gap-2 px-4 text-xs md:h-8" style={barStyle}>
            <div className="h-full min-w-0 flex-1">
            {/* Desktop line */}
            <div className="hidden h-full min-w-0 items-center gap-3 md:flex">
                <Link
                    href={worksBase(project.slug)}
                    className="alex-page-header-crumb-link shrink-0"
                >
                    {project.name}
                </Link>
                <i
                    className="fa-solid fa-chevron-right text-[8px]"
                    style={crumbSeparatorStyle}
                    aria-hidden="true"
                />
                <span className="truncate font-semibold">{work.title}</span>
                <div className="flex-1" />
                {hasSection && (
                    <>
                        {selectionLabel === null && sectionRatio !== null && (
                            <MiniProgressBar ratio={sectionRatio} widthClass="w-20" />
                        )}
                        <button type="button" className="h-full shrink-0 tabular-nums enabled:hover:underline" style={metaTextStyle} onClick={onOpenStatistics} disabled={!onOpenStatistics} aria-label={t('writing.statistics.title')}>
                            {selectionLabel !== null
                                ? <span data-writing-selection-count>{selectionLabel}</span>
                                : sectionWordsLabel}
                            {selectionLabel === null && sectionFormat === 'screenplay' && sectionPages !== null && sectionWords > 0 && (
                                <> · {t('writing.workspace.pages').replace(':count', sectionPages.toLocaleString())}</>
                            )}
                            {selectionLabel === null && sectionFormat !== 'screenplay' && sectionPages !== null && sectionPages > 0 && sectionWords > 0 && (
                                <>
                                    {' · '}
                                    <span title={t('writing.workspace.page_estimate_title')}>
                                        {t('writing.workspace.page_estimate').replace(':pages', sectionPages.toLocaleString())}
                                    </span>
                                </>
                            )}
                        </button>
                        <span aria-hidden="true" style={crumbSeparatorStyle}>
                            ·
                        </span>
                    </>
                )}
                <WorkProgress work={work} workWords={workWords} />
            </div>

            {/* Global navigation stays behind the deliberate bottom-right menu. */}
            <button type="button" className="flex h-full w-full min-w-0 items-center justify-center gap-2 md:hidden" style={metaTextStyle} onClick={onOpenStatistics} disabled={!onOpenStatistics} aria-label={t('writing.statistics.title')}>
                {hasSection && (
                    <span className="min-w-0 truncate tabular-nums">
                        {selectionLabel !== null
                            ? <span data-writing-selection-count title={selectionLabel}>{selectionLabel}</span>
                            : t('writing.workspace.section_words').replace(':count', abbreviateCount(sectionWords))}
                    </span>
                )}
                <span aria-hidden="true">·</span>
                <span className="min-w-0 truncate tabular-nums">{t('writing.tools.work_words').replace(':count', abbreviateCount(workWords))}</span>
            </button>
            </div>
            <WritingSaveStatus />
        </div>
    );
}
