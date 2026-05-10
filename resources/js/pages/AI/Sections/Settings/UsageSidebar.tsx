import type { CSSProperties } from 'react';
import useT from '@alexandria/hooks/useT';
import type { AiDashboardStats } from '@alexandria/types/ai-dashboard';

interface UsageSidebarProps {
    stats: AiDashboardStats;
    /** Current monthly budget in the form. String because the parent
     * keeps it as a controlled input; we parse to compare to spend. */
    monthlyBudget: string;
}

const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    overflow: 'hidden',
};

const cardHeaderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const sectionLabelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const muteText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };
const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)' };

const miniStatStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
};

const miniStatPrimaryStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
};

const dividerStyle: CSSProperties = {
    height: '1px',
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const progressTrackStyle: CSSProperties = {
    height: '0.5rem',
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    borderRadius: '9999px',
    overflow: 'hidden',
};

/**
 * Readonly right-sidebar summary of project AI spend: this-month mini
 * stat grid, optional budget progress bar, and all-time totals. Lives
 * next to the editable form in SettingsTab; doesn't own any state of
 * its own.
 */
export default function UsageSidebar({ stats, monthlyBudget }: UsageSidebarProps) {
    const t = useT();
    const budgetNum = monthlyBudget !== '' ? Number(monthlyBudget) : 0;
    const spent = Number(stats.this_month_cost);
    const pct = budgetNum > 0 ? Math.min(100, (spent / budgetNum) * 100) : 0;
    const overWarning = pct > 80;

    return (
        <div style={cardStyle}>
            <div className="px-5 py-3" style={cardHeaderStyle}>
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <i className="fa-solid fa-chart-pie" style={{ color: 'var(--theme-brand-primary-500)' }} aria-hidden="true" />
                    {t('ai.usage_sidebar.title')}
                </h3>
            </div>
            <div className="space-y-4 p-5">
                {/* This Month — three mini stats. Cost cell is primary-tinted
                    so it's the first thing you see when budget matters. */}
                <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={sectionLabelStyle}>
                        {t('ai.usage_sidebar.this_month')}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 text-center" style={miniStatStyle}>
                            <div className="text-lg font-bold tabular-nums">{stats.this_month_transactions}</div>
                            <div className="text-[10px] uppercase" style={fadedText}>{t('ai.usage_sidebar.requests')}</div>
                        </div>
                        <div className="p-2 text-center" style={miniStatStyle}>
                            <div className="text-lg font-bold tabular-nums">
                                {stats.this_month_tokens > 1000
                                    ? `${(stats.this_month_tokens / 1000).toFixed(1)}K`
                                    : stats.this_month_tokens}
                            </div>
                            <div className="text-[10px] uppercase" style={fadedText}>{t('ai.usage_sidebar.tokens')}</div>
                        </div>
                        <div className="p-2 text-center" style={miniStatPrimaryStyle}>
                            <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary-500)' }}>
                                ${spent.toFixed(2)}
                            </div>
                            <div
                                className="text-[10px] uppercase"
                                style={{ color: 'color-mix(in srgb, var(--theme-brand-primary-500) 70%, transparent)' }}
                            >
                                {t('ai.usage_sidebar.cost')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Budget Progress — bar tints status-warning past 80%. */}
                {budgetNum > 0 && (
                    <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                            <span style={muteText}>{t('ai.usage_sidebar.budget_used')}</span>
                            <span
                                className="font-mono"
                                style={overWarning
                                    ? { color: 'var(--theme-status-warning-stroke)' }
                                    : microText}
                            >
                                {pct.toFixed(1)}%
                            </span>
                        </div>
                        <div style={progressTrackStyle}>
                            <div
                                style={{
                                    height: '100%',
                                    width: `${pct}%`,
                                    background: overWarning
                                        ? 'var(--theme-status-warning-stroke)'
                                        : 'var(--theme-brand-primary-500)',
                                    transition: 'width var(--theme-motion-duration-normal) var(--theme-motion-easing-standard)',
                                }}
                            />
                        </div>
                        <div className="mt-1 text-xs" style={fadedText}>
                            ${spent.toFixed(2)} / ${budgetNum.toFixed(2)}
                        </div>
                    </div>
                )}

                <div style={dividerStyle} />

                {/* All Time — key/value list. Cost gets primary tint. */}
                <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={sectionLabelStyle}>
                        {t('ai.usage_sidebar.all_time')}
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span style={muteText}>{t('ai.usage_sidebar.total_requests')}</span>
                            <span className="font-medium tabular-nums">{stats.total_transactions.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span style={muteText}>{t('ai.usage_sidebar.total_tokens')}</span>
                            <span className="font-medium tabular-nums">{stats.total_tokens.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span style={muteText}>{t('ai.usage_sidebar.total_cost')}</span>
                            <span className="font-medium tabular-nums" style={{ color: 'var(--theme-brand-primary-500)' }}>
                                ${Number(stats.total_cost).toFixed(4)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
