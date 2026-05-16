import { useRef, useEffect, type CSSProperties } from 'react';
import { router } from '@inertiajs/react';
import gsap from 'gsap';
import BlueprintStatCard from '@alexandria/components/projects/BlueprintStatCard';
import useT, { type Translator } from '@alexandria/hooks/useT';
import { classificationLabel } from '@alexandria/config/classifications';
import type { DashboardBlueprintCard, BlueprintCard } from '@alexandria/types/projects';

interface DashboardTabProps {
    dashboardBlueprints: DashboardBlueprintCard[];
    allBlueprints?: BlueprintCard[];
    classification?: string;
    viewMode?: 'expanded' | 'list';
}

/* ── Theme styles ── */

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };

const emptyCardOuterStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const emptyCardInnerStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    borderRadius: 'inherit',
};

const emptyIconBubbleStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: '9999px',
};

const tableCardOuterStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-300) 50%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

// The inner wrapper sits on --theme-base-200 so the paper-table tf-dark
// zebra rule (`tbody tr:nth-child(even) { background: rgba(255,255,255,
// 0.025); }`) reads as a soft tone shift over the table surface. A
// uniform base-content overlay here would wash out the per-row tint and
// flatten the zebra into a single block.
const tableInnerStyle: CSSProperties = {
    background: 'var(--theme-base-200)',
    borderRadius: 'inherit',
    boxShadow: '0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const tableHeaderCellStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    fontWeight: 600,
};

const rowIconBubbleStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    borderRadius: 'var(--theme-radius-input)',
};

const dashboardBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.0625rem 0.375rem',
    fontSize: '0.625rem',
    display: 'inline-flex',
    alignItems: 'center',
};

const entriesBadgeStyle: CSSProperties = {
    background: 'var(--theme-brand-secondary-500)',
    color: 'var(--theme-brand-secondary-content)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'inline-block',
};

export default function DashboardTab({ dashboardBlueprints, allBlueprints = [], classification = 'standard', viewMode = 'expanded' }: DashboardTabProps) {
    const t = useT();
    const containerRef = useRef<HTMLDivElement>(null);
    const prevViewMode = useRef(viewMode);

    useEffect(() => {
        const el = containerRef.current;
        if (prevViewMode.current === viewMode || !el) return;
        prevViewMode.current = viewMode;
        gsap.fromTo(
            el,
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' },
        );
        // Kill in-flight tween if the component unmounts mid-fade —
        // closes H-EFFECT-7 family. (Intentionally skip-on-mount via
        // the prevViewMode ref above, so useEnterAnimation's always-
        // fire-on-mount semantic doesn't fit here.)
        return () => { gsap.killTweensOf(el); };
    }, [viewMode]);

    // Blueprints with dashboard cards (have recent entries)
    const dashboardIds = new Set(dashboardBlueprints.map((bp) => bp.id));
    // Blueprints without dashboard cards (no show_on_dashboard or no recent entries)
    const otherBlueprints = allBlueprints.filter((bp) => !dashboardIds.has(bp.id));

    if (dashboardBlueprints.length === 0 && otherBlueprints.length === 0) {
        return (
            <div className="paper-board" style={emptyCardOuterStyle}>
                <div className="py-12 text-center" style={emptyCardInnerStyle}>
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center" style={emptyIconBubbleStyle}>
                        <i className="fa-solid fa-cube text-2xl" style={microText} aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-medium">
                        {t('projects.dashboard_tab.empty.title').replace(':classification', classificationLabel(classification).toLowerCase())}
                    </h3>
                    <p className="mt-1 text-sm" style={labelText}>
                        {t('projects.dashboard_tab.empty.subtitle')}
                    </p>
                </div>
            </div>
        );
    }

    // List view — all blueprints in a single stats table
    if (viewMode === 'list') {
        return (
            <div ref={containerRef}>
                <BlueprintTable blueprints={allBlueprints} dashboardBlueprints={dashboardBlueprints} t={t} />
            </div>
        );
    }

    // Expanded view — dashboard cards + simple cards for the rest.
    // Mobile gets an explicit single column. Without grid-cols-1 the
    // grid defaults to `grid-template-columns: none`, letting card
    // content (40px icon + min-content title + chevron + gap + p-4) size
    // the column to its intrinsic width (~420px), which overflows phone
    // viewports and drags every position:fixed element along with it.
    // Relationship cards stay 2-up max (each row spans source → target);
    // other classifications pack 3-up.
    const expandedGridCols = classification === 'relationship'
        ? 'grid-cols-1 lg:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

    return (
        <div ref={containerRef}>
            {dashboardBlueprints.length > 0 && (
                <div className={`grid gap-4 ${expandedGridCols}`}>
                    {dashboardBlueprints.map((bp) => (
                        <BlueprintStatCard key={bp.id} blueprint={bp} />
                    ))}
                </div>
            )}

            {otherBlueprints.length > 0 && (
                <div className={dashboardBlueprints.length > 0 ? 'mt-4' : ''}>
                    <BlueprintTable blueprints={otherBlueprints} dashboardBlueprints={dashboardBlueprints} t={t} />
                </div>
            )}
        </div>
    );
}

/* ── Blueprint Stats Table ──
   Rows are clickable (navigates to the blueprint). Uses .paper-table so
   tf themes get the warm-paper zebra + yellow header; other themes fall
   through to default table styles. */

interface BlueprintTableProps {
    blueprints: BlueprintCard[];
    dashboardBlueprints: DashboardBlueprintCard[];
    t: Translator;
}

function BlueprintTable({ blueprints, dashboardBlueprints, t }: BlueprintTableProps) {
    // Build id → latest recent entry updated_at lookup once so rows can
    // surface a "last updated" column without refetching per row.
    const recentByBp = new Map<number, string>();
    for (const bp of dashboardBlueprints) {
        const latest = bp.recent_entries[0]?.updated_at;
        if (latest) {
            recentByBp.set(bp.id, latest);
        }
    }

    return (
        <div className="paper-board" style={tableCardOuterStyle}>
            <div className="overflow-x-auto" style={tableInnerStyle}>
                <table className="paper-table w-full [&_td]:px-4 [&_td]:py-2.5 [&_th]:px-4 [&_th]:py-3">
                    <thead>
                        <tr className="text-xs tracking-wider [&_th]:normal-case">
                            <th className="text-left min-w-[18rem] first:rounded-tl-[var(--theme-radius-card)]" style={tableHeaderCellStyle}>
                                {t('projects.dashboard_tab.table.column.blueprint')}
                            </th>
                            <th className="text-center w-24" style={tableHeaderCellStyle}>
                                {t('projects.dashboard_tab.table.column.entries')}
                            </th>
                            <th className="text-left w-40" style={tableHeaderCellStyle}>
                                {t('projects.dashboard_tab.table.column.last_update')}
                            </th>
                            <th
                                className="w-8 last:rounded-tr-[var(--theme-radius-card)]"
                                style={tableHeaderCellStyle}
                                aria-label={t('projects.dashboard_tab.table.column.open_aria')}
                            />
                        </tr>
                    </thead>
                    <tbody>
                        {blueprints.map((bp) => (
                            <BlueprintRow
                                key={bp.id}
                                bp={bp}
                                lastUpdate={recentByBp.get(bp.id) ?? null}
                                t={t}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function BlueprintRow({ bp, lastUpdate, t }: { bp: BlueprintCard; lastUpdate: string | null; t: Translator }) {
    const iconClass = bp.icon ? (bp.icon.includes(' ') ? bp.icon : `fa-solid ${bp.icon}`) : 'fa-solid fa-cube';
    return (
        <tr
            onClick={() => router.visit(bp.url)}
            className="group cursor-pointer"
        >
            <td>
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center" style={rowIconBubbleStyle}>
                        <i className={`${iconClass} text-sm`} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{bp.name}</span>
                            {bp.show_on_dashboard && (
                                <span style={dashboardBadgeStyle}>
                                    <i className="fa-solid fa-star mr-1 text-[8px]" aria-hidden="true" />
                                    {t('projects.dashboard_tab.table.dashboard_badge')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            <td className="text-center">
                <span className="tabular-nums" style={entriesBadgeStyle}>{bp.entries_count.toLocaleString()}</span>
            </td>
            <td className="text-xs" style={fadedText}>
                {lastUpdate ?? <span className="italic" style={microText}>{t('projects.dashboard_tab.table.dash')}</span>}
            </td>
            <td className="w-8 text-right">
                <i
                    className="fa-solid fa-chevron-right text-xs transition-transform group-hover:translate-x-0.5"
                    style={microText}
                    aria-hidden="true"
                />
            </td>
        </tr>
    );
}
