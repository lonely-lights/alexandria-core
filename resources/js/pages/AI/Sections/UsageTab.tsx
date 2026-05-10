import { useEffect, useState, type CSSProperties } from 'react';
import Pagination from '@alexandria/components/ui/Pagination';
import useT from '@alexandria/hooks/useT';
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

const COLUMNS: { key: SortKey; labelKey: string; align?: 'right' }[] = [
    { key: 'created_at', labelKey: 'ai.usage_tab.column.date' },
    { key: 'context', labelKey: 'ai.usage_tab.column.context' },
    { key: 'model_name', labelKey: 'ai.usage_tab.column.model' },
    { key: 'input_tokens', labelKey: 'ai.usage_tab.column.input', align: 'right' },
    { key: 'output_tokens', labelKey: 'ai.usage_tab.column.output', align: 'right' },
    { key: 'thinking_tokens', labelKey: 'ai.usage_tab.column.thinking', align: 'right' },
    { key: 'cache_read_tokens', labelKey: 'ai.usage_tab.column.cache_read', align: 'right' },
    { key: 'cache_write_tokens', labelKey: 'ai.usage_tab.column.cache_write', align: 'right' },
    { key: 'total_tokens', labelKey: 'ai.usage_tab.column.total', align: 'right' },
    { key: 'cost', labelKey: 'ai.usage_tab.column.cost', align: 'right' },
    { key: 'latency_ms', labelKey: 'ai.usage_tab.column.latency', align: 'right' },
];

/* ── Theme styles ── */

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const bodyText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)' };

const statCardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    boxShadow: '0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    padding: '1rem',
};

const costCardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-brand-primary-500) 30%, transparent)',
    background: 'linear-gradient(to right, color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent), color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent))',
    borderRadius: 'var(--theme-radius-card)',
    boxShadow: '0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    padding: '1rem',
};

const tableWrapStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    boxShadow: '0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    overflow: 'hidden',
};

const tableHeadStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
};

const rowDivider: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const paginationBorderTop: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const tabActiveStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-button)',
};

const tabIdleStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
};

const contextBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
};

const STAT_ICON_TINT: Record<string, string> = {
    info: 'color-mix(in srgb, var(--theme-status-info-stroke) 50%, transparent)',
    success: 'color-mix(in srgb, var(--theme-status-success-stroke) 50%, transparent)',
    secondary: 'color-mix(in srgb, var(--theme-brand-secondary-500) 50%, transparent)',
    accent: 'color-mix(in srgb, var(--theme-brand-secondary-700) 50%, transparent)',
    warning: 'color-mix(in srgb, var(--theme-status-warning-stroke) 50%, transparent)',
    default: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

const COL_COLOR: Record<string, string> = {
    input_tokens: 'var(--theme-status-info-stroke)',
    output_tokens: 'var(--theme-status-success-stroke)',
    thinking_tokens: 'var(--theme-brand-secondary-500)',
    cache_read_tokens: 'var(--theme-brand-secondary-700)',
    cache_write_tokens: 'var(--theme-status-warning-stroke)',
};

function StatCard({ icon, label, value, tintKey }: {
    icon: string;
    label: string;
    value: string | number;
    tintKey?: keyof typeof STAT_ICON_TINT;
}) {
    const tint = STAT_ICON_TINT[tintKey ?? 'default'] ?? STAT_ICON_TINT.default;
    return (
        <div className="flex flex-col gap-2" style={statCardStyle}>
            <i className={`${icon} text-lg`} style={{ color: tint }} aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider" style={labelText}>{label}</p>
            <p className="text-xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        </div>
    );
}

export default function UsageTab({ projectId }: UsageTabProps) {
    const t = useT();
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
                <StatCard icon="fa-solid fa-arrow-right-arrow-left" label={t('ai.usage_tab.stat.requests')} value={stats?.total_transactions ?? 0} />
                <StatCard icon="fa-solid fa-arrow-right" label={t('ai.usage_tab.stat.input')} value={stats?.total_input ?? 0} tintKey="info" />
                <StatCard icon="fa-solid fa-arrow-left" label={t('ai.usage_tab.stat.output')} value={stats?.total_output ?? 0} tintKey="success" />
                <StatCard icon="fa-solid fa-brain" label={t('ai.usage_tab.stat.thinking')} value={stats?.total_thinking ?? 0} tintKey="secondary" />
                <StatCard icon="fa-solid fa-bolt" label={t('ai.usage_tab.stat.cache_read')} value={stats?.total_cache_read ?? 0} tintKey="accent" />
                <StatCard icon="fa-solid fa-pen-to-square" label={t('ai.usage_tab.stat.cache_write')} value={stats?.total_cache_write ?? 0} tintKey="warning" />
                <StatCard icon="fa-solid fa-coins" label={t('ai.usage_tab.stat.total')} value={stats?.total_tokens ?? 0} />
                <div className="flex flex-col gap-2" style={costCardStyle}>
                    <i
                        className="fa-solid fa-dollar-sign text-lg"
                        style={{ color: 'color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent)' }}
                        aria-hidden="true"
                    />
                    <p
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'color-mix(in srgb, var(--theme-brand-primary-500) 70%, transparent)' }}
                    >
                        {t('ai.usage_tab.stat.total_cost')}
                    </p>
                    <p className="text-xl font-bold" style={{ color: 'var(--theme-brand-primary-500)' }}>
                        ${Number(stats?.total_cost ?? 0).toFixed(4)}
                    </p>
                </div>
            </div>

            {/* Context Filter */}
            <div className="flex flex-wrap items-center gap-1">
                <button
                    type="button"
                    onClick={() => handleContextChange(null)}
                    className="alex-btn inline-flex items-center px-3 py-1 text-xs font-medium"
                    style={context === null ? tabActiveStyle : tabIdleStyle}
                    aria-pressed={context === null}
                >
                    {t('ai.usage_tab.filter.all')}
                </button>
                {contexts.map((ctx) => (
                    <button
                        key={ctx}
                        type="button"
                        onClick={() => handleContextChange(ctx)}
                        className="alex-btn inline-flex items-center px-3 py-1 text-xs font-medium"
                        style={context === ctx ? tabActiveStyle : tabIdleStyle}
                        aria-pressed={context === ctx}
                    >
                        {formatContext(ctx)}
                    </button>
                ))}
            </div>

            {/* Transaction Table */}
            <div
                className={`transition-opacity duration-300 ${loading && data ? 'animate-pulse opacity-50' : 'opacity-100'}`}
                style={tableWrapStyle}
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={tableHeadStyle}>
                                {COLUMNS.map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => handleSort(col.key)}
                                        className={`cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                                        style={labelText}
                                    >
                                        {t(col.labelKey)}
                                        {sortKey === col.key && (
                                            <i
                                                className={`fa-solid fa-chevron-${sortDir === 'asc' ? 'up' : 'down'} ml-1 text-[9px]`}
                                                style={{ color: 'var(--theme-brand-primary-500)' }}
                                                aria-hidden="true"
                                            />
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && !data && (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="px-4 py-12 text-center">
                                        <i
                                            className="fa-solid fa-circle-notch fa-spin text-base"
                                            style={{ color: 'var(--theme-brand-primary-500)' }}
                                            aria-hidden="true"
                                        />
                                    </td>
                                </tr>
                            )}
                            {!loading && (!transactions?.data || transactions.data.length === 0) && (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-sm" style={fadedText}>
                                        <i
                                            className="fa-solid fa-wave-square mb-2 block text-2xl"
                                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 15%, transparent)' }}
                                            aria-hidden="true"
                                        />
                                        {context ? t('ai.usage_tab.empty.scoped') : t('ai.usage_tab.empty.unscoped')}
                                    </td>
                                </tr>
                            )}
                            {transactions?.data.map((tx, i, arr) => {
                                const isLast = i === arr.length - 1;
                                return (
                                    <tr key={tx.id} style={isLast ? undefined : rowDivider}>
                                        <td className="whitespace-nowrap px-4 py-3 text-xs" style={bodyText}>
                                            {new Date(tx.created_at).toLocaleString(undefined, {
                                                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            {tx.context ? (
                                                <span className="px-1.5 py-0.5 text-[11px]" style={contextBadgeStyle}>
                                                    {formatContext(tx.context)}
                                                </span>
                                            ) : (
                                                <span style={microText}>—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <code className="text-xs">
                                                {tx.model_name.length > 24 ? tx.model_name.slice(0, 24) + '…' : tx.model_name}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs tabular-nums" style={{ color: COL_COLOR.input_tokens }}>
                                            {tx.input_tokens > 0 ? tx.input_tokens.toLocaleString() : <span style={microText}>—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs tabular-nums" style={{ color: COL_COLOR.output_tokens }}>
                                            {tx.output_tokens > 0 ? tx.output_tokens.toLocaleString() : <span style={microText}>—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs tabular-nums" style={{ color: COL_COLOR.thinking_tokens }}>
                                            {tx.thinking_tokens > 0 ? tx.thinking_tokens.toLocaleString() : <span style={microText}>—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs tabular-nums" style={{ color: COL_COLOR.cache_read_tokens }}>
                                            {tx.cache_read_tokens > 0 ? tx.cache_read_tokens.toLocaleString() : <span style={microText}>—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs tabular-nums" style={{ color: COL_COLOR.cache_write_tokens }}>
                                            {tx.cache_write_tokens > 0 ? tx.cache_write_tokens.toLocaleString() : <span style={microText}>—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs font-bold tabular-nums">
                                            {tx.total_tokens.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs tabular-nums" style={{ color: 'var(--theme-brand-primary-500)' }}>
                                            ${Number(tx.cost).toFixed(4)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs tabular-nums" style={bodyText}>
                                            {tx.latency_ms != null ? `${tx.latency_ms}ms` : <span style={microText}>—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {transactions && transactions.last_page > 1 && (
                    <div className="p-3" style={paginationBorderTop}>
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
