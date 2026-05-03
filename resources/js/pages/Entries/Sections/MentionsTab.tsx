import { useMemo, useState } from 'react';
import EntryLink from '@alexandria/components/entries/EntryLink';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import type { MentionEntry } from '../Show';

interface MentionsTabProps {
    entries: MentionEntry[];
    title: string;
}

type SortKey = 'default' | 'name-asc' | 'name-desc' | 'count-desc' | 'count-asc';

const SORT_LABELS: Record<SortKey, string> = {
    'default': 'Default',
    'name-asc': 'Name A → Z',
    'name-desc': 'Name Z → A',
    'count-desc': 'Most mentions',
    'count-asc': 'Fewest mentions',
};

export default function MentionsTab({ entries, title }: MentionsTabProps) {
    if (entries.length === 0) {
        return (
            <div className="paper-board rounded-2xl border border-base-content/10">
                <div className="flex flex-col items-center bg-base-200 py-16 text-center" style={{ borderRadius: 'inherit' }}>
                    <i className="fa-solid fa-at mb-3 text-3xl text-base-content/20" />
                    <p className="text-sm font-medium text-base-content/40">No mentions</p>
                </div>
            </div>
        );
    }

    // Group by blueprint name
    const grouped = entries.reduce<Record<string, MentionEntry[]>>((acc, e) => {
        const key = e.blueprint_name ?? 'Other';
        if (!acc[key]) acc[key] = [];
        acc[key].push(e);
        return acc;
    }, {});

    const icon = title === 'Mentioned In' ? 'fa-solid fa-reply' : 'fa-solid fa-at';

    return (
        <div className="space-y-6">
            {Object.entries(grouped).map(([blueprintName, items]) => (
                <MentionGroupCard key={blueprintName} blueprintName={blueprintName} items={items} icon={icon} />
            ))}
        </div>
    );
}

function MentionGroupCard({ blueprintName, items, icon }: { blueprintName: string; items: MentionEntry[]; icon: string }) {
    const [sort, setSort] = useState<SortKey>('default');

    const sorted = useMemo(() => sortMentions(items, sort), [items, sort]);

    const sortItems = (Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({
        label: SORT_LABELS[k],
        icon: sort === k ? 'fa-solid fa-check' : undefined,
        onClick: () => setSort(k),
    }));

    return (
        <div className="paper-board rounded-2xl border border-base-content/10">
            <div className="overflow-hidden bg-base-200" style={{ borderRadius: 'inherit' }}>
                <div
                    className="flex items-center gap-2 border-b border-base-300 px-5 py-3 text-primary-content"
                    style={{ background: 'linear-gradient(90deg, oklch(var(--p) / 0.8), oklch(var(--p) / 0.6))' }}
                >
                    <i className={`${icon} text-xs text-primary-content/60`} />
                    <h3 className="text-sm font-semibold">{blueprintName}</h3>
                    <span className="ml-auto rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {items.length} {items.length === 1 ? 'mention' : 'mentions'}
                    </span>
                    <DropdownMenu
                        align="right"
                        trigger={
                            <button
                                type="button"
                                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                                    sort !== 'default'
                                        ? 'bg-primary-content/15 text-primary-content ring-1 ring-primary-content/20'
                                        : 'text-primary-content/70 hover:bg-primary-content/10 hover:text-primary-content'
                                }`}
                                title="Sort"
                            >
                                <i className="fa-solid fa-arrow-down-short-wide text-[11px]" />
                                <span>{SORT_LABELS[sort]}</span>
                            </button>
                        }
                        items={sortItems}
                    />
                </div>
                <div className="divide-y divide-dashed divide-base-content/10">
                    {sorted.map((entry) => (
                        <div key={entry.id} className="flex items-center gap-3 bg-row-tint px-5 py-3.5 transition-colors hover:bg-base-200/50">
                            <EntryLink entryId={entry.id} href={entry.url} className="flex-1 text-sm font-medium text-base-content hover:underline">
                                {entry.name}
                            </EntryLink>
                            {entry.mention_count > 1 && (
                                <span className="badge badge-sm border border-base-content/10 bg-base-100 font-normal text-base-content/80">
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
