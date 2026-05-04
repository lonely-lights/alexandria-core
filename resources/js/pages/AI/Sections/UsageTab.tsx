import { useEffect, useState } from 'react';
import Pagination from '@alexandria/components/ui/Pagination';
import type { PaginatedResponse, UsageStats, UsageTransaction } from '@alexandria/types/ai-dashboard';

interface UsageTabProps {
    projectId: number;
}

interface UsageDashboardResponse {
    transactions: PaginatedResponse<UsageTransaction>;
    stats: UsageStats;
    contexts: string[];
}

function formatContext(ctx: string): string {
    return ctx.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

type SortKey = 'created_at' | 'context' | 'model_name' | 'input_tokens' | 'output_tokens' | 'thinking_tokens' | 'cache_read_tokens' | 'cache_write_tokens' | 'total_tokens' | 'cost' | 'latency_ms';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
    { key: 'created_at', label: 'Date' },
    { key: 'context', label: 'Context' },
    { key: 'model_name', label: 'Model' },
    { key: 'input_tokens', label: 'In', align: 'right' },
    { key: 'output_tokens', label: 'Out', align: 'right' },
    { key: 'thinking_tokens', label: 'Think', align: 'right' },
    { key: 'cache_read_tokens', label: 'Cache R', align: 'right' },
    { key: 'cache_write_tokens', label: 'Cache W', align: 'right' },
    { key: 'total_tokens', label: 'Total', align: 'right' },
    { key: 'cost', label: 'Cost', align: 'right' },
    { key: 'latency_ms', label: 'Latency', align: 'right' },
];

function StatCard({
    icon,
    label,
    value,
    colorClass = 'text-base-content/30',
}: {
    icon: string;
    label: string;
    value: string | number;
    colorClass?: string;
}) {
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-base-content/10 bg-base-200 p-4 shadow-sm">
            <i className={`${icon} text-lg ${colorClass}`} />
            <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">{label}</p>
            <p className="text-xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        </div>
    );
}

export default function UsageTab({ projectId }: UsageTabProps) {
    const [data, setData] = useState<UsageDashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [context, setContext] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), per_page: '25', sort: sortKey, direction: sortDir });
        if (context) {
            params.set('context', context);
        }

        fetch(`/api/v1/projects/${projectId}/ai/dashboard-usage?${params.toString()}`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((res) => res.json())
            .then((json: UsageDashboardResponse) => setData(json))
            .finally(() => setLoading(false));
    }, [projectId, page, context, sortKey, sortDir]);

    const handleContextChange = (ctx: string | null) => {
        setContext(ctx);
        setPage(1);
    };

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
        setPage(1);
    };

    const stats = data?.stats;
    const transactions = data?.transactions;
    const contexts = data?.contexts ?? [];

    return (
        <div className="flex flex-col gap-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                <StatCard icon="fa-solid fa-arrow-right-arrow-left" label="Requests" value={stats?.total_transactions ?? 0} />
                <StatCard icon="fa-solid fa-arrow-right" label="Input" value={stats?.total_input ?? 0} colorClass="text-info/50" />
                <StatCard icon="fa-solid fa-arrow-left" label="Output" value={stats?.total_output ?? 0} colorClass="text-success/50" />
                <StatCard icon="fa-solid fa-brain" label="Thinking" value={stats?.total_thinking ?? 0} colorClass="text-secondary/50" />
                <StatCard icon="fa-solid fa-bolt" label="Cache Read" value={stats?.total_cache_read ?? 0} colorClass="text-accent/50" />
                <StatCard icon="fa-solid fa-pen-to-square" label="Cache Write" value={stats?.total_cache_write ?? 0} colorClass="text-warning/50" />
                <StatCard icon="fa-solid fa-coins" label="Total" value={stats?.total_tokens ?? 0} />
                <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 p-4 shadow-sm">
                    <i className="fa-solid fa-dollar-sign text-lg text-primary/60" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">Total Cost</p>
                    <p className="text-xl font-bold text-primary">${Number(stats?.total_cost ?? 0).toFixed(4)}</p>
                </div>
            </div>

            {/* Context Filter */}
            <div className="flex flex-wrap items-center gap-1">
                <button
                    type="button"
                    onClick={() => handleContextChange(null)}
                    className={`btn btn-xs rounded-lg ${context === null ? 'btn-primary' : 'btn-ghost'}`}
                >
                    All
                </button>
                {contexts.map((ctx) => (
                    <button
                        key={ctx}
                        type="button"
                        onClick={() => handleContextChange(ctx)}
                        className={`btn btn-xs rounded-lg ${context === ctx ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        {formatContext(ctx)}
                    </button>
                ))}
            </div>

            {/* Transaction Table */}
            <div className={`overflow-hidden rounded-xl border border-base-content/10 bg-base-200 shadow-sm transition-opacity duration-300 ${loading && data ? 'animate-pulse opacity-50' : 'opacity-100'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-base-300/50 bg-base-200/50">
                                {COLUMNS.map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => handleSort(col.key)}
                                        className={`cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider text-base-content/50 transition-colors hover:text-base-content/80 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                                    >
                                        {col.label}
                                        {sortKey === col.key && (
                                            <i className={`fa-solid fa-chevron-${sortDir === 'asc' ? 'up' : 'down'} ml-1 text-[9px] text-primary`} />
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-200">
                            {loading && !data && (
                                <tr>
                                    <td colSpan={11} className="px-4 py-12 text-center">
                                        <span className="loading loading-spinner loading-sm text-primary" />
                                    </td>
                                </tr>
                            )}
                            {!loading && (!transactions?.data || transactions.data.length === 0) && (
                                <tr>
                                    <td colSpan={11} className="px-4 py-12 text-center text-sm text-base-content/40">
                                        <i className="fa-solid fa-wave-square mb-2 block text-2xl text-base-content/15" />
                                        No transactions {context ? 'in this context' : 'yet'}
                                    </td>
                                </tr>
                            )}
                            {transactions?.data.map((tx) => (
                                    <tr key={tx.id} className="transition-colors hover:bg-base-200/30">
                                        <td className="whitespace-nowrap px-4 py-3 text-xs text-base-content/70">
                                            {new Date(tx.created_at).toLocaleString(undefined, {
                                                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            {tx.context ? (
                                                <span className="badge badge-ghost badge-sm">{formatContext(tx.context)}</span>
                                            ) : (
                                                <span className="text-base-content/30">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <code className="text-xs">
                                                {tx.model_name.length > 24 ? tx.model_name.slice(0, 24) + '…' : tx.model_name}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs tabular-nums text-info">
                                            {tx.input_tokens > 0 ? tx.input_tokens.toLocaleString() : <span className="text-base-content/30">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs tabular-nums text-success">
                                            {tx.output_tokens > 0 ? tx.output_tokens.toLocaleString() : <span className="text-base-content/30">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs tabular-nums text-secondary">
                                            {tx.thinking_tokens > 0 ? tx.thinking_tokens.toLocaleString() : <span className="text-base-content/30">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs tabular-nums text-accent">
                                            {tx.cache_read_tokens > 0 ? tx.cache_read_tokens.toLocaleString() : <span className="text-base-content/30">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs tabular-nums text-warning">
                                            {tx.cache_write_tokens > 0 ? tx.cache_write_tokens.toLocaleString() : <span className="text-base-content/30">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs font-bold tabular-nums">
                                            {tx.total_tokens.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs tabular-nums text-primary">
                                            ${Number(tx.cost).toFixed(4)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs tabular-nums text-base-content/70">
                                            {tx.latency_ms != null ? `${tx.latency_ms}ms` : <span className="text-base-content/30">—</span>}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                {transactions && transactions.last_page > 1 && (
                    <div className="border-t border-base-300/50 p-3">
                        <Pagination
                            currentPage={transactions.current_page}
                            lastPage={transactions.last_page}
                            from={transactions.from}
                            to={transactions.to}
                            total={transactions.total}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
