import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';

import { stanceAccent, stanceInitial } from './patternChips';
import { oldestPromiseRows, totalPromiseCount, type PromiseTableRow } from './promiseRows';
import type { PatternStance } from './threadApi';
import usePromiseGroups from './usePromiseGroups';

/**
 * Sidebar rail's "Open promises" card — the writing hub's ambient pulse
 * (2026-08-29-devices-tropes rework-1, owner ruling: "An Open Promises
 * card joins the sticky works/stats rail: count, oldest few threads,
 * status dots, always visible while you scroll."). Sits in
 * `WritingSidebar` between the stats panel and the works panel, styled
 * to match those cards' own idiom (duplicated locally rather than
 * shared — see Index.tsx / StructureTree.tsx, which each keep their own
 * copy of this small panel-token set).
 *
 * Data comes from the SAME `threadApi.fetchPromises` cross-work
 * endpoint `OpenPromisesList` (the full library-panel archive) already
 * uses — fetched independently here (once on mount, lazy, non-blocking)
 * rather than lifted to a shared parent, since the two surfaces mount
 * in different places (sticky rail vs. main column) and neither should
 * block on the other. Row flattening/sorting/limiting is the pure,
 * tested logic in `promiseRows.ts` (`oldestPromiseRows`/
 * `totalPromiseCount`) — shared with the library panel's row-building
 * rather than re-implemented here.
 */

export interface PromisesRailCardProps {
    projectSlug: string;
}

const RAIL_LIMIT = 5;

const panelStyle: CSSProperties = {
    background:
        'linear-gradient(145deg, color-mix(in srgb, var(--theme-surface-card) 96%, var(--theme-brand-primary-500) 4%), var(--theme-surface-card))',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    boxShadow: '0 18px 48px color-mix(in srgb, #000 9%, transparent)',
};

const panelHeaderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};

const panelIconStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    border: '1px solid color-mix(in srgb, var(--theme-brand-primary-500) 18%, transparent)',
};

const countBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 7%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 62%, transparent)',
};

const mutedTextStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const rowStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-button)',
};

const footerLinkStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};

function stanceDotStyle(stance: PatternStance | null): CSSProperties {
    const accent = stanceAccent(stance);

    return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1rem',
        height: '1rem',
        borderRadius: '999px',
        border: `1px solid ${accent.border}`,
        background: accent.wash,
        color: accent.border,
        fontSize: '0.5625rem',
        fontWeight: 700,
        flexShrink: 0,
    };
}

/** Scrolls the writing hub's library panel into view — the same
 *  `[data-writing-patterns-section]` anchor `Index.tsx` keeps on that
 *  panel for exactly this purpose. */
function scrollToLibrary() {
    document
        .querySelector('[data-writing-patterns-section]')
        ?.scrollIntoView({ behavior: 'smooth' });
}

function PromiseRailRow({ row, t }: { row: PromiseTableRow; t: ReturnType<typeof useT> }) {
    return (
        <div className="flex flex-col gap-0.5 px-2 py-1.5" style={rowStyle}>
            <div className="flex items-center gap-2">
                <span style={stanceDotStyle(row.stance)} aria-hidden="true">
                    {stanceInitial(row.stance)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.title}</span>
            </div>
            <div className="flex items-center gap-1.5 pl-6 text-xs" style={mutedTextStyle}>
                <span className="min-w-0 truncate">{row.card_name}</span>
                <span aria-hidden="true">&middot;</span>
                <span className="min-w-0 truncate">{row.scope_title}</span>
                {row.unplanted && (
                    <span className="shrink-0 italic">{t('writing.reports.promises_unplanted')}</span>
                )}
            </div>
        </div>
    );
}

export default function PromisesRailCard({ projectSlug }: PromisesRailCardProps) {
    const t = useT();
    const { groups, failed } = usePromiseGroups(projectSlug);

    const total = groups === null ? 0 : totalPromiseCount(groups);
    const rows = groups === null ? [] : oldestPromiseRows(groups, RAIL_LIMIT);

    return (
        <section className="shrink-0 overflow-hidden" style={panelStyle} data-writing-promises-panel>
            <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5" style={panelHeaderStyle}>
                <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={panelIconStyle}
                >
                    <i className="fa-solid fa-hourglass-half text-sm" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <h2 className="min-w-0 truncate font-serif text-lg font-bold tracking-tight">
                        {t('writing.threads.rail_heading')}
                    </h2>
                    {groups !== null && (
                        <span className="rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold" style={countBadgeStyle}>
                            {total.toLocaleString()}
                        </span>
                    )}
                </div>
            </div>

            <div className="px-3 py-3 sm:px-4">
                {failed && (
                    <p className="px-2 py-1 text-sm italic" style={{ color: 'var(--theme-status-error-stroke)' }}>
                        {t('writing.threads.rail_load_error')}
                    </p>
                )}

                {!failed && groups === null && (
                    <p className="px-2 py-1 text-sm italic" style={mutedTextStyle}>
                        {t('writing.library.loading')}
                    </p>
                )}

                {!failed && groups !== null && total === 0 && (
                    <p className="px-2 py-1 text-sm italic" style={mutedTextStyle}>
                        {t('writing.threads.rail_empty')}
                    </p>
                )}

                {rows.length > 0 && (
                    <div className="flex flex-col gap-1">
                        {rows.map((row) => (
                            <PromiseRailRow key={row.id} row={row} t={t} />
                        ))}
                    </div>
                )}
            </div>

            {total > RAIL_LIMIT && (
                <button
                    type="button"
                    className="flex w-full items-center justify-center gap-1 py-2 text-xs font-semibold"
                    style={footerLinkStyle}
                    onClick={scrollToLibrary}
                >
                    {t('writing.threads.rail_view_all').replace(':count', String(total))}
                    <i className="fa-solid fa-arrow-down text-[10px]" aria-hidden="true" />
                </button>
            )}
        </section>
    );
}
