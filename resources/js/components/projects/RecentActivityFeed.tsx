import type { CSSProperties } from 'react';
import EntryLink from '@alexandria/components/entries/EntryLink';
import useT from '@alexandria/hooks/useT';
import type { RecentEntryItem } from '@alexandria/types/projects';

interface RecentActivityFeedProps {
    entries: RecentEntryItem[];
}

const emptyText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const subtitleText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const timestampText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const iconBubbleText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };

const rowStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-input)',
    transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const iconBubbleStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
};

export default function RecentActivityFeed({ entries }: RecentActivityFeedProps) {
    const t = useT();

    if (entries.length === 0) {
        return (
            <div className="py-6 text-center text-sm" style={emptyText}>
                {t('projects.activity_feed.empty')}
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
                        className="alex-notes-tag-row flex items-center gap-3 px-3 py-2"
                        style={rowStyle}
                    >
                        {entry.thumbnail_url ? (
                            <img src={entry.thumbnail_url} alt="" className="aspect-square w-8 flex-shrink-0 rounded-lg object-cover" />
                        ) : (
                            <div className="flex aspect-square w-8 flex-shrink-0 items-center justify-center" style={iconBubbleStyle}>
                                <i className={`${iconClass} text-xs fa-fw`} style={iconBubbleText} aria-hidden="true" />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{entry.name}</p>
                            <p className="text-xs" style={subtitleText}>{entry.blueprint_name}</p>
                        </div>
                        {entry.updated_at && (
                            <span className="flex-shrink-0 text-xs" style={timestampText}>{entry.updated_at}</span>
                        )}
                    </EntryLink>
                );
            })}
        </div>
    );
}
