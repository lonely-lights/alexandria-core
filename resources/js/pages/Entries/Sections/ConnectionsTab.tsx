import { useMemo, useState, type CSSProperties } from 'react';
import useT, { type Translator } from '@alexandria/hooks/useT';
import EntryLink from '@alexandria/components/entries/EntryLink';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import type { ConnectionSection } from '../Show';
import {
    cardOuter,
    cardInner,
    emptyStateInner,
    emptyIconStyle,
    emptyLabelStyle,
    gradientHeaderSecondary,
    headerIconSecondaryMuted,
    headerSubtitleSecondary,
    countBadge,
    sortTriggerSecondaryActive,
    sortTriggerSecondaryIdle,
    rowDivider,
    chipStyle,
} from './entriesTabStyles';

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

function sortLabels(t: Translator): Record<SortKey, string> {
    return {
        'default': t('entries.tab.sort.default'),
        'name-asc': t('entries.tab.sort.name_asc'),
        'name-desc': t('entries.tab.sort.name_desc'),
        'pt-desc': t('entries.tab.connection.sort.most'),
        'pt-asc': t('entries.tab.connection.sort.fewest'),
    };
}

const hubIconWrapStyle: CSSProperties = {
    display: 'flex',
    height: '2.5rem',
    width: '2.5rem',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--theme-radius-input)',
    border: '1px solid var(--theme-base-300)',
    background: 'var(--theme-base-100)',
};

const hubIconStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const ptIconWrapStyle: CSSProperties = {
    display: 'flex',
    height: '2rem',
    width: '2rem',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--theme-radius-input)',
    background: 'color-mix(in srgb, var(--theme-base-100) 70%, transparent)',
};

const ptIconStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

const hubLinkStyle: CSSProperties = {
    color: 'var(--theme-base-content)',
};

const ptLinkStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

const ptBorderStyle: CSSProperties = {
    borderLeft: '2px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

export default function ConnectionsTab({ connections }: ConnectionsTabProps) {
    const t = useT();

    if (connections.length === 0) {
        return (
            <div className="paper-board" style={cardOuter}>
                <div style={emptyStateInner}>
                    <i className="fa-solid fa-share-nodes mb-3 text-3xl" style={emptyIconStyle} />
                    <p className="text-sm font-medium" style={emptyLabelStyle}>{t('entries.tab.connection.empty')}</p>
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
    const t = useT();
    const labels = sortLabels(t);
    const [sort, setSort] = useState<SortKey>('default');

    const sortedItems = useMemo(() => sortItems(section.items, sort), [section.items, sort]);

    const sortItemsList = (Object.keys(labels) as SortKey[]).map((k) => ({
        label: labels[k],
        icon: sort === k ? 'fa-solid fa-check' : undefined,
        onClick: () => setSort(k),
    }));

    const isActive = sort !== 'default';

    return (
        <div className="paper-board" style={cardOuter}>
            <div className="overflow-hidden" style={cardInner}>
                {/* Section header */}
                <div className="flex items-start gap-2 px-5 py-3" style={gradientHeaderSecondary}>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-share-nodes text-xs" style={headerIconSecondaryMuted} />
                            <h3 className="text-sm font-semibold">{section.title}</h3>
                        </div>
                        {section.description && (
                            <p className="mt-0.5 text-xs font-medium" style={headerSubtitleSecondary}>{section.description}</p>
                        )}
                    </div>
                    <span style={countBadge}>
                        {t(section.items.length === 1 ? 'entries.tab.connection.count.singular' : 'entries.tab.connection.count.plural').replace(':count', String(section.items.length))}
                    </span>
                    <DropdownMenu
                        align="right"
                        trigger={
                            <button
                                type="button"
                                style={isActive ? sortTriggerSecondaryActive : sortTriggerSecondaryIdle}
                            >
                                <i className="fa-solid fa-arrow-down-short-wide text-[11px]" />
                                <span>{labels[sort]}</span>
                            </button>
                        }
                        items={sortItemsList}
                    />
                </div>

                {/* Hub items */}
                <div>
                    {sortedItems.map((item, j) => {
                        const hubIcon = item.hub.icon.includes(' ') ? item.hub.icon : `fa-solid ${item.hub.icon}`;
                        const hasPassThrough = item.pass_through.length > 0;

                        return (
                            <div key={j} className="alex-row px-5 py-3" style={j > 0 ? rowDivider : undefined}>
                                {/* Hub entry */}
                                <div className="flex items-center gap-4">
                                    <div style={hubIconWrapStyle}>
                                        <i className={`${hubIcon} text-base`} style={hubIconStyle} />
                                    </div>
                                    <EntryLink entryId={item.hub.id} href={item.hub.url} className="text-sm font-semibold hover:underline" style={hubLinkStyle}>
                                        {item.hub.name}
                                    </EntryLink>
                                </div>

                                {/* Pass-through entries */}
                                {hasPassThrough && (
                                    <div className="ml-5 mt-2 pl-5" style={ptBorderStyle}>
                                        <div className="space-y-1.5">
                                            {item.pass_through.map((pt) => {
                                                const ptIcon = pt.icon.includes(' ') ? pt.icon : `fa-solid ${pt.icon}`;
                                                return (
                                                    <div key={pt.id} className="flex items-center gap-3">
                                                        <div style={ptIconWrapStyle}>
                                                            <i className={`${ptIcon} text-xs`} style={ptIconStyle} />
                                                        </div>
                                                        <EntryLink entryId={pt.id} href={pt.url} className="text-sm hover:underline" style={ptLinkStyle}>
                                                            {pt.name}
                                                        </EntryLink>
                                                        {pt.blueprint_name && (
                                                            <span style={chipStyle}>
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
