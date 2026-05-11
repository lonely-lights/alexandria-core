import type { CSSProperties } from 'react';
import useT from '@alexandria/hooks/useT';
import type { ProjectStats } from '@alexandria/types/projects';

interface StatsBarProps {
    stats: ProjectStats;
}

const STATS_CONFIG = [
    { key: 'total_entries' as const, singularKey: 'projects.stats.entry.singular', pluralKey: 'projects.stats.entry.plural', icon: 'fa-file-lines', accent: 'var(--theme-brand-primary-500)' },
    { key: 'total_blueprints' as const, singularKey: 'projects.stats.blueprint.singular', pluralKey: 'projects.stats.blueprint.plural', icon: 'fa-cube', accent: 'var(--theme-brand-secondary-500)' },
    { key: 'members_count' as const, singularKey: 'projects.stats.member.singular', pluralKey: 'projects.stats.member.plural', icon: 'fa-users', accent: 'var(--theme-brand-secondary-700)' },
    { key: 'ai_transactions_count' as const, singularKey: 'projects.stats.ai_this_month', pluralKey: 'projects.stats.ai_this_month', icon: 'fa-microchip', accent: 'var(--theme-status-info-stroke)' },
];

const barStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 3%, transparent)',
};

const subtleText: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

export default function StatsBar({ stats }: StatsBarProps) {
    const t = useT();
    return (
        <div style={barStyle}>
            <div className="container mx-auto flex max-w-7xl justify-center gap-8 px-4 py-3 sm:justify-start">
                {STATS_CONFIG.map(({ key, singularKey, pluralKey, icon, accent }) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                        <i className={`fa-solid ${icon}`} style={{ color: accent }} aria-hidden="true" />
                        <span className="font-semibold">{stats[key].toLocaleString()}</span>
                        <span className="hidden sm:inline" style={subtleText}>
                            {stats[key] === 1 ? t(singularKey) : t(pluralKey)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
