import { Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';

import { type Translator } from '@alexandria/hooks/useT';

/**
 * WorkCard — a single work row shared by the project works index
 * (Writing/Index) and the global writing dashboard (Writing/Dashboard).
 * Extracted from Index.tsx in Plan 3 Task 5 with zero visual change.
 *
 * Surface, border, radius, and hover shadow come from the shared
 * `.alex-dash-row` class (components/dashboard.css) — :hover can't be
 * expressed inline, and the class keeps the treatment consistent with
 * the dashboard's project rows.
 */

export interface WorkRow {
    id: number;
    title: string;
    slug: string;
    type: string;
    status: string;
    logline: string | null;
    word_count: number;
    target_words: number | null;
    sections_count: number;
    updated_at: string | null;
}

/* ── Theme styles ── */

const mutedText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

const metaText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const workCardStyle: CSSProperties = {
    display: 'block',
    color: 'var(--theme-base-content)',
    padding: '1.25rem',
    textDecoration: 'none',
};

const statusChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
};

const typeLabelStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

export default function WorkCard({
    work,
    projectSlug,
    t,
}: {
    work: WorkRow;
    projectSlug: string;
    t: Translator;
}) {
    const wordCount = work.target_words !== null
        ? `${t('writing.index.words').replace(':count', work.word_count.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', work.target_words.toLocaleString())}`
        : t('writing.index.words').replace(':count', work.word_count.toLocaleString());

    return (
        <Link
            href={`/works/${projectSlug}/${work.slug}`}
            className="alex-dash-row"
            style={workCardStyle}
        >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span style={typeLabelStyle}>{t(`writing.types.${work.type}`, work.type)}</span>
                <span style={statusChipStyle}>{t(`writing.statuses.${work.status}`, work.status)}</span>
            </div>
            <h2 className="alex-dash-row-title mt-1.5 text-lg font-bold">{work.title}</h2>
            {work.logline && (
                <p className="mt-1 text-sm" style={mutedText}>
                    {work.logline}
                </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-2 text-xs" style={metaText}>
                <span>{wordCount}</span>
                <span aria-hidden="true">·</span>
                <span>{t('writing.index.sections').replace(':count', work.sections_count.toLocaleString())}</span>
                {work.updated_at && (
                    <>
                        <span aria-hidden="true">·</span>
                        <span>
                            {t('writing.index.updated').replace(
                                ':date',
                                new Date(work.updated_at).toLocaleDateString(),
                            )}
                        </span>
                    </>
                )}
            </div>
        </Link>
    );
}
