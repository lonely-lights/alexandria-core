import { useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import gsap from 'gsap';
import BlueprintStatCard from '@alexandria/components/projects/BlueprintStatCard';
import { classificationLabel } from '@alexandria/config/classifications';
import type { DashboardBlueprintCard, BlueprintCard } from '@alexandria/types/projects';

interface DashboardTabProps {
    dashboardBlueprints: DashboardBlueprintCard[];
    allBlueprints?: BlueprintCard[];
    classification?: string;
    viewMode?: 'expanded' | 'list';
}

export default function DashboardTab({ dashboardBlueprints, allBlueprints = [], classification = 'standard', viewMode = 'expanded' }: DashboardTabProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const prevViewMode = useRef(viewMode);

    useEffect(() => {
        if (prevViewMode.current !== viewMode && containerRef.current) {
            gsap.fromTo(containerRef.current,
                { opacity: 0, y: 8 },
                { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' },
            );
        }
        prevViewMode.current = viewMode;
    }, [viewMode]);

    // Blueprints with dashboard cards (have recent entries)
    const dashboardIds = new Set(dashboardBlueprints.map((bp) => bp.id));
    // Blueprints without dashboard cards (no show_on_dashboard or no recent entries)
    const otherBlueprints = allBlueprints.filter((bp) => !dashboardIds.has(bp.id));

    if (dashboardBlueprints.length === 0 && otherBlueprints.length === 0) {
        return (
            <div className="paper-board rounded-2xl border border-base-300/50">
                <div className="bg-base-100 py-12 text-center" style={{ borderRadius: 'inherit' }}>
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-base-300">
                        <i className="fa-solid fa-cube text-2xl text-base-content/30" />
                    </div>
                    <h3 className="text-lg font-medium">No {classificationLabel(classification).toLowerCase()} blueprints</h3>
                    <p className="mt-1 text-sm text-base-content/50">
                        Create a blueprint to get started.
                    </p>
                </div>
            </div>
        );
    }

    // List view — all blueprints in a single stats table
    if (viewMode === 'list') {
        return (
            <div ref={containerRef}>
                <BlueprintTable blueprints={allBlueprints} dashboardBlueprints={dashboardBlueprints} />
            </div>
        );
    }

    // Expanded view — dashboard cards + simple cards for the rest.
    // Relationship cards are wider (each row spans source → target) so
    // the grid tops out at 2 columns; other classifications pack 3-up.
    const expandedGridCols = classification === 'relationship'
        ? 'sm:grid-cols-1 lg:grid-cols-2'
        : 'sm:grid-cols-2 lg:grid-cols-3';

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
                    <BlueprintTable blueprints={otherBlueprints} dashboardBlueprints={dashboardBlueprints} />
                </div>
            )}
        </div>
    );
}

/* ── Blueprint Stats Table ──
   Rows are clickable (navigates to the blueprint). Uses .paper-table so
   tf themes get the warm-paper zebra + yellow header; other themes fall
   through to DaisyUI's default table styles. */

interface BlueprintTableProps {
    blueprints: BlueprintCard[];
    dashboardBlueprints: DashboardBlueprintCard[];
}

function BlueprintTable({ blueprints, dashboardBlueprints }: BlueprintTableProps) {
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
        <div className="paper-board rounded-2xl border border-base-300/50">
            <div className="overflow-x-auto bg-base-200 shadow-sm" style={{ borderRadius: 'inherit' }}>
                {/* Fixed widths on the secondary columns so Blueprint (name
                    + Dashboard pill) gets the remaining horizontal room,
                    with a firm min-width to keep the name from collapsing
                    on narrow viewports. */}
                <table className="paper-table w-full [&_td]:px-4 [&_td]:py-2.5 [&_th]:px-4 [&_th]:py-3">
                    <thead>
                        <tr className="text-xs tracking-wider [&_th]:normal-case">
                            <th className="bg-primary font-semibold text-primary-content text-left min-w-[18rem] first:rounded-tl-2xl">Blueprint</th>
                            <th className="bg-primary font-semibold text-primary-content text-center w-24">Entries</th>
                            <th className="bg-primary font-semibold text-primary-content text-left w-40">Last Update</th>
                            <th className="bg-primary font-semibold text-primary-content w-8 last:rounded-tr-2xl" aria-label="Open" />
                        </tr>
                    </thead>
                    <tbody>
                        {blueprints.map((bp) => (
                            <BlueprintRow key={bp.id} bp={bp} lastUpdate={recentByBp.get(bp.id) ?? null} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function BlueprintRow({ bp, lastUpdate }: { bp: BlueprintCard; lastUpdate: string | null }) {
    const iconClass = bp.icon ? (bp.icon.includes(' ') ? bp.icon : `fa-solid ${bp.icon}`) : 'fa-solid fa-cube';
    return (
        <tr
            onClick={() => router.visit(bp.url)}
            className="group cursor-pointer"
        >
            <td>
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <i className={`${iconClass} text-sm text-primary`} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{bp.name}</span>
                            {bp.show_on_dashboard && (
                                <span className="badge badge-ghost badge-xs text-[10px]">
                                    <i className="fa-solid fa-star mr-1 text-[8px]" />
                                    Dashboard
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            <td className="text-center">
                <span className="badge badge-secondary badge-sm tabular-nums">{bp.entries_count.toLocaleString()}</span>
            </td>
            <td className="text-xs text-base-content/40">
                {lastUpdate ?? <span className="italic text-base-content/30">—</span>}
            </td>
            <td className="w-8 text-right">
                <i className="fa-solid fa-chevron-right text-xs text-base-content/30 transition-transform group-hover:translate-x-0.5" />
            </td>
        </tr>
    );
}
