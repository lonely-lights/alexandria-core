import type { CSSProperties, ReactNode } from 'react';
import useT from '@alexandria/hooks/useT';
import type { ProjectStats } from '@alexandria/types/projects';

interface StatsBarProps {
    stats: ProjectStats;
    /**
     * Right-aligned slot for a dot menu / overflow control. The mobile
     * Show.tsx layout drops the PageHeader breadcrumb strip entirely
     * (no breadcrumbs to render, classification tabs already collapsed
     * into this dot menu), so the menu re-homes here to share a single
     * band with the stats numbers. Pass `undefined` on viewports where
     * the menu lives elsewhere (e.g. the desktop PageHeader strip).
     */
    menu?: ReactNode;
}

const STATS_CONFIG = [
    { key: 'total_entries' as const, singularKey: 'projects.stats.entry.singular', pluralKey: 'projects.stats.entry.plural', icon: 'fa-file-lines', accent: 'var(--theme-brand-primary-500)' },
    { key: 'total_blueprints' as const, singularKey: 'projects.stats.blueprint.singular', pluralKey: 'projects.stats.blueprint.plural', icon: 'fa-cube', accent: 'var(--theme-brand-secondary-500)' },
    // Legacy used DaisyUI's `text-accent` (a third-tier hue, often
    // teal/green). Our theme tokens don't have an accent stop, so map
    // to status-success-stroke — closest semantic match + keeps the
    // members icon visually distinct from the brand-secondary-tinted
    // blueprints icon next to it.
    { key: 'members_count' as const, singularKey: 'projects.stats.member.singular', pluralKey: 'projects.stats.member.plural', icon: 'fa-users', accent: 'var(--theme-status-success-stroke)' },
    { key: 'ai_transactions_count' as const, singularKey: 'projects.stats.ai_this_month', pluralKey: 'projects.stats.ai_this_month', icon: 'fa-microchip', accent: 'var(--theme-status-info-stroke)' },
];

const barStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
};

const subtleText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

export default function StatsBar({ stats, menu }: StatsBarProps) {
    const t = useT();
    return (
        <div style={barStyle}>
            {/* gap-4 on mobile (was gap-8) so four numbers + icons fit
                comfortably at 320–375 viewports without crowding. sm:
                relaxes back to the original gap-8. The wrapper
                justify-between pushes the optional menu slot to the
                right edge so it shares this band with the stats. */}
            <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4 sm:gap-8">
                    {STATS_CONFIG.map(({ key, singularKey, pluralKey, icon, accent }) => {
                        const label = stats[key] === 1 ? t(singularKey) : t(pluralKey);
                        return (
                            <div key={key} className="flex items-center gap-2 text-sm">
                                <i className={`fa-solid ${icon}`} style={{ color: accent }} aria-hidden="true" />
                                <span className="font-semibold">{stats[key].toLocaleString()}</span>
                                {/* Label stays in the DOM at every viewport so
                                    screen readers read "661 entries", not a
                                    bare "661". sr-only hides it visually
                                    below sm: to keep the compact icon+number
                                    layout there. */}
                                <span className="sr-only sm:not-sr-only sm:inline" style={subtleText}>
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>
                {menu && <div className="flex-shrink-0">{menu}</div>}
            </div>
        </div>
    );
}
