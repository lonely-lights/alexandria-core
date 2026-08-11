import { Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';

import type { Translator } from '@alexandria/hooks/useT';
import { workUrl } from '@alexandria/lib/urls';

import type { StructureReportRow } from '../../Reports';
import ReportCard from './ReportCard';

/**
 * Structure report — Stage 8g.1 (Plan 4 Task 4).
 *
 * The work's section tree flattened depth-first, one row per section:
 * indented title linking into the workspace, label chip, status /
 * beat-type metadata, and right-aligned word counts against targets.
 * Container rows (no prose of their own) render slightly muted.
 */

/* ── Theme styles ── */

const titleLinkStyle: CSSProperties = {
    color: 'var(--theme-base-content)',
};

const containerTitleStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

// Same chip treatment as the workspace Navigator's label chips.
const labelChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    lineHeight: 1.6,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
};

const metaTextStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
};

const countTextStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
};

export default function StructureReport({
    structure,
    projectSlug,
    workSlug,
    t,
}: {
    structure: StructureReportRow[];
    projectSlug: string;
    workSlug: string;
    t: Translator;
}) {
    return (
        <ReportCard heading={t('writing.reports.structure_heading')}>
            <div className="flex flex-col">
                {structure.map((row) => {
                    const meta = [
                        row.status !== null ? t(`writing.statuses.${row.status}`, row.status) : null,
                        row.beat_type,
                    ].filter((part): part is string => part !== null && part !== '');

                    return (
                        <div
                            key={row.id}
                            className="alex-row flex items-center gap-2 py-1.5 pr-2 text-sm"
                            style={{
                                paddingLeft: `${row.depth * 18 + 8}px`,
                                borderRadius: 'var(--theme-radius-button)',
                            }}
                        >
                            <Link
                                href={workUrl(projectSlug, workSlug, row.slug)}
                                className="min-w-0 truncate font-medium hover:underline"
                                style={row.has_content ? titleLinkStyle : containerTitleStyle}
                            >
                                {row.title}
                            </Link>
                            {row.label && <span style={labelChipStyle}>{row.label}</span>}
                            {meta.length > 0 && (
                                <span className="hidden truncate text-xs sm:inline" style={metaTextStyle}>
                                    {meta.join(' · ')}
                                </span>
                            )}
                            <span
                                className="ml-auto shrink-0 text-xs tabular-nums"
                                style={countTextStyle}
                            >
                                {row.word_count.toLocaleString()}
                                {row.target_words !== null && ` / ${row.target_words.toLocaleString()}`}
                            </span>
                        </div>
                    );
                })}
            </div>
        </ReportCard>
    );
}
