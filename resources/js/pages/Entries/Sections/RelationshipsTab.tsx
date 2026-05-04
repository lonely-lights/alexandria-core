import { useState, useEffect, useCallback } from 'react';
import EntryLink from '@alexandria/components/entries/EntryLink';
import Pagination from '@alexandria/components/ui/Pagination';

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

export default function RelationshipsTab({ entryId, projectId, relationshipBlueprints }: RelationshipsTabProps) {
    const blueprints = Object.values(relationshipBlueprints);

    if (blueprints.length === 0) {
        return (
            <div className="paper-board rounded-2xl border border-base-content/10">
                <div className="flex flex-col items-center bg-base-200 py-16 text-center" style={{ borderRadius: 'inherit' }}>
                    <i className="fa-solid fa-diagram-project mb-3 text-3xl text-base-content/20" />
                    <p className="text-sm font-medium text-base-content/40">No relationships</p>
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
        if (sortField !== field) return <i className="fa-solid fa-sort text-[9px] opacity-20" />;
        return sortDir === 'asc'
            ? <i className="fa-solid fa-sort-up text-[9px] text-primary" />
            : <i className="fa-solid fa-sort-down text-[9px] text-primary" />;
    };

    return (
        <div className="paper-board rounded-2xl border border-base-content/10">
            <div className="overflow-hidden bg-base-200" style={{ borderRadius: 'inherit' }}>
                <div
                    className="flex items-center gap-2 border-b border-base-300 px-5 py-3 text-secondary-content"
                    style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-secondary) 80%, transparent), color-mix(in srgb, var(--color-secondary) 60%, transparent))' }}
                >
                    <i className="fa-solid fa-diagram-project text-xs text-secondary-content/60" />
                    <h3 className="text-sm font-semibold">{blueprint.name}</h3>
                    {meta && (
                        <span className="ml-auto rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-semibold text-white">
                            {meta.total} {meta.total === 1 ? 'relationship' : 'relationships'}
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="table table-sm w-full">
                        <thead>
                            <tr className="bg-base-300/50 text-xs [&_th]:bg-transparent">
                                <th
                                    className="cursor-pointer select-none transition-colors hover:bg-base-content/5"
                                    onClick={() => toggleSort('entry_a')}
                                >
                                    <span className="flex items-center gap-1.5">Name {sortIcon('entry_a')}</span>
                                </th>
                                {fieldColumns.map((f) => (
                                    <th
                                        key={f.name}
                                        className="cursor-pointer select-none transition-colors hover:bg-base-content/5"
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
                                        <span className="loading loading-spinner loading-sm" />
                                    </td>
                                </tr>
                            )}
                            {!loading && items.length === 0 && (
                                <tr>
                                    <td colSpan={1 + fieldColumns.length} className="py-8 text-center text-sm text-base-content/30">
                                        No relationships found
                                    </td>
                                </tr>
                            )}
                            {!loading && items.map((item) => {
                                const other = otherEntry(item, entryId);
                                return (
                                    <tr key={item.id} className="bg-row-tint transition-colors hover:bg-base-200/50">
                                        <td>
                                            <div>
                                                {other.entry.url ? (
                                                    <EntryLink entryId={other.entry.id} href={other.entry.url} className="text-sm font-medium hover:underline">
                                                        {other.entry.name}
                                                    </EntryLink>
                                                ) : (
                                                    <span className="text-sm">{other.entry.name}</span>
                                                )}
                                                {other.label && (
                                                    <span className="ml-1.5 text-xs text-base-content/40">{other.label}</span>
                                                )}
                                            </div>
                                        </td>
                                        {fieldColumns.map((f) => (
                                            <td key={f.name}>
                                                <span className="text-xs text-base-content/70">
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
                    <div className="border-t border-base-300 bg-base-300/40 px-5 py-2">
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
