import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import useT from '@alexandria/hooks/useT';
import EntryLink from '@alexandria/components/entries/EntryLink';
import Pagination from '@alexandria/components/ui/Pagination';
import {
    cardOuter,
    cardInner,
    emptyStateInner,
    emptyIconStyle,
    emptyLabelStyle,
    gradientHeaderSecondary,
    headerIconSecondaryMuted,
    countBadge,
    helperFainter,
    helperFaint,
    labelMid,
} from './entriesTabStyles';

interface RelationshipBlueprintMeta {
    slug: string;
    name: string;
    fields: Array<{ name: string; label: string; type: string }>;
}

interface ConnectionItem {
    id: number;
    parent: { id: number; name: string; label: string | null; url: string | null };
    child: { id: number; name: string; label: string | null; url: string | null };
    fields: Record<string, string | number | null>;
    created_at: string;
}

interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface RelationshipsTabProps {
    entryId: number;
    projectId: number;
    relationshipBlueprints: Record<string, RelationshipBlueprintMeta>;
}

const tableHeadRowStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-300) 50%, transparent)',
};

const sortHeaderBtnStyle: CSSProperties = {
    cursor: 'pointer',
    userSelect: 'none',
    padding: '0.5rem 0.75rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    transition: 'background-color var(--theme-motion-duration-fast, 150ms) ease',
};

const sortIconActiveStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
};

const sortIconIdleStyle: CSSProperties = {
    opacity: 0.2,
};

const tableCellStyle: CSSProperties = {
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
};

const fieldCellStyle: CSSProperties = {
    ...tableCellStyle,
    fontSize: '0.75rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

const tableRowStyle: CSSProperties = {
    transition: 'background-color var(--theme-motion-duration-fast, 150ms) ease',
    borderTop: '1px dashed color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const spinnerStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const paginationWrapStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-300) 40%, transparent)',
    borderTop: '1px solid var(--theme-base-300)',
};

export default function RelationshipsTab({ entryId, projectId, relationshipBlueprints }: RelationshipsTabProps) {
    const t = useT();
    const blueprints = Object.values(relationshipBlueprints);

    if (blueprints.length === 0) {
        return (
            <div className="paper-board" style={cardOuter}>
                <div style={emptyStateInner}>
                    <i className="fa-solid fa-diagram-project mb-3 text-3xl" style={emptyIconStyle} />
                    <p className="text-sm font-medium" style={emptyLabelStyle}>{t('entries.tab.relationship.empty')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {blueprints.map((bp) => (
                <RelationshipGroup
                    key={bp.slug}
                    blueprint={bp}
                    entryId={entryId}
                    projectId={projectId}
                />
            ))}
        </div>
    );
}

function otherEntry(item: ConnectionItem, entryId: number) {
    // Show the entry that ISN'T the one we're viewing
    if (item.parent.id === entryId) return { entry: item.child, label: item.parent.label };
    return { entry: item.parent, label: item.child.label };
}

function RelationshipGroup({ blueprint, entryId, projectId }: {
    blueprint: RelationshipBlueprintMeta;
    entryId: number;
    projectId: number;
}) {
    const t = useT();
    const [items, setItems] = useState<ConnectionItem[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [sortField, setSortField] = useState('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                entry_id: String(entryId),
                per_page: '25',
                page: String(page),
                sort_field: sortField,
                sort_direction: sortDir,
            });

            const res = await fetch(
                `/api/v1/projects/${projectId}/blueprints/${blueprint.slug}/connections?${params}`,
                {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                },
            );

            if (res.ok) {
                const data = await res.json();
                setItems(data.data ?? []);
                setMeta({
                    current_page: data.current_page,
                    last_page: data.last_page,
                    per_page: data.per_page,
                    total: data.total,
                });
            }
        } finally {
            setLoading(false);
        }
    }, [entryId, projectId, blueprint.slug, page, sortField, sortDir]);

    useEffect(() => { void fetchData(); }, [fetchData]);

    const toggleSort = (field: string) => {
        if (sortField === field) {
            setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
        setPage(1);
    };

    // Build columns: Entry A, Entry B, then blueprint fields (excluding priority)
    const fieldColumns = blueprint.fields.filter((f) => f.name !== 'priority');

    const sortIcon = (field: string) => {
        if (sortField !== field) return <i className="fa-solid fa-sort text-[9px]" style={sortIconIdleStyle} />;
        return sortDir === 'asc'
            ? <i className="fa-solid fa-sort-up text-[9px]" style={sortIconActiveStyle} />
            : <i className="fa-solid fa-sort-down text-[9px]" style={sortIconActiveStyle} />;
    };

    return (
        <div className="paper-board" style={cardOuter}>
            <div className="overflow-hidden" style={cardInner}>
                <div className="flex items-center gap-2 px-5 py-3" style={gradientHeaderSecondary}>
                    <i className="fa-solid fa-diagram-project text-xs" style={headerIconSecondaryMuted} />
                    <h3 className="text-sm font-semibold">{blueprint.name}</h3>
                    {meta && (
                        <span style={countBadge}>
                            {t(meta.total === 1 ? 'entries.tab.relationship.count.singular' : 'entries.tab.relationship.count.plural').replace(':count', String(meta.total))}
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={tableHeadRowStyle}>
                                <th
                                    className="alex-row"
                                    style={sortHeaderBtnStyle}
                                    onClick={() => toggleSort('entry_a')}
                                >
                                    <span className="flex items-center gap-1.5">{t('entries.tab.relationship.name_column')} {sortIcon('entry_a')}</span>
                                </th>
                                {fieldColumns.map((f) => (
                                    <th
                                        key={f.name}
                                        className="alex-row"
                                        style={sortHeaderBtnStyle}
                                        onClick={() => toggleSort(`field:${f.name}`)}
                                    >
                                        <span className="flex items-center gap-1.5">{f.label} {sortIcon(`field:${f.name}`)}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={1 + fieldColumns.length} className="py-8 text-center">
                                        <i className="fa-solid fa-circle-notch fa-spin" style={spinnerStyle} />
                                    </td>
                                </tr>
                            )}
                            {!loading && items.length === 0 && (
                                <tr>
                                    <td colSpan={1 + fieldColumns.length} className="py-8 text-center text-sm" style={helperFainter}>
                                        {t('entries.tab.relationship.no_results')}
                                    </td>
                                </tr>
                            )}
                            {!loading && items.map((item) => {
                                const other = otherEntry(item, entryId);
                                return (
                                    <tr key={item.id} className="alex-row" style={tableRowStyle}>
                                        <td style={tableCellStyle}>
                                            <div>
                                                {other.entry.url ? (
                                                    <EntryLink entryId={other.entry.id} href={other.entry.url} className="text-sm font-medium hover:underline">
                                                        {other.entry.name}
                                                    </EntryLink>
                                                ) : (
                                                    <span className="text-sm">{other.entry.name}</span>
                                                )}
                                                {other.label && (
                                                    <span className="ml-1.5 text-xs" style={helperFaint}>{other.label}</span>
                                                )}
                                            </div>
                                        </td>
                                        {fieldColumns.map((f) => (
                                            <td key={f.name} style={fieldCellStyle}>
                                                <span style={labelMid}>
                                                    {item.fields[f.label] != null ? String(item.fields[f.label]) : '—'}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {meta && meta.last_page > 1 && (
                    <div className="px-5 py-2" style={paginationWrapStyle}>
                        <Pagination
                            currentPage={meta.current_page}
                            lastPage={meta.last_page}
                            from={null}
                            to={null}
                            total={meta.total}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
