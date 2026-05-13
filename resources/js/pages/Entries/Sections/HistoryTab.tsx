import { useState, useMemo, type CSSProperties } from 'react';
import useT, { type Translator } from '@alexandria/hooks/useT';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import type { HistoryRecord } from '../Show';
import {
    cardOuter,
    cardInner,
    emptyStateInner,
    emptyIconStyle,
    emptyLabelStyle,
    gradientHeaderPrimary,
    headerIconPrimaryMuted,
    countBadge,
    sortTriggerPrimaryActive,
    sortTriggerPrimaryIdle,
    chipStyle,
} from './entriesTabStyles';

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

const MONO_FONT_STACK = 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace';

function sortLabels(t: Translator): Record<SortKey, string> {
    return {
        'default': t('entries.tab.sort.default'),
        'newest': t('entries.tab.history.sort.newest'),
        'oldest': t('entries.tab.history.sort.oldest'),
    };
}

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

// Translation-key fallback labels for each change type. The label is
// only rendered when a record has no field_name (rare) — most rows fall
// through titleCase(field_name).
function changeTypeLabel(t: Translator, type: string): string {
    switch (type) {
        case 'attribute_update': return t('entries.tab.history.change_type.attribute_update');
        case 'metadata_update': return t('entries.tab.history.change_type.metadata_update');
        case 'bulk_update': return t('entries.tab.history.change_type.bulk_update');
        default: return t('entries.tab.history.change_type.field_update');
    }
}

/* ─── Styles ─── */

const summaryRowBaseStyle: CSSProperties = {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1.25rem',
    textAlign: 'left',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color var(--theme-motion-duration-fast, 150ms) ease',
};

const summaryRowIdleStyle: CSSProperties = {
    ...summaryRowBaseStyle,
    background: 'transparent',
};

const summaryRowExpandedStyle: CSSProperties = {
    ...summaryRowBaseStyle,
    background: 'color-mix(in srgb, var(--theme-base-300) 40%, transparent)',
};

const summaryNameStyle: CSSProperties = {
    color: 'var(--theme-base-content)',
};

const summaryMetaStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const chevronBaseStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
    transition: 'transform 200ms ease',
};

const groupDividerStyle: CSSProperties = {
    borderTop: '1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const diffWrapStyle: CSSProperties = {
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    background: 'color-mix(in srgb, var(--theme-base-300) 30%, transparent)',
    padding: '1rem 1.25rem',
};

const diffFieldLabelBoxStyle: CSSProperties = {
    marginBottom: '0.75rem',
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    paddingBottom: '0.5rem',
};

const diffFieldLabelStyle: CSSProperties = {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

const diffHeadingBaseStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    marginBottom: '0.25rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const diffBeforeHeadingStyle: CSSProperties = {
    ...diffHeadingBaseStyle,
    color: 'color-mix(in srgb, var(--theme-status-error-stroke) 60%, transparent)',
};

const diffAfterHeadingStyle: CSSProperties = {
    ...diffHeadingBaseStyle,
    color: 'color-mix(in srgb, var(--theme-status-success-stroke) 60%, transparent)',
};

const diffBeforePanelStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-card)',
    border: '1px solid color-mix(in srgb, var(--theme-status-error-stroke) 15%, transparent)',
    background: 'color-mix(in srgb, var(--theme-status-error-stroke) 5%, transparent)',
    padding: '0.75rem',
};

const diffAfterPanelStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-card)',
    border: '1px solid color-mix(in srgb, var(--theme-status-success-stroke) 15%, transparent)',
    background: 'color-mix(in srgb, var(--theme-status-success-stroke) 5%, transparent)',
    padding: '0.75rem',
};

const diffPreStyle: CSSProperties = {
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    fontFamily: MONO_FONT_STACK,
    fontSize: '0.75rem',
    lineHeight: 1.625,
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

const diffEmptyStyle: CSSProperties = {
    fontSize: '0.75rem',
    fontStyle: 'italic',
    color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

/* ─── Component ─── */

export default function HistoryTab({ history }: HistoryTabProps) {
    const t = useT();
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
                    ? (sorted[0].change_summary ?? t('entries.tab.history.summary_fallback'))
                    : t('entries.tab.history.summary_multi').replace(':fields', sorted.map((r) => r.field_name).filter(Boolean).join(', ')),
            };
        });
    }, [history, t]);

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
            <div className="paper-board" style={cardOuter}>
                <div style={emptyStateInner}>
                    <i className="fa-solid fa-clock-rotate-left mb-3 text-3xl" style={emptyIconStyle} />
                    <p className="text-sm font-medium" style={emptyLabelStyle}>{t('entries.tab.history.empty')}</p>
                </div>
            </div>
        );
    }

    const labels = sortLabels(t);
    const sortItems = (Object.keys(labels) as SortKey[]).map((k) => ({
        label: labels[k],
        icon: sort === k ? 'fa-solid fa-check' : undefined,
        onClick: () => setSort(k),
    }));

    const isActive = sort !== 'default';
    const countLabel = t(groups.length === 1 ? 'entries.tab.history.count.singular' : 'entries.tab.history.count.plural')
        .replace(':count', String(groups.length));

    return (
        <div className="paper-board" style={cardOuter}>
            <div className="overflow-hidden" style={cardInner}>
                <div className="flex items-center gap-2 px-5 py-3" style={gradientHeaderPrimary}>
                    <i className="fa-solid fa-clock-rotate-left text-xs" style={headerIconPrimaryMuted} />
                    <h3 className="text-sm font-semibold">{t('entries.tab.history.heading')}</h3>
                    <span style={countBadge}>{countLabel}</span>
                    <DropdownMenu
                        align="right"
                        trigger={
                            <button
                                type="button"
                                style={isActive ? sortTriggerPrimaryActive : sortTriggerPrimaryIdle}
                            >
                                <i className="fa-solid fa-arrow-down-short-wide text-[11px]" />
                                <span>{labels[sort]}</span>
                            </button>
                        }
                        items={sortItems}
                    />
                </div>
                <div>
                    {sortedGroups.map((group, idx) => {
                        const isExpanded = expandedId === group.id;

                        return (
                            <div key={group.id} style={idx > 0 ? groupDividerStyle : undefined}>
                                <button
                                    type="button"
                                    onClick={() => setExpandedId(isExpanded ? null : group.id)}
                                    className="alex-row"
                                    style={isExpanded ? summaryRowExpandedStyle : summaryRowIdleStyle}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium" style={summaryNameStyle}>
                                                {group.summary}
                                            </span>
                                            {group.records.length > 1 && (
                                                <span style={chipStyle}>
                                                    {t('entries.tab.history.field_count').replace(':count', String(group.records.length))}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 flex items-center gap-3 text-xs" style={summaryMetaStyle}>
                                            {group.created_at && (
                                                <span>{new Date(group.created_at).toLocaleString()}</span>
                                            )}
                                            {group.user && (
                                                <span>{t('entries.tab.history.user_attribution').replace(':name', group.user.display_name ?? group.user.name)}</span>
                                            )}
                                        </div>
                                    </div>

                                    <i
                                        className="fa-solid fa-chevron-right text-[10px]"
                                        style={{ ...chevronBaseStyle, transform: isExpanded ? 'rotate(90deg)' : undefined }}
                                    />
                                </button>

                                {isExpanded && (
                                    <div style={diffWrapStyle}>
                                        <div className="space-y-4">
                                            {group.records.map((record) => (
                                                <div key={record.id}>
                                                    <div style={diffFieldLabelBoxStyle}>
                                                        <span style={diffFieldLabelStyle}>
                                                            {titleCase(record.field_name ?? changeTypeLabel(t, record.change_type))}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <div style={diffBeforeHeadingStyle}>
                                                                <i className="fa-solid fa-minus text-[7px]" />
                                                                {t('entries.tab.history.diff.before')}
                                                            </div>
                                                            <div style={diffBeforePanelStyle}>
                                                                {record.previous_value ? (
                                                                    <pre style={diffPreStyle}>{record.previous_value}</pre>
                                                                ) : (
                                                                    <span style={diffEmptyStyle}>{t('entries.tab.history.diff.empty')}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div style={diffAfterHeadingStyle}>
                                                                <i className="fa-solid fa-plus text-[7px]" />
                                                                {t('entries.tab.history.diff.after')}
                                                            </div>
                                                            <div style={diffAfterPanelStyle}>
                                                                {record.new_value ? (
                                                                    <pre style={diffPreStyle}>{record.new_value}</pre>
                                                                ) : (
                                                                    <span style={diffEmptyStyle}>{t('entries.tab.history.diff.empty')}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
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
