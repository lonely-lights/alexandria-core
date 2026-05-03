import type { ProjectStats } from '@alexandria/types/projects';

interface StatsBarProps {
    stats: ProjectStats;
}

const STATS_CONFIG = [
    { key: 'total_entries' as const, singular: 'Entry', plural: 'Entries', icon: 'fa-file-lines', color: 'text-primary' },
    { key: 'total_blueprints' as const, singular: 'Blueprint', plural: 'Blueprints', icon: 'fa-cube', color: 'text-secondary' },
    { key: 'members_count' as const, singular: 'Member', plural: 'Members', icon: 'fa-users', color: 'text-accent' },
    { key: 'ai_transactions_count' as const, singular: 'AI This Month', plural: 'AI This Month', icon: 'fa-microchip', color: 'text-info' },
];

export default function StatsBar({ stats }: StatsBarProps) {
    return (
        <div className="border-b border-base-content/10 bg-base-200/30">
            <div className="container mx-auto flex max-w-7xl justify-center gap-8 px-4 py-3 sm:justify-start">
                {STATS_CONFIG.map(({ key, singular, plural, icon, color }) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                        <i className={`fa-solid ${icon} ${color}`} />
                        <span className="font-semibold">{stats[key].toLocaleString()}</span>
                        <span className="hidden text-base-content/50 sm:inline">{stats[key] === 1 ? singular : plural}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
