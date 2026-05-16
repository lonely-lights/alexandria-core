import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import UserLink from '@alexandria/components/ui/UserHoverCard';
import Pagination from '@alexandria/components/ui/Pagination';
import { useJsonFetch } from '@alexandria/lib/fetchJson';
import useT, { type Translator } from '@alexandria/hooks/useT';

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

/* ── Theme styles ── */

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const bodyText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)' };

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.375rem 0.625rem',
    fontSize: '0.875rem',
};

const selectStyle: CSSProperties = {
    ...inputStyle,
    paddingRight: '2rem',
};

const clearBtnStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-status-error-stroke)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
};

const tableCardOuterStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const tableInnerStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    borderRadius: 'inherit',
    boxShadow: '0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const emptyIconBubbleStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: '9999px',
};

const tableHeaderCellStyle: CSSProperties = {
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
    fontWeight: 600,
};

const subjectIconBubbleStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
};

const rowBorderDashed: CSSProperties = {
    borderBottom: '1px dashed color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};

const causerLinkStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    transition: 'color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
};

const EVENT_BADGE: Record<string, CSSProperties> = {
    created: {
        background: 'var(--theme-status-success-fill)',
        color: 'var(--theme-status-success-content)',
        borderRadius: 'var(--theme-radius-badge)',
    },
    updated: {
        background: 'var(--theme-status-info-fill)',
        color: 'var(--theme-status-info-content)',
        borderRadius: 'var(--theme-radius-badge)',
    },
    deleted: {
        background: 'var(--theme-status-error-fill)',
        color: 'var(--theme-status-error-content)',
        borderRadius: 'var(--theme-radius-badge)',
    },
};

const NEUTRAL_EVENT_BADGE: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-badge)',
};

function eventBadgeStyle(event: string): CSSProperties {
    return EVENT_BADGE[event] ?? NEUTRAL_EVENT_BADGE;
}

/**
 * Resolve a human-readable event label, falling back to title-cased
 * slug when no translation key exists. Lets unknown server events stay
 * legible without us needing to enumerate every one in lang files.
 */
function eventLabel(t: Translator, event: string): string {
    const key = `projects.activity_tab.event.${event}`;
    const lookup = t(key, '');
    if (lookup) return lookup;
    return event.charAt(0).toUpperCase() + event.slice(1);
}

export default function ActivityTab({ projectId }: ActivityTabProps) {
    const t = useT();

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
    const { data: filters } = useJsonFetch<Filters>(
        `/api/v1/projects/${projectId}/activity/filters`,
    );

    // Fetch activity — URL recomputes when any filter changes.
    const activityUrl = useMemo(() => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('per_page', String(perPage));
        if (blueprintId) params.set('blueprint_id', blueprintId);
        if (userId) params.set('user_id', userId);
        if (event) params.set('event', event);
        if (subjectType) params.set('subject_type', subjectType);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);
        return `/api/v1/projects/${projectId}/activity?${params}`;
    }, [projectId, page, perPage, blueprintId, userId, event, subjectType, dateFrom, dateTo]);

    const { data: activityData, loading } = useJsonFetch<{
        data: ActivityItem[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    }>(activityUrl);

    const items = activityData?.data ?? [];
    const meta: PaginationMeta | null = activityData ? {
        current_page: activityData.current_page,
        last_page: activityData.last_page,
        per_page: activityData.per_page,
        total: activityData.total,
        from: activityData.from,
        to: activityData.to,
    } : null;

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
                <FilterField label={t('projects.activity_tab.filter.type')} minWidth="120px">
                    <select value={subjectType} onChange={(e) => applyFilter(setSubjectType, e.target.value)} style={selectStyle}>
                        <option value="">{t('projects.activity_tab.filter.type_all')}</option>
                        <option value="entry">{t('projects.activity_tab.filter.type_entry')}</option>
                        <option value="blueprint">{t('projects.activity_tab.filter.type_blueprint')}</option>
                    </select>
                </FilterField>

                <FilterField label={t('projects.activity_tab.filter.blueprint')} minWidth="140px">
                    <select value={blueprintId} onChange={(e) => applyFilter(setBlueprintId, e.target.value)} style={selectStyle}>
                        <option value="">{t('projects.activity_tab.filter.all')}</option>
                        {filters?.blueprints.map((bp) => (
                            <option key={bp.id} value={bp.id}>{bp.name}</option>
                        ))}
                    </select>
                </FilterField>

                <FilterField label={t('projects.activity_tab.filter.event')} minWidth="120px">
                    <select value={event} onChange={(e) => applyFilter(setEvent, e.target.value)} style={selectStyle}>
                        <option value="">{t('projects.activity_tab.filter.all')}</option>
                        {filters && Object.entries(filters.events).map(([key]) => (
                            <option key={key} value={key}>{eventLabel(t, key)}</option>
                        ))}
                    </select>
                </FilterField>

                <FilterField label={t('projects.activity_tab.filter.user')} minWidth="140px">
                    <select value={userId} onChange={(e) => applyFilter(setUserId, e.target.value)} style={selectStyle}>
                        <option value="">{t('projects.activity_tab.filter.all')}</option>
                        {filters?.members.map((m) => (
                            <option key={m.id} value={m.id}>{m.display_name ?? m.name}</option>
                        ))}
                    </select>
                </FilterField>

                <FilterField label={t('projects.activity_tab.filter.from')}>
                    <input type="date" value={dateFrom} onChange={(e) => applyFilter(setDateFrom, e.target.value)} style={inputStyle} />
                </FilterField>
                <FilterField label={t('projects.activity_tab.filter.to')}>
                    <input type="date" value={dateTo} onChange={(e) => applyFilter(setDateTo, e.target.value)} style={inputStyle} />
                </FilterField>

                <FilterField label={t('projects.activity_tab.filter.per_page')}>
                    <select value={perPage} onChange={(e) => { setPerPage(parseInt(e.target.value)); setPage(1); }} style={selectStyle}>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </FilterField>

                {hasActiveFilters && (
                    <button type="button" onClick={clearFilters} className="alex-btn inline-flex items-center" style={clearBtnStyle}>
                        <i className="fa-solid fa-xmark mr-1" aria-hidden="true" />
                        {t('projects.activity_tab.filter.clear')}
                    </button>
                )}
            </div>

            {/* Activity table — header is always rendered so the page
                stays anchored visually while the body swaps between
                spinner / empty / rows. */}
            <div className="paper-board" style={tableCardOuterStyle}>
                <div className="overflow-x-auto" style={tableInnerStyle}>
                    <table className="w-full">
                        <thead>
                            <tr className="text-xs tracking-wider [&_th]:normal-case [&_th]:px-4 [&_th]:py-3">
                                <th className="first:rounded-tl-2xl text-left" style={tableHeaderCellStyle}>
                                    {t('projects.activity_tab.column.subject')}
                                </th>
                                <th className="text-left" style={tableHeaderCellStyle}>
                                    {t('projects.activity_tab.column.event')}
                                </th>
                                <th className="text-left" style={tableHeaderCellStyle}>
                                    {t('projects.activity_tab.column.description')}
                                </th>
                                <th className="text-left" style={tableHeaderCellStyle}>
                                    {t('projects.activity_tab.column.user')}
                                </th>
                                <th className="text-right last:rounded-tr-2xl" style={tableHeaderCellStyle}>
                                    {t('projects.activity_tab.column.when')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center">
                                        <i
                                            className="fa-solid fa-circle-notch fa-spin text-lg"
                                            style={microText}
                                            aria-hidden="true"
                                        />
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center">
                                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center" style={emptyIconBubbleStyle}>
                                            <i className="fa-solid fa-clock-rotate-left text-xl" style={microText} aria-hidden="true" />
                                        </div>
                                        <p className="font-medium" style={labelText}>
                                            {t('projects.activity_tab.empty.title')}
                                        </p>
                                        {hasActiveFilters && (
                                            <p className="mt-1 text-sm" style={fadedText}>
                                                {t('projects.activity_tab.empty.subtitle')}
                                            </p>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, i) => (
                                    <ActivityRow key={item.id} item={item} isLast={i === items.length - 1} t={t} />
                                ))
                            )}
                        </tbody>
                    </table>
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

/* ── FilterField ── label + control wrapper; replaces DaisyUI form-control */

function FilterField({ label, minWidth, children }: { label: string; minWidth?: string; children: ReactNode }) {
    return (
        <div className="flex flex-col" style={minWidth ? { minWidth } : undefined}>
            <label className="mb-0.5 text-xs" style={labelText}>{label}</label>
            {children}
        </div>
    );
}

/* ── Activity Row ── */

function ActivityRow({ item, isLast, t }: { item: ActivityItem; isLast: boolean; t: Translator }) {
    const subjectIcon = getSubjectIcon(item);
    const tdBorder = isLast ? undefined : rowBorderDashed;
    const baseTdStyle: CSSProperties = { padding: '0.625rem 1rem' };

    return (
        <tr>
            {/* Subject */}
            <td style={{ ...baseTdStyle, ...tdBorder }}>
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center" style={subjectIconBubbleStyle}>
                        <i className={`${subjectIcon} text-xs`} style={labelText} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium">
                            {item.subject?.name ?? t('projects.activity_tab.subject.deleted')}
                        </p>
                        {item.subject_type === 'entry' && item.subject?.blueprint_name && (
                            <p className="text-xs" style={fadedText}>{item.subject.blueprint_name}</p>
                        )}
                        {item.subject_type === 'blueprint' && (
                            <p className="text-xs" style={fadedText}>{t('projects.activity_tab.subject.blueprint_label')}</p>
                        )}
                    </div>
                </div>
            </td>

            {/* Event */}
            <td style={{ ...baseTdStyle, ...tdBorder }}>
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold" style={eventBadgeStyle(item.event)}>
                    {eventLabel(t, item.event)}
                </span>
            </td>

            {/* Description */}
            <td className="text-sm" style={{ ...baseTdStyle, ...tdBorder, ...bodyText }}>
                {item.description}
            </td>

            {/* User */}
            <td className="text-sm" style={{ ...baseTdStyle, ...tdBorder }}>
                {item.causer ? (
                    <UserLink
                        userId={item.causer.id}
                        href={`/u/${item.causer.name.toLowerCase()}`}
                        className="hover:underline"
                        style={causerLinkStyle}
                    >
                        {item.causer.display_name ?? item.causer.name}
                    </UserLink>
                ) : (
                    <span className="italic" style={microText}>{t('projects.activity_tab.causer.system')}</span>
                )}
            </td>

            {/* When */}
            <td className="text-right" style={{ ...baseTdStyle, ...tdBorder }}>
                <time
                    dateTime={item.created_at}
                    title={new Date(item.created_at).toLocaleString()}
                    className="text-xs"
                    style={fadedText}
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
