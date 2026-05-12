import { useState, useEffect, useCallback, type CSSProperties } from 'react';

import { relativeDate } from '@alexandria/lib/formatDate';
import useT, { type Translator } from '@alexandria/hooks/useT';
import type { AiDashboardStats, QueuedNote, BatchSummary, NoteRouting } from '@alexandria/types/ai-dashboard';

interface DashboardTabProps {
    projectId: number;
    stats: AiDashboardStats;
}

/* ── Theme styles ── */

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };

// Stat-card inner surface — opaque base-surface for normal cards.
// Outer paper-board wraps this in render to hold the ::before yellow
// bevel; this inner div paints above the bevel within bounds so only
// the 3px/4px offset peeks out at bottom-right. Same nested pattern
// as the Note Queue / Recent Batches cards below.
//
// `height: 100%` is the critical bit when these cards sit in a grid:
// CSS Grid stretches each grid item (= the outer paper-board) to the
// row's max height, but the inner div would otherwise size to its own
// content. Without this, cards with less content leave the outer
// extending past the inner — and the yellow bevel shows through the
// gap. height:100% pins the inner to the outer's stretched height so
// the bevel only peeks at its proper 3px/4px offset.
const cardStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    borderRadius: 'inherit',
    padding: '1rem',
    height: '100%',
};

// Gradient stat-card inner — same nested-div pattern as `cardStyle`
// above. The gradient paints over the bevel within bounds; only the
// 3px/4px offset peeks out at bottom-right. `height: 100%` keeps the
// inner pinned to the grid-stretched outer height — see cardStyle's
// comment for the rationale.
const gradientCardStyle: CSSProperties = {
    background: 'linear-gradient(135deg, var(--theme-brand-primary-500), var(--theme-brand-secondary-500))',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'inherit',
    padding: '1rem',
    height: '100%',
};

// Matches the Notes Dashboard's nested-div pattern: outer .paper-board
// owns the bevel pseudo (transparent bg so ::before isn't covered by
// the parent's own background), inner div owns the brown surface so it
// paints ABOVE the ::before within the parent's bounds. Result: brown
// card body with the yellow ::before bevel peeking out 3px right + 4px
// down at the bottom-right — exactly the Recent Notes look on the
// Notes Dashboard.
const paperBoardOuterStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-card)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const paperBoardInnerStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    borderRadius: 'inherit',
    // Match grid-stretched outer height so the inner always covers the
    // bevel within bounds — same reasoning as cardStyle above.
    height: '100%',
};

const paperBoardHeaderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const rowDividerStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const queueCountBadgeStyle: CSSProperties = {
    background: 'var(--theme-status-warning-fill)',
    color: 'var(--theme-status-warning-content)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 600,
};

const emptyIconWrapStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    borderRadius: '9999px',
};

const progressTrackStyle: CSSProperties = {
    height: '0.375rem',
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    borderRadius: '9999px',
    overflow: 'hidden',
    display: 'flex',
    width: '100%',
};

const STATUS_COLOR: Record<string, { fill: string; content: string; stroke: string }> = {
    pending: {
        fill: 'var(--theme-status-warning-fill)',
        content: 'var(--theme-status-warning-content)',
        stroke: 'var(--theme-status-warning-stroke)',
    },
    processing: {
        fill: 'var(--theme-status-info-fill)',
        content: 'var(--theme-status-info-content)',
        stroke: 'var(--theme-status-info-stroke)',
    },
    completed: {
        fill: 'var(--theme-status-success-fill)',
        content: 'var(--theme-status-success-content)',
        stroke: 'var(--theme-status-success-stroke)',
    },
    failed: {
        fill: 'var(--theme-status-error-fill)',
        content: 'var(--theme-status-error-content)',
        stroke: 'var(--theme-status-error-stroke)',
    },
};

const neutralBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-badge)',
};

function statusBadgeStyle(status: string): CSSProperties {
    const tokens = STATUS_COLOR[status];
    if (!tokens) return neutralBadgeStyle;
    return {
        background: tokens.fill,
        color: tokens.content,
        borderRadius: 'var(--theme-radius-badge)',
    };
}

/* ── Helpers ── */

function formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return String(tokens);
}

function formatCost(cost: number | string): string {
    const n = Number(cost);
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
}

function titleCase(slug: string): string {
    return slug
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

const STAT_ACCENT: Record<string, string> = {
    warning: 'var(--theme-brand-secondary-700)',
    secondary: 'var(--theme-brand-secondary-500)',
    primary: 'var(--theme-brand-primary-500)',
    info: 'var(--theme-status-info-stroke)',
    success: 'var(--theme-status-success-stroke)',
    error: 'var(--theme-status-error-stroke)',
};

function statIconWrapStyle(colorKey: string): CSSProperties {
    const accent = STAT_ACCENT[colorKey] ?? STAT_ACCENT.primary;
    return {
        background: `color-mix(in srgb, ${accent} 12%, transparent)`,
        color: accent,
        borderRadius: 'var(--theme-radius-input)',
    };
}

const gradientIconWrapStyle: CSSProperties = {
    // Tracks the brand's contrast colour (typically white-ish across
    // themes) instead of hardcoded #fff so the icon's frosted-glass
    // tint stays legible even in themes where pure white isn't the
    // right brand-content. 20% opacity over the gradient card below
    // preserves the "soft glass on coloured surface" look.
    background: 'color-mix(in srgb, var(--theme-brand-primary-content) 20%, transparent)',
    color: 'var(--theme-brand-primary-content)',
    borderRadius: 'var(--theme-radius-input)',
};

/* ── Stat Card ── */

interface StatCardProps {
    icon: string;
    label: string;
    value: string | number;
    subLabel?: string;
    colorKey: string;
    gradient?: boolean;
    budgetLabel?: string;
}

function StatCard({ icon, label, value, subLabel, colorKey, gradient, budgetLabel }: StatCardProps) {
    // Outer paper-board owns the yellow ::before bevel; inner div owns
    // the card surface + content. Same nested pattern as Note Queue /
    // Recent Batches below — see paperBoardOuterStyle for the rationale.
    if (gradient) {
        return (
            <div className="paper-board" style={paperBoardOuterStyle}>
                <div style={gradientCardStyle}>
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p
                                className="text-xs font-semibold uppercase tracking-wider"
                                style={{ color: 'color-mix(in srgb, var(--theme-brand-primary-content) 70%, transparent)' }}
                            >
                                {label}
                            </p>
                            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
                            {subLabel && (
                                <p
                                    className="mt-0.5 text-xs"
                                    style={{ color: 'color-mix(in srgb, var(--theme-brand-primary-content) 60%, transparent)' }}
                                >
                                    {subLabel}
                                </p>
                            )}
                            {budgetLabel && (
                                <p
                                    className="mt-0.5 text-xs"
                                    style={{ color: 'color-mix(in srgb, var(--theme-brand-primary-content) 60%, transparent)' }}
                                >
                                    {budgetLabel}
                                </p>
                            )}
                        </div>
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center" style={gradientIconWrapStyle}>
                            <i className={`${icon} text-sm`} aria-hidden="true" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="paper-board" style={paperBoardOuterStyle}>
            <div style={cardStyle}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={labelText}>
                            {label}
                        </p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
                        {subLabel && (
                            <p className="mt-0.5 text-xs" style={fadedText}>
                                {subLabel}
                            </p>
                        )}
                    </div>
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center" style={statIconWrapStyle(colorKey)}>
                        <i className={`${icon} text-sm`} aria-hidden="true" />
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Note Queue ── */

interface NoteQueueProps {
    projectId: number;
    t: Translator;
}

function NoteQueue({ projectId, t }: NoteQueueProps) {
    const [notes, setNotes] = useState<QueuedNote[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQueue = useCallback(() => {
        setLoading(true);
        fetch(`/api/v1/projects/${projectId}/ai/dashboard-queue`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data) => {
                setNotes(Array.isArray(data) ? data : (data.data ?? []));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [projectId]);

    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    return (
        // Outer paper-board: holds the ::before yellow bevel
        // (translate 3px,4px) at z-index -1. No background here — the
        // ::before would be covered if the outer had its own bg.
        // Inner div: opaque base-surface (brown). In-flow children paint
        // ABOVE z-index -1 pseudos in the same stacking context, so the
        // brown body covers the bevel within the outer's bounds; the
        // 3px/4px offset peeks out at bottom-right. Same recipe as
        // Notes Dashboard's Recent Notes panel.
        <div className="paper-board" style={paperBoardOuterStyle}>
            <div className="overflow-hidden" style={paperBoardInnerStyle}>
                <div className="flex items-center justify-between px-5 py-4" style={paperBoardHeaderStyle}>
                    <h2 className="font-serif text-xl font-bold tracking-tight">
                        {t('ai.dashboard_tab.queue.title')}
                    </h2>
                    {!loading && notes.length > 0 && (
                        <span style={queueCountBadgeStyle}>{notes.length}</span>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <i
                            className="fa-solid fa-circle-notch fa-spin text-base"
                            style={{ color: 'var(--theme-brand-primary-500)' }}
                            aria-hidden="true"
                        />
                    </div>
                ) : notes.length === 0 ? (
                    <div className="py-10 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center" style={emptyIconWrapStyle}>
                            <i className="fa-solid fa-inbox text-lg" style={microText} aria-hidden="true" />
                        </div>
                        <p className="text-sm font-medium" style={labelText}>
                            {t('ai.dashboard_tab.queue.empty')}
                        </p>
                    </div>
                ) : (
                    <div>
                        {notes.map((note, i) => (
                            <NoteQueueItem
                                key={note.note_id}
                                note={note}
                                isLast={i === notes.length - 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function NoteQueueItem({ note, isLast }: { note: QueuedNote; isLast: boolean }) {
    return (
        <div className="px-4 py-3" style={isLast ? undefined : rowDividerStyle}>
            <div className="mb-2">
                <p className="truncate text-sm font-medium">{note.note_title}</p>
                <p className="mt-0.5 text-xs" style={fadedText}>
                    {relativeDate(note.note_created_at)}
                    {note.creator_name ? ` · ${note.creator_name}` : ''}
                </p>
            </div>

            {note.routings.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {note.routings.map((routing: NoteRouting) => (
                        <BlueprintBadge key={routing.blueprint_id} routing={routing} />
                    ))}
                </div>
            )}
        </div>
    );
}

function BlueprintBadge({ routing }: { routing: NoteRouting }) {
    const iconClass = routing.blueprint_icon
        ? routing.blueprint_icon.includes(' ')
            ? routing.blueprint_icon
            : `fa-solid ${routing.blueprint_icon}`
        : 'fa-solid fa-cube';

    return (
        <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium"
            style={statusBadgeStyle(routing.processing_status)}
        >
            <i className={`${iconClass} text-[9px]`} aria-hidden="true" />
            {routing.blueprint_name}
        </span>
    );
}

/* ── Recent Batches ── */

interface RecentBatchesProps {
    projectId: number;
    t: Translator;
}

function RecentBatches({ projectId, t }: RecentBatchesProps) {
    const [batches, setBatches] = useState<BatchSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/v1/projects/${projectId}/ai/dashboard-batches?per_page=5&status=all`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data) => {
                setBatches(data.data ?? []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [projectId]);

    // Priority sort: failed → pending → executed. Surfaces batches that
    // need attention first, then in-flight, then done.
    const sortedBatches = [...batches].sort((a, b) => {
        const rank = (x: BatchSummary) => {
            if (x.failed_count > 0) return 0;
            if (x.pending_count > 0) return 1;
            return 2;
        };
        return rank(a) - rank(b);
    });

    return (
        // Same outer-paper-board + inner-bg nested pattern as Note
        // Queue above — see that comment for the layering rationale.
        <div className="paper-board" style={paperBoardOuterStyle}>
            <div className="overflow-hidden" style={paperBoardInnerStyle}>
                <div className="px-5 py-4" style={paperBoardHeaderStyle}>
                    <h2 className="font-serif text-xl font-bold tracking-tight">
                        {t('ai.dashboard_tab.batches.title')}
                    </h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <i
                            className="fa-solid fa-circle-notch fa-spin text-base"
                            style={{ color: 'var(--theme-brand-primary-500)' }}
                            aria-hidden="true"
                        />
                    </div>
                ) : batches.length === 0 ? (
                    <div className="py-10 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center" style={emptyIconWrapStyle}>
                            <i className="fa-solid fa-layer-group text-lg" style={microText} aria-hidden="true" />
                        </div>
                        <p className="text-sm font-medium" style={labelText}>
                            {t('ai.dashboard_tab.batches.empty')}
                        </p>
                    </div>
                ) : (
                    <div>
                        {sortedBatches.map((batch, i) => (
                            <BatchRow key={batch.batch_id} batch={batch} t={t} isLast={i === sortedBatches.length - 1} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function BatchRow({ batch, t, isLast }: { batch: BatchSummary; t: Translator; isLast: boolean }) {
    const total = batch.total_commands;
    const executed = batch.executed_count;
    const pending = batch.pending_count;
    const failed = batch.failed_count;
    const rejected = batch.rejected_count;

    const pctOf = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '0%');

    const label = batch.blueprint_slug ? titleCase(batch.blueprint_slug) : 'Batch';

    return (
        <div className="px-4 py-3" style={isLast ? undefined : rowDividerStyle}>
            <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{label}</p>
                    <p className="mt-0.5 text-xs" style={fadedText}>{relativeDate(batch.created_at)}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-mono tabular-nums" style={labelText}>
                    {executed}/{total}
                </span>
            </div>

            {/* Progress bar */}
            <div style={progressTrackStyle}>
                {executed > 0 && (
                    <div style={{ width: pctOf(executed), background: 'var(--theme-status-success-stroke)' }} />
                )}
                {pending > 0 && (
                    <div style={{ width: pctOf(pending), background: 'var(--theme-status-warning-stroke)' }} />
                )}
                {failed > 0 && (
                    <div style={{ width: pctOf(failed), background: 'var(--theme-status-error-stroke)' }} />
                )}
                {rejected > 0 && (
                    <div style={{ width: pctOf(rejected), background: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)' }} />
                )}
            </div>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {executed > 0 && (
                    <span className="text-xs" style={{ color: 'var(--theme-status-success-stroke)' }}>
                        {t('ai.dashboard_tab.batch.executed').replace(':count', String(executed))}
                    </span>
                )}
                {pending > 0 && (
                    <span className="text-xs" style={{ color: 'var(--theme-status-warning-stroke)' }}>
                        {t('ai.dashboard_tab.batch.pending').replace(':count', String(pending))}
                    </span>
                )}
                {failed > 0 && (
                    <span className="text-xs" style={{ color: 'var(--theme-status-error-stroke)' }}>
                        {t('ai.dashboard_tab.batch.failed').replace(':count', String(failed))}
                    </span>
                )}
                {rejected > 0 && (
                    <span className="text-xs" style={fadedText}>
                        {t('ai.dashboard_tab.batch.rejected').replace(':count', String(rejected))}
                    </span>
                )}
            </div>
        </div>
    );
}

/* ── Dashboard Tab ── */

export default function DashboardTab({ projectId, stats }: DashboardTabProps) {
    const t = useT();

    return (
        <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard
                    icon="fa-solid fa-inbox"
                    label={t('ai.dashboard_tab.stat.queued_notes')}
                    value={stats.queue_pending}
                    colorKey="warning"
                />
                <StatCard
                    icon="fa-solid fa-clipboard-list"
                    label={t('ai.dashboard_tab.stat.pending_commands')}
                    value={stats.queue_total - stats.queue_pending}
                    colorKey="secondary"
                />
                <StatCard
                    icon="fa-solid fa-calendar"
                    label={t('ai.dashboard_tab.stat.this_month')}
                    value={stats.this_month_transactions}
                    subLabel={t('ai.dashboard_tab.stat.this_month_sub')}
                    colorKey="primary"
                />
                <StatCard
                    icon="fa-solid fa-coins"
                    label={t('ai.dashboard_tab.stat.token_usage')}
                    value={formatTokens(stats.total_tokens)}
                    colorKey="info"
                />
                <StatCard
                    icon="fa-solid fa-dollar-sign"
                    label={t('ai.dashboard_tab.stat.monthly_cost')}
                    value={formatCost(stats.this_month_cost)}
                    colorKey="primary"
                    gradient
                />
            </div>

            {/* Queue + Batches */}
            <div className="grid gap-6 lg:grid-cols-2">
                <NoteQueue projectId={projectId} t={t} />
                <RecentBatches projectId={projectId} t={t} />
            </div>
        </div>
    );
}
