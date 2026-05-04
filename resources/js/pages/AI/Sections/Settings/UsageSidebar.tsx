import type { AiDashboardStats } from '@alexandria/types/ai-dashboard';

interface UsageSidebarProps {
    stats: AiDashboardStats;
    /** Current monthly budget in the form. String because the parent
     * keeps it as a controlled input; we parse to compare to spend. */
    monthlyBudget: string;
}

/**
 * Readonly right-sidebar summary of project AI spend: this-month mini
 * stat grid, optional budget progress bar, and all-time totals. Lives
 * next to the editable form in SettingsTab; doesn't own any state of
 * its own.
 */
export default function UsageSidebar({ stats, monthlyBudget }: UsageSidebarProps) {
    const budgetNum = monthlyBudget !== '' ? Number(monthlyBudget) : 0;
    const spent = Number(stats.this_month_cost);
    const pct = budgetNum > 0 ? Math.min(100, (spent / budgetNum) * 100) : 0;

    return (
        <div className="overflow-hidden rounded-xl border border-base-content/10 bg-base-200">
            <div className="border-b border-base-content/5 px-5 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <i className="fa-solid fa-chart-pie text-primary" />
                    Project Usage
                </h3>
            </div>
            <div className="space-y-4 p-5">
                {/* This Month — three mini stats in a row. The cost
                    cell is primary-tinted so it's the first thing you
                    see when the budget is what you care about. */}
                <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/50">This Month</div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-base-300/40 p-2 text-center">
                            <div className="text-lg font-bold tabular-nums">{stats.this_month_transactions}</div>
                            <div className="text-[10px] uppercase text-base-content/50">Requests</div>
                        </div>
                        <div className="rounded-lg bg-base-300/40 p-2 text-center">
                            <div className="text-lg font-bold tabular-nums">
                                {stats.this_month_tokens > 1000
                                    ? `${(stats.this_month_tokens / 1000).toFixed(1)}K`
                                    : stats.this_month_tokens}
                            </div>
                            <div className="text-[10px] uppercase text-base-content/50">Tokens</div>
                        </div>
                        <div className="rounded-lg bg-primary/10 p-2 text-center">
                            <div className="text-lg font-bold tabular-nums text-primary">
                                ${spent.toFixed(2)}
                            </div>
                            <div className="text-[10px] uppercase text-primary/70">Cost</div>
                        </div>
                    </div>
                </div>

                {/* Budget Progress — rendered only when the user set a
                    budget. Bar turns warning-colored past 80% so they
                    see it coming before they hit it. */}
                {budgetNum > 0 && (
                    <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-base-content/60">Budget Used</span>
                            <span className={`font-mono ${pct > 80 ? 'text-warning' : 'text-base-content/70'}`}>
                                {pct.toFixed(1)}%
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-base-300/60">
                            <div
                                className={`h-full transition-all ${pct > 80 ? 'bg-warning' : 'bg-primary'}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <div className="mt-1 text-xs text-base-content/50">
                            ${spent.toFixed(2)} / ${budgetNum.toFixed(2)}
                        </div>
                    </div>
                )}

                <div className="divider my-0" />

                {/* All Time — simple key/value list. Cost gets primary
                    tint for the same "budget glance" reason. */}
                <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/50">All Time</div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-base-content/60">Total Requests</span>
                            <span className="font-medium tabular-nums">{stats.total_transactions.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-base-content/60">Total Tokens</span>
                            <span className="font-medium tabular-nums">{stats.total_tokens.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-base-content/60">Total Cost</span>
                            <span className="font-medium tabular-nums text-primary">
                                ${Number(stats.total_cost).toFixed(4)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
