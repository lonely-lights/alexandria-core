/**
 * @deprecated CommandsTab is superseded by the Sorting Workbench Creation tab
 * (pages/AI/Workbench.tsx → WorkbenchCreationTab → Review pane) for Level-2
 * command generation and review. Do not extend this component; new command
 * review surfaces belong in WorkbenchCreationTab.
 */
import { useMemo, useState, type CSSProperties } from 'react';
import CommandReviewModal from '@alexandria/components/notes/CommandReviewModal';
import Pagination from '@alexandria/components/ui/Pagination';
import { useJsonFetch } from '@alexandria/lib/fetchJson';
import { relativeDate } from '@alexandria/lib/formatDate';
import useT, { type Translator } from '@alexandria/hooks/useT';
import type { BatchSummary, PaginatedResponse } from '@alexandria/types/ai-dashboard';

/* ── Types ── */

type StatusFilter = 'all' | 'pending' | 'executed' | 'failed';

interface CommandsTabProps {
    projectId: number;
}

/* ── Theme styles ── */

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };

const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-content) 4%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    boxShadow: '0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
    padding: '1rem',
    transition: 'border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const dashedEmptyStyle: CSSProperties = {
    border: '1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const emptyIconWrapStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    borderRadius: '9999px',
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

const countBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 500,
};

const progressTrackStyle: CSSProperties = {
    height: '0.375rem',
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    borderRadius: '9999px',
    overflow: 'hidden',
    display: 'flex',
    width: '100%',
};

const reviewBtnStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.75rem',
    gap: '0.25rem',
    flexShrink: 0,
};

function iconBubbleStyle(status: 'pending' | 'executed' | 'failed' | 'mixed'): CSSProperties {
    const map: Record<typeof status, { fill: string; stroke: string }> = {
        pending: {
            fill: 'color-mix(in srgb, var(--theme-status-warning-stroke) 12%, transparent)',
            stroke: 'var(--theme-status-warning-stroke)',
        },
        executed: {
            fill: 'color-mix(in srgb, var(--theme-status-success-stroke) 12%, transparent)',
            stroke: 'var(--theme-status-success-stroke)',
        },
        failed: {
            fill: 'color-mix(in srgb, var(--theme-status-error-stroke) 12%, transparent)',
            stroke: 'var(--theme-status-error-stroke)',
        },
        mixed: {
            fill: 'color-mix(in srgb, var(--theme-status-warning-stroke) 12%, transparent)',
            stroke: 'var(--theme-status-warning-stroke)',
        },
    };
    const tokens = map[status];
    return {
        background: tokens.fill,
        color: tokens.stroke,
        borderRadius: 'var(--theme-radius-input)',
    };
}

/* ── Helpers ── */

function titleCase(slug: string): string {
    return slug
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function truncateModel(name: string | null): string {
    if (!name) return '';
    return name.length > 24 ? name.slice(0, 22) + '…' : name;
}

function formatCost(cost: number | null): string {
    if (cost == null) return '';
    return `$${Number(cost).toFixed(4)}`;
}

function batchStatus(batch: BatchSummary): 'pending' | 'executed' | 'failed' | 'mixed' {
    if (batch.failed_count > 0) return 'failed';
    if (batch.pending_count > 0 || batch.approved_count > 0) return 'pending';
    if (batch.executed_count > 0) return 'executed';
    return 'pending';
}

/* ── Batch Card ── */

interface BatchCardProps {
    batch: BatchSummary;
    onReview: (batchId: string) => void;
    t: Translator;
}

function BatchCard({ batch, onReview, t }: BatchCardProps) {
    const total = batch.total_commands;
    const status = batchStatus(batch);

    const iconName = status === 'pending'
        ? 'fa-solid fa-clock'
        : status === 'executed'
            ? 'fa-solid fa-check-circle'
            : 'fa-solid fa-circle-exclamation';

    const batchName = batch.blueprint_slug
        ? titleCase(batch.blueprint_slug)
        : t('ai.commands_tab.batch.fallback_name');

    const pctOf = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '0%');

    return (
        <div style={cardStyle}>
            <div className="flex items-start gap-3">
                {/* Icon box */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center" style={iconBubbleStyle(status)}>
                    <i className={`${iconName} text-sm`} aria-hidden="true" />
                </div>

                {/* Main content */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{batchName}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs" style={fadedText}>
                                <span>{relativeDate(batch.created_at)}</span>
                                {batch.model_name && (
                                    <>
                                        <span>·</span>
                                        <span className="truncate font-mono">{truncateModel(batch.model_name)}</span>
                                    </>
                                )}
                                {batch.cost != null && batch.cost > 0 && (
                                    <>
                                        <span>·</span>
                                        <span>{formatCost(batch.cost)}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Review button */}
                        <button
                            type="button"
                            onClick={() => onReview(batch.batch_id)}
                            className="alex-btn inline-flex items-center"
                            style={reviewBtnStyle}
                        >
                            <i className="fa-solid fa-eye text-xs" aria-hidden="true" />
                            {t('ai.commands_tab.batch.review')}
                        </button>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3" style={progressTrackStyle}>
                        {batch.executed_count > 0 && (
                            <div style={{ width: pctOf(batch.executed_count), background: 'var(--theme-status-success-stroke)' }} />
                        )}
                        {batch.approved_count > 0 && (
                            <div style={{ width: pctOf(batch.approved_count), background: 'var(--theme-status-info-stroke)' }} />
                        )}
                        {batch.pending_count > 0 && (
                            <div style={{ width: pctOf(batch.pending_count), background: 'var(--theme-status-warning-stroke)' }} />
                        )}
                        {batch.failed_count > 0 && (
                            <div style={{ width: pctOf(batch.failed_count), background: 'var(--theme-status-error-stroke)' }} />
                        )}
                        {batch.rejected_count > 0 && (
                            <div style={{ width: pctOf(batch.rejected_count), background: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)' }} />
                        )}
                    </div>

                    {/* Status counts */}
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        {batch.executed_count > 0 && (
                            <span className="text-xs" style={{ color: 'var(--theme-status-success-stroke)' }}>
                                {t('ai.commands_tab.batch.executed').replace(':count', String(batch.executed_count))}
                            </span>
                        )}
                        {batch.approved_count > 0 && (
                            <span className="text-xs" style={{ color: 'var(--theme-status-info-stroke)' }}>
                                {t('ai.commands_tab.batch.approved').replace(':count', String(batch.approved_count))}
                            </span>
                        )}
                        {batch.pending_count > 0 && (
                            <span className="text-xs" style={{ color: 'var(--theme-status-warning-stroke)' }}>
                                {t('ai.commands_tab.batch.pending').replace(':count', String(batch.pending_count))}
                            </span>
                        )}
                        {batch.failed_count > 0 && (
                            <span className="text-xs" style={{ color: 'var(--theme-status-error-stroke)' }}>
                                {t('ai.commands_tab.batch.failed').replace(':count', String(batch.failed_count))}
                            </span>
                        )}
                        {batch.rejected_count > 0 && (
                            <span className="text-xs" style={fadedText}>
                                {t('ai.commands_tab.batch.rejected').replace(':count', String(batch.rejected_count))}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Commands Tab ── */

export default function CommandsTab({ projectId }: CommandsTabProps) {
    const t = useT();
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [page, setPage] = useState(1);

    const [reviewBatchId, setReviewBatchId] = useState<string>('');
    const [showReview, setShowReview] = useState(false);

    const url = useMemo(() => {
        const params = new URLSearchParams({
            page: String(page),
            per_page: '15',
            ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        });
        return `/api/v1/projects/${projectId}/ai/dashboard-batches?${params}`;
    }, [projectId, page, statusFilter]);

    const { data: response, loading, refetch: fetchBatches } = useJsonFetch<PaginatedResponse<BatchSummary>>(url);

    function handleFilterChange(filter: StatusFilter) {
        setStatusFilter(filter);
        setPage(1);
    }

    function openReview(batchId: string) {
        setReviewBatchId(batchId);
        setShowReview(true);
    }

    function closeReview() {
        setShowReview(false);
    }

    const batches = response?.data ?? [];

    const STATUS_FILTERS: { value: StatusFilter; labelKey: string }[] = [
        { value: 'all', labelKey: 'ai.commands_tab.filter.all' },
        { value: 'pending', labelKey: 'ai.commands_tab.filter.pending' },
        { value: 'executed', labelKey: 'ai.commands_tab.filter.executed' },
        { value: 'failed', labelKey: 'ai.commands_tab.filter.failed' },
    ];

    // Priority sort — failed need attention first, then in-flight,
    // then completed. Applied client-side on the current page; the
    // user's chosen status filter already narrows server-side.
    const sortedBatches = [...batches].sort((a, b) => {
        const rank = (x: BatchSummary) => {
            if (x.failed_count > 0) return 0;
            if (x.pending_count > 0 || x.approved_count > 0) return 1;
            return 2;
        };
        return rank(a) - rank(b);
    });

    return (
        <div className="space-y-4">
            {/* Header — title + count + status filter chips */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                    <h2 className="font-serif text-xl font-bold tracking-tight sm:text-2xl">
                        {t('ai.commands_tab.title')}
                    </h2>
                    {response && response.total > 0 && (
                        <span style={countBadgeStyle}>
                            {response.total === 1
                                ? t('ai.commands_tab.batch_count.one').replace(':count', String(response.total))
                                : t('ai.commands_tab.batch_count.many').replace(':count', String(response.total))}
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            type="button"
                            onClick={() => handleFilterChange(f.value)}
                            className="alex-btn inline-flex items-center px-3 py-1 text-sm font-medium"
                            style={statusFilter === f.value ? tabActiveStyle : tabIdleStyle}
                            aria-pressed={statusFilter === f.value}
                        >
                            {t(f.labelKey)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Batch list */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <i
                        className="fa-solid fa-circle-notch fa-spin text-base"
                        style={{ color: 'var(--theme-brand-primary-500)' }}
                        aria-hidden="true"
                    />
                </div>
            ) : batches.length === 0 ? (
                <div className="py-12 text-center" style={dashedEmptyStyle}>
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center" style={emptyIconWrapStyle}>
                        <i className="fa-solid fa-layer-group text-xl" style={microText} aria-hidden="true" />
                    </div>
                    <p className="text-sm font-medium" style={labelText}>
                        {t('ai.commands_tab.empty.title')}
                    </p>
                    {statusFilter !== 'all' && (
                        <p className="mt-1 text-xs" style={microText}>
                            {t('ai.commands_tab.empty.hint')}
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedBatches.map((batch) => (
                        <BatchCard key={batch.batch_id} batch={batch} onReview={openReview} t={t} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {response && (
                <Pagination
                    currentPage={response.current_page}
                    lastPage={response.last_page}
                    from={response.from}
                    to={response.to}
                    total={response.total}
                    onPageChange={setPage}
                />
            )}

            {/* Review modal */}
            <CommandReviewModal
                open={showReview}
                onClose={closeReview}
                batchId={reviewBatchId}
                projectId={projectId}
                onExecuted={() => {
                    closeReview();
                    fetchBatches();
                }}
                onStatusChange={fetchBatches}
            />
        </div>
    );
}
