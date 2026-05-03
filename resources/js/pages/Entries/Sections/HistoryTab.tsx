import { useState, useMemo } from 'react';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import type { HistoryRecord } from '../Show';

interface HistoryTabProps {
    history: HistoryRecord[];
}

interface HistoryGroup {
    id: string;
    records: HistoryRecord[];
    created_at: string | null;
    user: HistoryRecord['user'];
    summary: string;
}

type SortKey = 'default' | 'newest' | 'oldest';

const SORT_LABELS: Record<SortKey, string> = {
    'default': 'Default',
    'newest': 'Newest first',
    'oldest': 'Oldest first',
};

function titleCase(str: string): string {
    return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const FIELD_SORT_ORDER: Record<string, number> = {
    name: 0,
    summary: 1,
    content: 2,
    slug: 3,
    sort_order: 4,
    parent_id: 5,
    metadata: 6,
};

function sortRecords(records: HistoryRecord[]): HistoryRecord[] {
    return [...records].sort((a, b) => {
        const aOrder = a.field_name ? (FIELD_SORT_ORDER[a.field_name] ?? 50) : 50;
        const bOrder = b.field_name ? (FIELD_SORT_ORDER[b.field_name] ?? 50) : 50;
        // Field updates before attribute updates before metadata
        if (aOrder !== bOrder) return aOrder - bOrder;
        const typeOrder: Record<string, number> = { field_update: 0, attribute_update: 1, metadata_update: 2, bulk_update: 3 };
        return (typeOrder[a.change_type] ?? 9) - (typeOrder[b.change_type] ?? 9);
    });
}

const CHANGE_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
    field_update: { icon: 'fa-solid fa-pen', color: 'text-blue-500', label: 'Field Update' },
    attribute_update: { icon: 'fa-solid fa-sliders', color: 'text-amber-500', label: 'Attribute Update' },
    metadata_update: { icon: 'fa-solid fa-database', color: 'text-purple-500', label: 'Metadata Update' },
    bulk_update: { icon: 'fa-solid fa-layer-group', color: 'text-emerald-500', label: 'Bulk Update' },
};

export default function HistoryTab({ history }: HistoryTabProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [sort, setSort] = useState<SortKey>('default');

    // Group records by batch_id, or by created_at second for legacy records without batch_id
    const groups = useMemo<HistoryGroup[]>(() => {
        const map = new Map<string, HistoryRecord[]>();

        for (const record of history) {
            const key = record.batch_id
                ?? (record.created_at ? record.created_at.slice(0, 19) : `single-${record.id}`);
            const existing = map.get(key);
            if (existing) {
                existing.push(record);
            } else {
                map.set(key, [record]);
            }
        }

        return Array.from(map.entries()).map(([key, records]) => {
            const sorted = sortRecords(records);
            return {
                id: key,
                records: sorted,
                created_at: sorted[0].created_at,
                user: sorted[0].user,
                summary: sorted.length === 1
                    ? (sorted[0].change_summary ?? 'Change')
                    : `Updated ${sorted.map((r) => r.field_name).filter(Boolean).join(', ')}`,
            };
        });
    }, [history]);

    const sortedGroups = useMemo(() => {
        if (sort === 'default') return groups;
        const copy = [...groups];
        copy.sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return sort === 'newest' ? bTime - aTime : aTime - bTime;
        });
        return copy;
    }, [groups, sort]);

    if (history.length === 0) {
        return (
            <div className="paper-board rounded-2xl border border-base-content/10">
                <div className="flex flex-col items-center bg-base-200 py-16 text-center" style={{ borderRadius: 'inherit' }}>
                    <i className="fa-solid fa-clock-rotate-left mb-3 text-3xl text-base-content/20" />
                    <p className="text-sm font-medium text-base-content/40">No history yet</p>
                </div>
            </div>
        );
    }

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
                    <i className="fa-solid fa-clock-rotate-left text-xs text-primary-content/60" />
                    <h3 className="text-sm font-semibold">Revision History</h3>
                    <span className="ml-auto rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {groups.length} {groups.length === 1 ? 'revision' : 'revisions'}
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
                    {sortedGroups.map((group) => {
                        const isExpanded = expandedId === group.id;

                        return (
                            <div key={group.id}>
                                {/* Summary row */}
                                <button
                                    type="button"
                                    onClick={() => setExpandedId(isExpanded ? null : group.id)}
                                    className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                                        isExpanded ? 'bg-base-300/40' : 'bg-row-tint hover:bg-base-200/50'
                                    }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-base-content">
                                                {group.summary}
                                            </span>
                                            {group.records.length > 1 && (
                                                <span className="badge badge-sm border border-base-content/10 bg-base-100 font-normal text-base-content/80">
                                                    {group.records.length} fields
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 flex items-center gap-3 text-xs text-base-content/40">
                                            {group.created_at && (
                                                <span>{new Date(group.created_at).toLocaleString()}</span>
                                            )}
                                            {group.user && (
                                                <span>by {group.user.display_name ?? group.user.name}</span>
                                            )}
                                        </div>
                                    </div>

                                    <i className={`fa-solid fa-chevron-right text-[10px] text-base-content/20 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>

                                {/* Expanded diff view */}
                                {isExpanded && (
                                    <div className="border-t border-base-content/10 bg-base-300/30 px-5 py-4">
                                        <div className="space-y-4">
                                            {group.records.map((record) => {
                                                const config = CHANGE_TYPE_CONFIG[record.change_type] ?? CHANGE_TYPE_CONFIG.field_update;
                                                return (
                                                    <div key={record.id}>
                                                        {/* Field label */}
                                                        <div className="mb-3 border-b border-base-content/10 pb-2">
                                                            <span className="text-sm font-semibold text-base-content/60">
                                                                {titleCase(record.field_name ?? config.label)}
                                                            </span>
                                                        </div>

                                                        {/* Side-by-side diff */}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-error/60">
                                                                    <i className="fa-solid fa-minus text-[7px]" />
                                                                    Before
                                                                </div>
                                                                <div className="rounded-xl border border-error/15 bg-error/5 p-3">
                                                                    {record.previous_value ? (
                                                                        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-base-content/60">
                                                                            {record.previous_value}
                                                                        </pre>
                                                                    ) : (
                                                                        <span className="text-xs italic text-base-content/20">Empty</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-success/60">
                                                                    <i className="fa-solid fa-plus text-[7px]" />
                                                                    After
                                                                </div>
                                                                <div className="rounded-xl border border-success/15 bg-success/5 p-3">
                                                                    {record.new_value ? (
                                                                        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-base-content/60">
                                                                            {record.new_value}
                                                                        </pre>
                                                                    ) : (
                                                                        <span className="text-xs italic text-base-content/20">Empty</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
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
