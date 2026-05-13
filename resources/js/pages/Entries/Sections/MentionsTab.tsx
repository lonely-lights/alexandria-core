import { useMemo, useState, type CSSProperties } from 'react';
import useT, { type Translator } from '@alexandria/hooks/useT';
import EntryLink from '@alexandria/components/entries/EntryLink';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import type { MentionEntry } from '../Show';
import {
    cardOuter,
    cardInner,
    emptyStateInner,
    emptyIconStyle,
    emptyLabelStyle,
    gradientHeaderPrimary,
    headerIconPrimaryMuted,
    countBadge,
    sortTriggerPrimaryActive,
    sortTriggerPrimaryIdle,
    rowDivider,
    chipStyle,
} from './entriesTabStyles';

interface MentionsTabProps {
    entries: MentionEntry[];
    title: string;
}

type SortKey = 'default' | 'name-asc' | 'name-desc' | 'count-desc' | 'count-asc';

function sortLabels(t: Translator): Record<SortKey, string> {
    return {
        'default': t('entries.tab.sort.default'),
        'name-asc': t('entries.tab.sort.name_asc'),
        'name-desc': t('entries.tab.sort.name_desc'),
        'count-desc': t('entries.tab.mention.sort.most'),
        'count-asc': t('entries.tab.mention.sort.fewest'),
    };
}

const linkStyle: CSSProperties = {
    color: 'var(--theme-base-content)',
};

export default function MentionsTab({ entries, title }: MentionsTabProps) {
    const t = useT();

    if (entries.length === 0) {
        return (
            <div className="paper-board" style={cardOuter}>
                <div style={emptyStateInner}>
                    <i className="fa-solid fa-at mb-3 text-3xl" style={emptyIconStyle} />
                    <p className="text-sm font-medium" style={emptyLabelStyle}>{t('entries.tab.mention.empty')}</p>
                </div>
            </div>
        );
    }

    // Group by blueprint name
    const grouped = entries.reduce<Record<string, MentionEntry[]>>((acc, e) => {
        const key = e.blueprint_name ?? t('entries.tab.mention.default_group');
        if (!acc[key]) acc[key] = [];
        acc[key].push(e);
        return acc;
    }, {});

    // Detect the "Mentioned In" variant by comparing the passed title to its
    // translation; lets the parent control which icon shows up.
    const mentionedInTitle = t('entries.show.mentions_title.mentioned_in');
    const icon = title === mentionedInTitle ? 'fa-solid fa-reply' : 'fa-solid fa-at';

    return (
        <div className="space-y-6">
            {Object.entries(grouped).map(([blueprintName, items]) => (
                <MentionGroupCard key={blueprintName} blueprintName={blueprintName} items={items} icon={icon} />
            ))}
        </div>
    );
}

function MentionGroupCard({ blueprintName, items, icon }: { blueprintName: string; items: MentionEntry[]; icon: string }) {
    const t = useT();
    const labels = sortLabels(t);
    const [sort, setSort] = useState<SortKey>('default');

    const sorted = useMemo(() => sortMentions(items, sort), [items, sort]);

    const sortItems = (Object.keys(labels) as SortKey[]).map((k) => ({
        label: labels[k],
        icon: sort === k ? 'fa-solid fa-check' : undefined,
        onClick: () => setSort(k),
    }));

    const isActive = sort !== 'default';

    return (
        <div className="paper-board" style={cardOuter}>
            <div className="overflow-hidden" style={cardInner}>
                <div className="flex items-center gap-2 px-5 py-3" style={gradientHeaderPrimary}>
                    <i className={`${icon} text-xs`} style={headerIconPrimaryMuted} />
                    <h3 className="text-sm font-semibold">{blueprintName}</h3>
                    <span style={countBadge}>
                        {t(items.length === 1 ? 'entries.tab.mention.count.singular' : 'entries.tab.mention.count.plural').replace(':count', String(items.length))}
                    </span>
                    <DropdownMenu
                        align="right"
                        trigger={
                            <button
                                type="button"
                                style={isActive ? sortTriggerPrimaryActive : sortTriggerPrimaryIdle}
                            >
                                <i className="fa-solid fa-arrow-down-short-wide text-[11px]" />
                                <span>{labels[sort]}</span>
                            </button>
                        }
                        items={sortItems}
                    />
                </div>
                <div>
                    {sorted.map((entry, i) => (
                        <div
                            key={entry.id}
                            className="alex-row flex items-center gap-3 px-5 py-3.5"
                            style={i > 0 ? rowDivider : undefined}
                        >
                            <EntryLink entryId={entry.id} href={entry.url} className="flex-1 text-sm font-medium hover:underline" style={linkStyle}>
                                {entry.name}
                            </EntryLink>
                            {entry.mention_count > 1 && (
                                <span style={chipStyle}>
                                    {entry.mention_count}×
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function sortMentions(items: MentionEntry[], key: SortKey): MentionEntry[] {
    if (key === 'default') return items;
    const sorted = [...items];
    switch (key) {
        case 'name-asc':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            sorted.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'count-desc':
            sorted.sort((a, b) => b.mention_count - a.mention_count);
            break;
        case 'count-asc':
            sorted.sort((a, b) => a.mention_count - b.mention_count);
            break;
    }
    return sorted;
}
