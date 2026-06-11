import type { CSSProperties } from 'react';

import type { Translator } from '@alexandria/hooks/useT';

import type { ProgressReportData } from '../../Reports';
import ReportCard from './ReportCard';

/**
 * Progress report — Stage 8g.1 (Plan 4 Task 4).
 *
 * Work total against its target (same word-target-wins precedence and
 * slim bar treatment as the workspace header strip), per-label rollups,
 * and a 14-day recent-activity strip. The recent series attributes a
 * section's whole count to its last-edit day — the caption keeps that
 * honest.
 */

/* ── Theme styles ── */

const mutedStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const headingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    fontSize: '0.625rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
};

const headCellStyle: CSSProperties = {
    ...headingStyle,
};

const rowBorderStyle: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};

// Slim bar — same treatment as the workspace header strip's progress bar.
const barTrackStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
};

const barFillStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
};

const captionStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

export default function ProgressReport({
    progress,
    t,
}: {
    progress: ProgressReportData;
    t: Translator;
}) {
    // Word target wins when both exist — same logic as the workspace
    // header; line targets (poetry plans) only step in without one.
    let countLabel: string;
    let progressRatio: number | null = null;

    if (progress.target_words !== null) {
        countLabel = `${t('writing.workspace.words').replace(':count', progress.work_word_count.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', progress.target_words.toLocaleString())}`;
        progressRatio = progress.target_words > 0
            ? progress.work_word_count / progress.target_words
            : null;
    } else if (progress.target_lines !== null) {
        countLabel = `${t('writing.workspace.lines').replace(':count', progress.work_line_count.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', progress.target_lines.toLocaleString())}`;
        progressRatio = progress.target_lines > 0
            ? progress.work_line_count / progress.target_lines
            : null;
    } else {
        countLabel = t('writing.workspace.words').replace(':count', progress.work_word_count.toLocaleString());
    }

    const maxRecentWords = Math.max(...progress.recent.map((day) => day.words), 1);

    return (
        <ReportCard heading={t('writing.reports.progress_heading')}>
            {/* Work total vs target */}
            <div className="flex items-center gap-3">
                <div className="shrink-0 text-sm tabular-nums">{countLabel}</div>
                {progressRatio !== null && (
                    <div
                        aria-hidden="true"
                        className="h-1 min-w-0 flex-1 overflow-hidden rounded-full"
                        style={barTrackStyle}
                    >
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${Math.min(100, progressRatio * 100)}%`,
                                ...barFillStyle,
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Per-level rollup */}
            {progress.per_level.length > 0 && (
                <>
                    <p className="mt-5 mb-1" style={headingStyle}>
                        {t('writing.reports.per_level_heading')}
                    </p>
                    <table className="w-full max-w-xl text-sm">
                        <thead>
                            <tr>
                                <th className="py-1 pr-2 text-left" style={headCellStyle}>
                                    {t('writing.reports.col_label')}
                                </th>
                                <th className="px-2 py-1 text-right" style={headCellStyle}>
                                    {t('writing.reports.col_count')}
                                </th>
                                <th className="px-2 py-1 text-right" style={headCellStyle}>
                                    {t('writing.reports.col_words')}
                                </th>
                                <th className="py-1 pl-2 text-right" style={headCellStyle}>
                                    {t('writing.reports.col_average')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {progress.per_level.map((level) => (
                                <tr key={level.label ?? ''} style={rowBorderStyle}>
                                    <td className="py-1.5 pr-2">
                                        {level.label ?? (
                                            <span className="italic" style={mutedStyle}>
                                                {t('writing.reports.unlabeled')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">
                                        {level.sections.toLocaleString()}
                                    </td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">
                                        {level.words.toLocaleString()}
                                    </td>
                                    <td className="py-1.5 pl-2 text-right tabular-nums">
                                        {level.average.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {/* Recent activity */}
            <p className="mt-5 mb-2" style={headingStyle}>
                {t('writing.reports.recent_heading')}
            </p>
            {progress.recent.length === 0 ? (
                <p className="text-sm italic" style={mutedStyle}>
                    {t('writing.reports.recent_empty')}
                </p>
            ) : (
                <>
                    <div className="flex max-w-xl flex-col gap-1.5">
                        {progress.recent.map((day) => (
                            <div key={day.date} className="flex items-center gap-3 text-xs">
                                <span className="w-20 shrink-0 tabular-nums" style={mutedStyle}>
                                    {day.date}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div
                                        className="h-2 rounded-full"
                                        style={{
                                            width: `${Math.max(1, (day.words / maxRecentWords) * 100)}%`,
                                            ...barFillStyle,
                                        }}
                                    />
                                </div>
                                <span className="w-14 shrink-0 text-right tabular-nums" style={mutedStyle}>
                                    {day.words.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-xs italic" style={captionStyle}>
                        {t('writing.reports.recent_caption')}
                    </p>
                </>
            )}
        </ReportCard>
    );
}
