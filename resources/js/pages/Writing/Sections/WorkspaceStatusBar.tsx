import { Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import { worksBase } from '@alexandria/lib/urls';

import type { WorkLengthPlan } from './WorkSettingsModal';

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
 * Mobile (< md): a deliberate compact line — back chevron, truncated
 * work title, spacer, abbreviated section words (e.g. `1.2k`); the
 * targets and progress bar hide below md.
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
    background: 'var(--theme-base-page)',
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const crumbSeparatorStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const metaTextStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

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
            {progressRatio !== null && (
                <div
                    aria-hidden="true"
                    className="h-1 w-32 shrink-0 overflow-hidden rounded-full"
                    style={{
                        background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
                    }}
                >
                    <div
                        className="h-full rounded-full"
                        style={{
                            width: `${Math.min(100, progressRatio * 100)}%`,
                            background: 'var(--theme-brand-primary-500)',
                        }}
                    />
                </div>
            )}
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
    sectionTarget,
    sectionPages,
    sectionFormat,
}: WorkspaceStatusBarProps) {
    const t = useT();

    // The exact strings SectionChrome's footer used.
    const sectionWordsLabel =
        sectionTarget !== null
            ? `${t('writing.workspace.words').replace(':count', sectionWords.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', sectionTarget.toLocaleString())}`
            : t('writing.workspace.words').replace(':count', sectionWords.toLocaleString());

    return (
        <div className="h-8 shrink-0 px-4 text-xs" style={barStyle}>
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
                        <span className="shrink-0 tabular-nums" style={metaTextStyle}>
                            {sectionWordsLabel}
                            {sectionFormat === 'screenplay' && sectionPages !== null && sectionWords > 0 && (
                                <> · {t('writing.workspace.pages').replace(':count', sectionPages.toLocaleString())}</>
                            )}
                            {sectionFormat !== 'screenplay' && sectionPages !== null && sectionPages > 0 && sectionWords > 0 && (
                                <>
                                    {' · '}
                                    <span title={t('writing.workspace.page_estimate_title')}>
                                        {t('writing.workspace.page_estimate').replace(':pages', sectionPages.toLocaleString())}
                                    </span>
                                </>
                            )}
                        </span>
                        <span aria-hidden="true" style={crumbSeparatorStyle}>
                            ·
                        </span>
                    </>
                )}
                <WorkProgress work={work} workWords={workWords} />
            </div>

            {/* Mobile line — compact: back chevron, title, abbreviated words */}
            <div className="flex h-full min-w-0 items-center gap-2 md:hidden">
                <Link
                    href={worksBase(project.slug)}
                    className="alex-page-header-crumb-link shrink-0"
                    aria-label={t('writing.statusbar.back')}
                >
                    <i className="fa-solid fa-chevron-left text-[10px]" aria-hidden="true" />
                </Link>
                <span className="truncate font-semibold">{work.title}</span>
                <div className="flex-1" />
                {hasSection && (
                    <span className="shrink-0 tabular-nums" style={metaTextStyle}>
                        {abbreviateCount(sectionWords)}
                    </span>
                )}
            </div>
        </div>
    );
}
