import { useState, useEffect, useCallback } from 'react';
import UserLink from '@alexandria/components/ui/UserHoverCard';
import Pagination from '@alexandria/components/ui/Pagination';

interface ActivityItem {
    id: number;
    event: string;
    description: string;
    subject_type: 'entry' | 'blueprint' | 'unknown';
    subject: {
        id: number;
        name: string;
        slug: string | null;
        blueprint_name: string | null;
        blueprint_icon: string | null;
        icon: string | null;
    } | null;
    causer: {
        id: number;
        name: string;
        display_name: string | null;
    } | null;
    properties: {
        old: Record<string, unknown> | null;
        attributes: Record<string, unknown> | null;
    } | null;
    created_at: string;
    created_at_human: string;
}

interface FilterOption {
    id: number;
    name: string;
    display_name?: string | null;
    icon?: string | null;
}

interface Filters {
    blueprints: FilterOption[];
    members: FilterOption[];
    events: Record<string, string>;
}

interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface ActivityTabProps {
    projectId: number;
}

function csrfHeaders(): Record<string, string> {
    return {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };
}

export default function ActivityTab({ projectId }: ActivityTabProps) {
    const [items, setItems] = useState<ActivityItem[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [filters, setFilters] = useState<Filters | null>(null);
    const [loading, setLoading] = useState(true);

    // Filter state
    const [blueprintId, setBlueprintId] = useState('');
    const [userId, setUserId] = useState('');
    const [event, setEvent] = useState('');
    const [subjectType, setSubjectType] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [perPage, setPerPage] = useState(25);
    const [page, setPage] = useState(1);

    // Fetch filters once
    useEffect(() => {
        fetch(`/api/v1/projects/${projectId}/activity/filters`, {
            headers: csrfHeaders(),
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then(setFilters)
            .catch(() => {});
    }, [projectId]);

    // Fetch activity
    const fetchActivity = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('per_page', String(perPage));
        if (blueprintId) params.set('blueprint_id', blueprintId);
        if (userId) params.set('user_id', userId);
        if (event) params.set('event', event);
        if (subjectType) params.set('subject_type', subjectType);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);

        fetch(`/api/v1/projects/${projectId}/activity?${params}`, {
            headers: csrfHeaders(),
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data) => {
                setItems(data.data ?? []);
                setMeta({
                    current_page: data.current_page,
                    last_page: data.last_page,
                    per_page: data.per_page,
                    total: data.total,
                    from: data.from,
                    to: data.to,
                });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [projectId, page, perPage, blueprintId, userId, event, subjectType, dateFrom, dateTo]);

    useEffect(() => { fetchActivity(); }, [fetchActivity]);

    function applyFilter(setter: (v: string) => void, value: string) {
        setter(value);
        setPage(1);
    }

    function clearFilters() {
        setBlueprintId('');
        setUserId('');
        setEvent('');
        setSubjectType('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    }

    const hasActiveFilters = blueprintId || userId || event || subjectType || dateFrom || dateTo;

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-end justify-end gap-3">
                    <div className="form-control min-w-[120px]">
                        <label className="label py-0.5"><span className="label-text text-xs">Type</span></label>
                        <select value={subjectType} onChange={(e) => applyFilter(setSubjectType, e.target.value)} className="select select-bordered select-sm rounded-lg">
                            <option value="">All</option>
                            <option value="entry">Entries</option>
                            <option value="blueprint">Blueprints</option>
                        </select>
                    </div>

                    <div className="form-control min-w-[140px]">
                        <label className="label py-0.5"><span className="label-text text-xs">Blueprint</span></label>
                        <select value={blueprintId} onChange={(e) => applyFilter(setBlueprintId, e.target.value)} className="select select-bordered select-sm rounded-lg">
                            <option value="">All</option>
                            {filters?.blueprints.map((bp) => (
                                <option key={bp.id} value={bp.id}>{bp.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-control min-w-[120px]">
                        <label className="label py-0.5"><span className="label-text text-xs">Event</span></label>
                        <select value={event} onChange={(e) => applyFilter(setEvent, e.target.value)} className="select select-bordered select-sm rounded-lg">
                            <option value="">All</option>
                            {filters && Object.entries(filters.events).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-control min-w-[140px]">
                        <label className="label py-0.5"><span className="label-text text-xs">User</span></label>
                        <select value={userId} onChange={(e) => applyFilter(setUserId, e.target.value)} className="select select-bordered select-sm rounded-lg">
                            <option value="">All</option>
                            {filters?.members.map((m) => (
                                <option key={m.id} value={m.id}>{m.display_name ?? m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label py-0.5"><span className="label-text text-xs">From</span></label>
                        <input type="date" value={dateFrom} onChange={(e) => applyFilter(setDateFrom, e.target.value)} className="input input-bordered input-sm rounded-lg" />
                    </div>
                    <div className="form-control">
                        <label className="label py-0.5"><span className="label-text text-xs">To</span></label>
                        <input type="date" value={dateTo} onChange={(e) => applyFilter(setDateTo, e.target.value)} className="input input-bordered input-sm rounded-lg" />
                    </div>

                    <div className="form-control">
                        <label className="label py-0.5"><span className="label-text text-xs">Per page</span></label>
                        <select value={perPage} onChange={(e) => { setPerPage(parseInt(e.target.value)); setPage(1); }} className="select select-bordered select-sm rounded-lg">
                            <option value={15}>15</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <button type="button" onClick={clearFilters} className="btn btn-ghost btn-sm rounded-lg text-error">
                            <i className="fa-solid fa-xmark mr-1" /> Clear
                        </button>
                    )}
            </div>

            {/* Activity table */}
            <div className="paper-board rounded-2xl border border-base-300/50">
                <div className="overflow-x-auto bg-base-100 shadow-sm" style={{ borderRadius: 'inherit' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <span className="loading loading-spinner loading-md text-base-content/30" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-base-300">
                            <i className="fa-solid fa-clock-rotate-left text-xl text-base-content/30" />
                        </div>
                        <p className="font-medium text-base-content/50">No activity found</p>
                        {hasActiveFilters && (
                            <p className="mt-1 text-sm text-base-content/40">Try adjusting your filters.</p>
                        )}
                    </div>
                ) : (
                    <table className="table w-full">
                        <thead>
                            <tr className="text-xs tracking-wider [&_th]:normal-case">
                                <th className="bg-primary font-semibold text-primary-content first:rounded-tl-2xl">Subject</th>
                                <th className="bg-primary font-semibold text-primary-content">Event</th>
                                <th className="bg-primary font-semibold text-primary-content">Description</th>
                                <th className="bg-primary font-semibold text-primary-content">User</th>
                                <th className="bg-primary font-semibold text-primary-content text-right last:rounded-tr-2xl">When</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => (
                                <ActivityRow key={item.id} item={item} isLast={i === items.length - 1} />
                            ))}
                        </tbody>
                    </table>
                )}
                </div>
            </div>

            {/* Pagination */}
            {meta && (
                <Pagination
                    currentPage={meta.current_page}
                    lastPage={meta.last_page}
                    from={meta.from}
                    to={meta.to}
                    total={meta.total}
                    onPageChange={setPage}
                />
            )}
        </div>
    );
}

/* ── Activity Row ── */

function ActivityRow({ item, isLast }: { item: ActivityItem; isLast: boolean }) {
    const subjectIcon = getSubjectIcon(item);

    const eventColor = {
        created: 'badge-success',
        updated: 'badge-info',
        deleted: 'badge-error',
    }[item.event] ?? 'badge-ghost';

    const borderClass = isLast ? 'border-b-0' : 'border-b border-dashed border-base-content/8';

    return (
        <tr className="transition-colors hover:bg-base-200/30">
            {/* Subject */}
            <td className={borderClass}>
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-base-300/50">
                        <i className={`${subjectIcon} text-xs text-base-content/50`} />
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium">{item.subject?.name ?? 'Deleted'}</p>
                        {item.subject_type === 'entry' && item.subject?.blueprint_name && (
                            <p className="text-xs text-base-content/40">{item.subject.blueprint_name}</p>
                        )}
                        {item.subject_type === 'blueprint' && (
                            <p className="text-xs text-base-content/40">Blueprint</p>
                        )}
                    </div>
                </div>
            </td>

            {/* Event */}
            <td className={borderClass}>
                <span className={`badge badge-sm font-bold ${eventColor}`}>{item.event.charAt(0).toUpperCase() + item.event.slice(1)}</span>
            </td>

            {/* Description */}
            <td className={`text-sm text-base-content/60 ${borderClass}`}>
                {item.description}
            </td>

            {/* User */}
            <td className={`text-sm ${borderClass}`}>
                {item.causer ? (
                    <UserLink userId={item.causer.id} href={`/u/${item.causer.name.toLowerCase()}`} className="text-base-content/60 hover:text-primary hover:underline">
                        {item.causer.display_name ?? item.causer.name}
                    </UserLink>
                ) : (
                    <span className="italic text-base-content/30">System</span>
                )}
            </td>

            {/* When */}
            <td className={`text-right ${borderClass}`}>
                <time
                    dateTime={item.created_at}
                    title={new Date(item.created_at).toLocaleString()}
                    className="text-xs text-base-content/40"
                >
                    {item.created_at_human}
                </time>
            </td>
        </tr>
    );
}

function getSubjectIcon(item: ActivityItem): string {
    if (item.subject_type === 'blueprint') {
        const icon = item.subject?.icon;
        return icon ? (icon.includes(' ') ? icon : `fa-solid ${icon}`) : 'fa-solid fa-cube';
    }
    if (item.subject_type === 'entry') {
        const icon = item.subject?.blueprint_icon;
        return icon ? (icon.includes(' ') ? icon : `fa-solid ${icon}`) : 'fa-solid fa-file';
    }
    return 'fa-solid fa-circle';
}
