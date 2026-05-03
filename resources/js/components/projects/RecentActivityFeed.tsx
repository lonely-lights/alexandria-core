import EntryLink from '@alexandria/components/entries/EntryLink';
import type { RecentEntryItem } from '@alexandria/types/projects';

interface RecentActivityFeedProps {
    entries: RecentEntryItem[];
}

export default function RecentActivityFeed({ entries }: RecentActivityFeedProps) {
    if (entries.length === 0) {
        return (
            <div className="py-6 text-center text-sm text-base-content/40">
                No recent activity
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {entries.map((entry) => {
                const iconClass = entry.blueprint_icon
                    ? (entry.blueprint_icon.includes(' ') ? entry.blueprint_icon : `fa-solid ${entry.blueprint_icon}`)
                    : 'fa-solid fa-file';

                return (
                    <EntryLink
                        key={entry.id}
                        entryId={entry.id}
                        href={entry.url ?? '#'}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-base-200"
                    >
                        {entry.thumbnail_url ? (
                            <img src={entry.thumbnail_url} alt="" className="aspect-square w-8 flex-shrink-0 rounded-lg object-cover" />
                        ) : (
                            <div className="flex aspect-square w-8 flex-shrink-0 items-center justify-center rounded-lg bg-base-300">
                                <i className={`${iconClass} text-xs text-base-content/50 fa-fw`} />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{entry.name}</p>
                            <p className="text-xs text-base-content/40">{entry.blueprint_name}</p>
                        </div>
                        {entry.updated_at && (
                            <span className="flex-shrink-0 text-xs text-base-content/30">{entry.updated_at}</span>
                        )}
                    </EntryLink>
                );
            })}
        </div>
    );
}
