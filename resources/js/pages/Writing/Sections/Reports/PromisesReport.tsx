import { useEffect, useState, type CSSProperties } from 'react';

import type { Translator } from '@alexandria/hooks/useT';

import { ageDays } from '../../Threads/patternChips';
import { buildWorkPromiseRows, keptCount, stanceDistribution } from '../../Threads/promiseRows';
import { fetchPromises, fetchThreads, type PatternThread, type PromiseGroup } from '../../Threads/threadApi';
import ReportCard from './ReportCard';

/**
 * Promises report — Devices & Tropes Task 6 (design doc
 * 2026-08-29-devices-tropes-design.md Surface #4). Unlike its sibling
 * reports (server-hydrated props from WorkReportController), this one
 * fetches client-side via threadApi — the task-6 brief's explicit
 * instruction ("Data via threadApi: promises for the project + threads
 * for this work") since the pattern-threads HTTP surface (Task 3) is
 * project-scoped and Reports never needed a controller change to reach
 * it.
 */

const mutedTextStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const errorTextStyle: CSSProperties = {
    color: 'var(--theme-status-error-stroke)',
};

const summaryChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 7%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 62%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5625rem',
    fontSize: '0.75rem',
    fontWeight: 600,
};

const headRowStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    fontSize: '0.625rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
};

export interface PromisesReportProps {
    projectSlug: string;
    workId: number;
    t: Translator;
}

export default function PromisesReport({ projectSlug, workId, t }: PromisesReportProps) {
    const [threads, setThreads] = useState<PatternThread[] | null>(null);
    const [groups, setGroups] = useState<PromiseGroup[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        Promise.all([fetchThreads(projectSlug, { workId }), fetchPromises(projectSlug)]).then(
            ([threadResult, promiseResult]) => {
                if (cancelled) {
                    return;
                }

                if (threadResult === null || promiseResult === null) {
                    setFailed(true);
                    return;
                }

                setFailed(false);
                setThreads(threadResult);
                setGroups(promiseResult);
            },
        );

        return () => {
            cancelled = true;
        };
    }, [projectSlug, workId]);

    if (failed) {
        return (
            <ReportCard heading={t('writing.reports.promises_heading')}>
                <p className="text-sm italic" style={errorTextStyle}>
                    {t('writing.reports.promises_error')}
                </p>
            </ReportCard>
        );
    }

    if (threads === null || groups === null) {
        return (
            <ReportCard heading={t('writing.reports.promises_heading')}>
                <p className="text-sm italic" style={mutedTextStyle}>
                    {t('writing.reports.promises_loading')}
                </p>
            </ReportCard>
        );
    }

    const rows = buildWorkPromiseRows(groups, threads);
    const kept = keptCount(threads);
    const distribution = stanceDistribution(threads);

    return (
        <ReportCard heading={t('writing.reports.promises_heading')}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <span style={summaryChipStyle}>
                    {t('writing.reports.promises_kept_count').replace(':count', String(kept))}
                </span>
                {distribution.map(({ stance, count }) => (
                    <span key={stance} style={summaryChipStyle}>
                        {(stance === 'none'
                            ? t('writing.reports.promises_stance_none')
                            : t(`writing.threads.stance_${stance}`, stance))}
                        {': '}
                        {count}
                    </span>
                ))}
            </div>

            {rows.length === 0 ? (
                <p className="text-sm italic" style={mutedTextStyle}>
                    {t('writing.reports.promises_empty')}
                </p>
            ) : (
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 px-1 pb-1" style={headRowStyle}>
                        <span className="min-w-0 flex-1">{t('writing.reports.promises_col_thread')}</span>
                        <span className="hidden w-32 shrink-0 sm:inline">{t('writing.reports.promises_col_setup')}</span>
                        <span className="hidden w-32 shrink-0 md:inline">{t('writing.reports.promises_col_scope')}</span>
                        <span className="w-12 shrink-0 text-right">{t('writing.reports.promises_col_age')}</span>
                    </div>
                    {rows.map((row) => (
                        <div
                            key={row.id}
                            className="alex-row flex items-center gap-2 py-1.5 px-1 text-sm"
                            style={{ borderRadius: 'var(--theme-radius-button)' }}
                        >
                            <span className="min-w-0 flex-1 truncate">
                                <span className="font-medium">{row.title}</span>
                                <span className="ml-1.5 text-xs" style={mutedTextStyle}>{row.card_name}</span>
                            </span>
                            <span className="hidden w-32 shrink-0 truncate text-xs sm:inline" style={mutedTextStyle}>
                                {row.setup_location ?? t('writing.reports.promises_unplanted')}
                            </span>
                            <span className="hidden w-32 shrink-0 truncate text-xs md:inline" style={mutedTextStyle}>
                                {row.scope_title}
                            </span>
                            <span className="w-12 shrink-0 text-right text-xs tabular-nums" style={mutedTextStyle}>
                                {t('writing.reports.promises_age_days').replace(':count', String(ageDays(row.created_at)))}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </ReportCard>
    );
}
