import { Link } from '@inertiajs/react';
import { useMemo, useState, type CSSProperties } from 'react';

import type { Translator } from '@alexandria/hooks/useT';
import Input from '@alexandria/components/form/Input';
import Select from '@alexandria/components/form/Select';

import type { CharacterReportRow } from '../../Reports';
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

const emptyStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

export default function CharactersReport({
    characters,
    projectSlug,
    workSlug,
    t,
}: {
    characters: CharacterReportRow[];
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </ReportCard>
    );
}
