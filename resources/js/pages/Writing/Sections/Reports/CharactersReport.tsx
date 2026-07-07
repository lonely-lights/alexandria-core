import { Link } from '@inertiajs/react';
import { useMemo, useState, type CSSProperties } from 'react';

import type { Translator } from '@alexandria/hooks/useT';
import Input from '@alexandria/components/form/Input';
import Select from '@alexandria/components/form/Select';

import type { ActBreakdownRow, CharacterReportRow } from '../../Reports';
import { blueprintIconClass } from '../EntryPickerModal';
import ReportCard from './ReportCard';

/**
 * Characters & references report — Stage 8g.1 (Plan 4 Task 4).
 *
 * Every entry the work references (prose mentions, POV, Setting) with
 * mention totals, section coverage, source chips, and a deep link to
 * the first section it appears in. Blueprint filter + name search are
 * purely client-side — the server ships the full rollup.
 */

/* ── Theme styles ── */

const headCellStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    fontSize: '0.625rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
};

const rowBorderStyle: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};

const entryIconStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const entryLinkStyle: CSSProperties = {
    color: 'var(--theme-base-content)',
};

const mutedCellStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
};

const sourceChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    lineHeight: 1.6,
    whiteSpace: 'nowrap',
};

const firstLinkStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
};

const lastLinkStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

const chipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    lineHeight: 1.6,
    whiteSpace: 'nowrap' as const,
};

const overflowChipStyle: CSSProperties = {
    ...chipStyle,
    background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const sectionHeadingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
    fontSize: '0.625rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
};

const emptyStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const ACT_CHIPS_MAX = 6;

export default function CharactersReport({
    characters,
    actBreakdown,
    projectSlug,
    workSlug,
    t,
}: {
    characters: CharacterReportRow[];
    actBreakdown: ActBreakdownRow[];
    projectSlug: string;
    workSlug: string;
    t: Translator;
}) {
    const [blueprint, setBlueprint] = useState('all');
    const [search, setSearch] = useState('');

    const blueprintNames = useMemo(
        () =>
            [...new Set(
                characters
                    .map((row) => row.blueprint_name)
                    .filter((name): name is string => name !== null),
            )].sort((a, b) => a.localeCompare(b)),
        [characters],
    );

    const query = search.trim().toLowerCase();
    const filtered = characters.filter(
        (row) =>
            (blueprint === 'all' || row.blueprint_name === blueprint) &&
            (query === '' || row.name.toLowerCase().includes(query)),
    );

    return (
        <ReportCard
            heading={t('writing.reports.characters_heading')}
            controls={
                characters.length > 0 ? (
                    <div className="flex items-center gap-2">
                        {/* Input/Select stretch to their wrapper — fixed-width
                            shells keep the controls compact in the header row. */}
                        <div className="w-40">
                            <Select
                                name="characters-blueprint-filter"
                                size="sm"
                                value={blueprint}
                                onChange={(e) => setBlueprint(e.target.value)}
                                options={[
                                    { value: 'all', label: t('writing.reports.filter_all') },
                                    ...blueprintNames.map((name) => ({ value: name, label: name })),
                                ]}
                            />
                        </div>
                        <div className="w-48">
                            <Input
                                type="text"
                                size="sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('writing.reports.search_placeholder')}
                                icon="fa-solid fa-magnifying-glass"
                            />
                        </div>
                    </div>
                ) : undefined
            }
        >
            {characters.length === 0 ? (
                <p className="py-6 text-center text-sm italic" style={emptyStyle}>
                    {t('writing.reports.empty_characters')}
                </p>
            ) : filtered.length === 0 ? (
                <p className="py-6 text-center text-sm italic" style={emptyStyle}>
                    {t('writing.panel.no_results')}
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                <th className="px-2 py-1.5 text-left" style={headCellStyle}>
                                    {t('writing.reports.col_entry')}
                                </th>
                                <th className="px-2 py-1.5 text-left" style={headCellStyle}>
                                    {t('writing.reports.col_blueprint')}
                                </th>
                                <th className="px-2 py-1.5 text-right" style={headCellStyle}>
                                    {t('writing.reports.col_mentions')}
                                </th>
                                <th className="px-2 py-1.5 text-right" style={headCellStyle}>
                                    {t('writing.reports.col_sections')}
                                </th>
                                <th className="px-2 py-1.5 text-left" style={headCellStyle}>
                                    {t('writing.reports.col_sources')}
                                </th>
                                <th className="px-2 py-1.5 text-left" style={headCellStyle}>
                                    {t('writing.reports.col_first')}
                                </th>
                                <th className="px-2 py-1.5 text-left" style={headCellStyle}>
                                    {t('writing.reports.col_last')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((row) => (
                                <tr key={row.id} style={rowBorderStyle}>
                                    <td className="px-2 py-2">
                                        <a
                                            href={row.url}
                                            className="inline-flex items-center gap-2 font-medium hover:underline"
                                            style={entryLinkStyle}
                                        >
                                            <i
                                                className={`${blueprintIconClass(row.blueprint_icon)} w-4 shrink-0 text-center text-xs`}
                                                style={entryIconStyle}
                                                aria-hidden="true"
                                            />
                                            {row.name}
                                        </a>
                                    </td>
                                    <td className="px-2 py-2" style={mutedCellStyle}>
                                        {row.blueprint_name ?? ''}
                                    </td>
                                    <td className="px-2 py-2 text-right tabular-nums">
                                        {row.total_mentions.toLocaleString()}
                                    </td>
                                    <td className="px-2 py-2 text-right tabular-nums">
                                        {row.sections_count.toLocaleString()}
                                    </td>
                                    <td className="px-2 py-2">
                                        <span className="flex flex-wrap gap-1">
                                            {row.sources.map((source) => (
                                                <span key={source} style={sourceChipStyle}>
                                                    {t(`writing.appears_in.${source}`, source)}
                                                </span>
                                            ))}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2">
                                        {row.first_section !== null && (
                                            <Link
                                                href={`/works/${projectSlug}/${workSlug}/${row.first_section.slug}`}
                                                className="hover:underline"
                                                style={firstLinkStyle}
                                            >
                                                {row.first_section.title}
                                            </Link>
                                        )}
                                    </td>
                                    <td className="px-2 py-2">
                                        {row.last_section !== null &&
                                            row.last_section.slug !== row.first_section?.slug && (
                                            <Link
                                                href={`/works/${projectSlug}/${workSlug}/${row.last_section.slug}`}
                                                className="hover:underline"
                                                style={lastLinkStyle}
                                            >
                                                {row.last_section.title}
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* By-act breakdown — only shown when there are top-level sections */}
            {actBreakdown.length > 0 && (
                <>
                    <p className="mt-6 mb-1" style={sectionHeadingStyle}>
                        {t('writing.reports.act_breakdown_heading')}
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    <th className="py-1 pr-2 text-left" style={headCellStyle}>
                                        {t('writing.reports.col_act')}
                                    </th>
                                    <th className="px-2 py-1 text-right" style={headCellStyle}>
                                        {t('writing.reports.col_count')}
                                    </th>
                                    <th className="px-2 py-1 text-right" style={headCellStyle}>
                                        {t('writing.reports.col_words')}
                                    </th>
                                    <th className="px-2 py-1 text-right" style={headCellStyle}>
                                        {t('writing.reports.col_distinct_chars')}
                                    </th>
                                    <th className="py-1 pl-2 text-left" style={headCellStyle}>
                                        {t('writing.reports.col_top_chars')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {actBreakdown.map((act, actIndex) => {
                                    const visible = act.characters.slice(0, ACT_CHIPS_MAX);
                                    const overflow = act.characters.length - visible.length;
                                    return (
                                        <tr key={actIndex} style={rowBorderStyle}>
                                            <td className="py-1.5 pr-2 font-medium">{act.label}</td>
                                            <td className="px-2 py-1.5 text-right tabular-nums" style={mutedCellStyle}>
                                                {act.sections.toLocaleString()}
                                            </td>
                                            <td className="px-2 py-1.5 text-right tabular-nums" style={mutedCellStyle}>
                                                {act.words.toLocaleString()}
                                            </td>
                                            <td className="px-2 py-1.5 text-right tabular-nums" style={mutedCellStyle}>
                                                {act.distinct_characters.toLocaleString()}
                                            </td>
                                            <td className="py-1.5 pl-2">
                                                <span className="flex flex-wrap gap-1">
                                                    {visible.map((char) => (
                                                        <span key={char.slug} style={chipStyle}>
                                                            {char.name}
                                                        </span>
                                                    ))}
                                                    {overflow > 0 && (
                                                        <span style={overflowChipStyle}>+{overflow}</span>
                                                    )}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </ReportCard>
    );
}
