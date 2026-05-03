import { useMemo, useState } from 'react';
import EntryLink from '@alexandria/components/entries/EntryLink';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import type { ConnectionSection } from '../Show';

interface ConnectionsTabProps {
    connections: ConnectionSection[];
    projectSlug: string;
}

type SortKey =
    | 'default'
    | 'name-asc'
    | 'name-desc'
    | 'pt-desc'
    | 'pt-asc';

const SORT_LABELS: Record<SortKey, string> = {
    'default': 'Default',
    'name-asc': 'Name A → Z',
    'name-desc': 'Name Z → A',
    'pt-desc': 'Most connections',
    'pt-asc': 'Fewest connections',
};

export default function ConnectionsTab({ connections }: ConnectionsTabProps) {
    if (connections.length === 0) {
        return (
            <div className="paper-board rounded-2xl border border-base-content/10">
                <div className="flex flex-col items-center bg-base-200 py-16 text-center" style={{ borderRadius: 'inherit' }}>
                    <i className="fa-solid fa-share-nodes mb-3 text-3xl text-base-content/20" />
                    <p className="text-sm font-medium text-base-content/40">No connections</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {connections.map((section, i) => (
                <ConnectionSectionCard key={i} section={section} />
            ))}
        </div>
    );
}

function ConnectionSectionCard({ section }: { section: ConnectionSection }) {
    const [sort, setSort] = useState<SortKey>('default');

    const sortedItems = useMemo(() => sortItems(section.items, sort), [section.items, sort]);

    const sortItemsList = (Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({
        label: SORT_LABELS[k],
        icon: sort === k ? 'fa-solid fa-check' : undefined,
        onClick: () => setSort(k),
    }));

    return (
        <div className="paper-board rounded-2xl border border-base-content/10">
            <div className="overflow-hidden bg-base-200" style={{ borderRadius: 'inherit' }}>
                {/* Section header */}
                <div
                    className="flex items-start gap-2 border-b border-base-300 px-5 py-3 text-secondary-content"
                    style={{ background: 'linear-gradient(90deg, oklch(var(--s) / 0.8), oklch(var(--s) / 0.6))' }}
                >
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-share-nodes text-xs text-secondary-content/60" />
                            <h3 className="text-sm font-semibold">{section.title}</h3>
                        </div>
                        {section.description && (
                            <p className="mt-0.5 text-xs font-medium text-secondary-content/60">{section.description}</p>
                        )}
                    </div>
                    <span className="flex-shrink-0 rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {section.items.length} {section.items.length === 1 ? 'connection' : 'connections'}
                    </span>
                    <DropdownMenu
                        align="right"
                        trigger={
                            <button
                                type="button"
                                className={`flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                                    sort !== 'default'
                                        ? 'bg-secondary-content/15 text-secondary-content ring-1 ring-secondary-content/20'
                                        : 'text-secondary-content/70 hover:bg-secondary-content/10 hover:text-secondary-content'
                                }`}
                                title="Sort"
                            >
                                <i className="fa-solid fa-arrow-down-short-wide text-[11px]" />
                                <span>{SORT_LABELS[sort]}</span>
                            </button>
                        }
                        items={sortItemsList}
                    />
                </div>

                {/* Hub items */}
                <div className="divide-y divide-dashed divide-base-content/10">
                    {sortedItems.map((item, j) => {
                        const hubIcon = item.hub.icon.includes(' ') ? item.hub.icon : `fa-solid ${item.hub.icon}`;
                        const hasPassThrough = item.pass_through.length > 0;

                        return (
                            <div key={j} className="bg-row-tint px-5 py-3 transition-colors hover:bg-base-200/50">
                                {/* Hub entry */}
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-100">
                                        <i className={`${hubIcon} text-base text-base-content/50`} />
                                    </div>
                                    <EntryLink entryId={item.hub.id} href={item.hub.url} className="text-sm font-semibold text-base-content hover:underline">
                                        {item.hub.name}
                                    </EntryLink>
                                </div>

                                {/* Pass-through entries */}
                                {hasPassThrough && (
                                    <div className="ml-5 mt-2 border-l-2 border-base-content/5 pl-5">
                                        <div className="space-y-1.5">
                                            {item.pass_through.map((pt) => {
                                                const ptIcon = pt.icon.includes(' ') ? pt.icon : `fa-solid ${pt.icon}`;
                                                return (
                                                    <div key={pt.id} className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-base-100/70">
                                                            <i className={`${ptIcon} text-xs text-base-content/30`} />
                                                        </div>
                                                        <EntryLink entryId={pt.id} href={pt.url} className="text-sm text-base-content/70 hover:text-base-content hover:underline">
                                                            {pt.name}
                                                        </EntryLink>
                                                        {pt.blueprint_name && (
                                                            <span className="badge badge-sm border border-base-content/10 bg-base-100 font-normal text-base-content/80">
                                                                {pt.blueprint_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function sortItems(items: ConnectionSection['items'], key: SortKey): ConnectionSection['items'] {
    if (key === 'default') return items;
    const sorted = [...items];
    switch (key) {
        case 'name-asc':
            sorted.sort((a, b) => a.hub.name.localeCompare(b.hub.name));
            break;
        case 'name-desc':
            sorted.sort((a, b) => b.hub.name.localeCompare(a.hub.name));
            break;
        case 'pt-desc':
            sorted.sort((a, b) => b.pass_through.length - a.pass_through.length);
            break;
        case 'pt-asc':
            sorted.sort((a, b) => a.pass_through.length - b.pass_through.length);
            break;
    }
    return sorted;
}
