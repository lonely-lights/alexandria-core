import { useMemo, useState, type CSSProperties } from 'react';
import useT, { type Translator } from '@alexandria/hooks/useT';
import EntryLink from '@alexandria/components/entries/EntryLink';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import { formatStardate } from '@alexandria/lib/stardate';
import type { DynamicProperty } from '../Show';
import {
    cardOuter,
    cardInner,
    emptyStateInner,
    emptyIconStyle,
    emptyLabelStyle,
    gradientHeaderPrimary,
    gradientHeaderSecondary,
    headerIconPrimaryMuted,
    headerIconSecondaryMuted,
    countBadge,
    sortTriggerPrimaryActive,
    sortTriggerPrimaryIdle,
    sortTriggerSecondaryActive,
    sortTriggerSecondaryIdle,
    rowDivider,
    chipStyle,
    labelMuted,
    helperFainter,
    helperFaint,
} from './entriesTabStyles';

interface TemporalRecord {
    label: string;
    start: string | null;
    end: string | null;
    intensity: number | null;
    reference_id: number | null;
    notes: string | null;
}

interface AttributesTabProps {
    properties: DynamicProperty[];
}

type SimpleSortKey = 'default' | 'label-asc' | 'label-desc';
type TemporalSortKey =
    | 'default'
    | 'label-asc'
    | 'label-desc'
    | 'start-asc'
    | 'start-desc'
    | 'intensity-desc'
    | 'intensity-asc';

function simpleSortLabels(t: Translator): Record<SimpleSortKey, string> {
    return {
        'default': t('entries.tab.sort.default'),
        'label-asc': t('entries.tab.sort.name_asc'),
        'label-desc': t('entries.tab.sort.name_desc'),
    };
}

function temporalSortLabels(t: Translator): Record<TemporalSortKey, string> {
    return {
        'default': t('entries.tab.sort.default'),
        'label-asc': t('entries.tab.sort.name_asc'),
        'label-desc': t('entries.tab.sort.name_desc'),
        'start-asc': t('entries.tab.attribute.sort.earliest'),
        'start-desc': t('entries.tab.attribute.sort.latest'),
        'intensity-desc': t('entries.tab.attribute.sort.most_intense'),
        'intensity-asc': t('entries.tab.attribute.sort.least_intense'),
    };
}

const successColor: CSSProperties = {
    color: 'var(--theme-status-success-stroke)',
};

const linkBaseStyle: CSSProperties = {
    color: 'var(--theme-base-content)',
};

const externalIconStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

const temporalDotDoneStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

const temporalDotActiveStyle: CSSProperties = {
    background: 'var(--theme-status-success-stroke)',
};

const temporalLineStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)',
};

const labelStrongStyle: CSSProperties = {
    color: 'var(--theme-base-content)',
};

const notesStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const monoStyle: CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    color: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
};

const valueDefaultStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
};

const intensityDotInactiveStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const intensityDotActiveStyle: CSSProperties = {
    background: 'var(--theme-brand-secondary-500)',
};

export default function AttributesTab({ properties }: AttributesTabProps) {
    const t = useT();

    if (properties.length === 0) {
        return (
            <div className="paper-board" style={cardOuter}>
                <div style={emptyStateInner}>
                    <i className="fa-solid fa-list mb-3 text-3xl" style={emptyIconStyle} />
                    <p className="text-sm font-medium" style={emptyLabelStyle}>{t('entries.tab.attribute.empty')}</p>
                </div>
            </div>
        );
    }

    // Split into simple fields and temporal fields
    const simple = properties.filter((p) => p.type !== 'temporal');
    const temporal = properties.filter((p) => p.type === 'temporal' && Array.isArray(p.value));

    return (
        <div className="space-y-6">
            {simple.length > 0 && <SimpleCard properties={simple} />}

            {temporal.map((prop, i) => (
                <TemporalCard key={i} prop={prop} />
            ))}
        </div>
    );
}

/* ─── Simple attributes card ─── */

function SimpleCard({ properties }: { properties: DynamicProperty[] }) {
    const t = useT();
    const labels = simpleSortLabels(t);
    const [sort, setSort] = useState<SimpleSortKey>('default');

    const sorted = useMemo(() => sortSimple(properties, sort), [properties, sort]);

    const sortItems = (Object.keys(labels) as SimpleSortKey[]).map((k) => ({
        label: labels[k],
        icon: sort === k ? 'fa-solid fa-check' : undefined,
        onClick: () => setSort(k),
    }));

    const isActive = sort !== 'default';

    return (
        <div className="paper-board" style={cardOuter}>
            <div className="overflow-hidden" style={cardInner}>
                <div className="flex items-center gap-2 px-5 py-3" style={gradientHeaderPrimary}>
                    <i className="fa-solid fa-list text-xs" style={headerIconPrimaryMuted} />
                    <h3 className="text-sm font-semibold">{t('entries.tab.attribute.heading')}</h3>
                    <span style={countBadge}>
                        {t(properties.length === 1 ? 'entries.tab.attribute.field_count.singular' : 'entries.tab.attribute.field_count.plural').replace(':count', String(properties.length))}
                    </span>
                    <SortTrigger
                        label={labels[sort]}
                        isActive={isActive}
                        items={sortItems}
                        tone="primary"
                    />
                </div>
                <div>
                    {sorted.map((prop, i) => (
                        <div key={i} className="alex-row px-5 py-3.5" style={i > 0 ? rowDivider : undefined}>
                            <div className="text-sm font-semibold" style={labelMuted}>{prop.label}</div>
                            <div className="mt-1">
                                <SimpleValue prop={prop} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── Temporal records card ─── */

function TemporalCard({ prop }: { prop: DynamicProperty }) {
    const t = useT();
    const labels = temporalSortLabels(t);
    const [sort, setSort] = useState<TemporalSortKey>('default');
    const records = prop.value as TemporalRecord[];

    const sorted = useMemo(() => sortTemporal(records, sort), [sort]);

    const sortItems = (Object.keys(labels) as TemporalSortKey[]).map((k) => ({
        label: labels[k],
        icon: sort === k ? 'fa-solid fa-check' : undefined,
        onClick: () => setSort(k),
    }));

    const isActive = sort !== 'default';

    return (
        <div className="paper-board" style={cardOuter}>
            <div className="overflow-hidden" style={cardInner}>
                <div className="flex items-center gap-2 px-5 py-3" style={gradientHeaderSecondary}>
                    <i className="fa-solid fa-timeline text-xs" style={headerIconSecondaryMuted} />
                    <h3 className="text-sm font-semibold">{prop.label}</h3>
                    <span style={countBadge}>
                        {t(records.length === 1 ? 'entries.tab.attribute.record_count.singular' : 'entries.tab.attribute.record_count.plural').replace(':count', String(records.length))}
                    </span>
                    <SortTrigger
                        label={labels[sort]}
                        isActive={isActive}
                        items={sortItems}
                        tone="secondary"
                    />
                </div>
                <div>
                    {sorted.map((record, j) => (
                        <div key={j} className="alex-row flex gap-4 px-5 py-3.5" style={j > 0 ? rowDivider : undefined}>
                            {/* Timeline indicator */}
                            <div className="flex flex-col items-center pt-1">
                                <div className="h-2.5 w-2.5 rounded-full" style={record.end ? temporalDotDoneStyle : temporalDotActiveStyle} />
                                <div className="mt-1 w-px flex-1" style={temporalLineStyle} />
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium" style={labelStrongStyle}>{record.label}</div>
                                {record.notes && (
                                    <p className="mt-0.5 text-xs leading-relaxed" style={notesStyle}>{record.notes}</p>
                                )}
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={helperFaint}>
                                    <span>
                                        {formatDate(record.start)}
                                        {' — '}
                                        {record.end ? formatDate(record.end) : <span style={successColor}>{t('entries.tab.attribute.present')}</span>}
                                    </span>
                                    {record.intensity != null && (
                                        <span className="flex items-center gap-1">
                                            <IntensityBar value={record.intensity} />
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── Sort trigger (shared) ─── */

function SortTrigger({
    label,
    isActive,
    items,
    tone,
}: {
    label: string;
    isActive: boolean;
    items: Array<{ label: string; icon?: string; onClick: () => void }>;
    tone: 'primary' | 'secondary';
}) {
    const triggerStyle = tone === 'primary'
        ? (isActive ? sortTriggerPrimaryActive : sortTriggerPrimaryIdle)
        : (isActive ? sortTriggerSecondaryActive : sortTriggerSecondaryIdle);

    return (
        <DropdownMenu
            align="right"
            trigger={
                <button type="button" style={triggerStyle}>
                    <i className="fa-solid fa-arrow-down-short-wide text-[11px]" />
                    <span>{label}</span>
                </button>
            }
            items={items}
        />
    );
}

/* ─── Sort helpers ─── */

function sortSimple(props: DynamicProperty[], key: SimpleSortKey): DynamicProperty[] {
    if (key === 'default') return props;
    const sorted = [...props].sort((a, b) => a.label.localeCompare(b.label));
    return key === 'label-asc' ? sorted : sorted.reverse();
}

function sortTemporal(records: TemporalRecord[], key: TemporalSortKey): TemporalRecord[] {
    if (key === 'default') return records;
    const sorted = [...records];
    switch (key) {
        case 'label-asc':
            sorted.sort((a, b) => a.label.localeCompare(b.label));
            break;
        case 'label-desc':
            sorted.sort((a, b) => b.label.localeCompare(a.label));
            break;
        case 'start-asc':
            sorted.sort((a, b) => compareNullableString(a.start, b.start));
            break;
        case 'start-desc':
            sorted.sort((a, b) => compareNullableString(b.start, a.start));
            break;
        case 'intensity-desc':
            sorted.sort((a, b) => (b.intensity ?? -Infinity) - (a.intensity ?? -Infinity));
            break;
        case 'intensity-asc':
            sorted.sort((a, b) => (a.intensity ?? Infinity) - (b.intensity ?? Infinity));
            break;
    }
    return sorted;
}

function compareNullableString(a: string | null, b: string | null): number {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return a.localeCompare(b);
}

/* ─── Value renderers ─── */

function SimpleValue({ prop }: { prop: DynamicProperty }) {
    const t = useT();

    // Boolean
    if (prop.type === 'boolean') {
        return prop.value ? (
            <span className="flex items-center gap-1.5 text-sm" style={successColor}>
                <i className="fa-solid fa-check text-xs" /> {t('entries.form.boolean.yes')}
            </span>
        ) : (
            <span className="flex items-center gap-1.5 text-sm" style={helperFainter}>
                <i className="fa-solid fa-xmark text-xs" /> {t('entries.form.boolean.no')}
            </span>
        );
    }

    // Single entry reference with URL
    if (prop.url && typeof prop.value === 'string') {
        return (
            <EntryLink entryId={prop.entry_id ?? 0} href={prop.url} className="inline-flex items-center gap-1.5 text-sm hover:underline" style={linkBaseStyle}>
                {prop.value}
                <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" style={externalIconStyle} />
            </EntryLink>
        );
    }

    // Array of entry references with individual links
    if (Array.isArray(prop.value) && prop.type === 'entry_reference' && prop.entry_ids) {
        return (
            <div className="flex flex-wrap gap-1.5">
                {(prop.value as string[]).map((v, j) => {
                    const entryId = prop.entry_ids![j];
                    const url = prop.entry_urls?.[j];
                    if (entryId && url) {
                        return (
                            <span key={j} style={chipStyle}>
                                <EntryLink entryId={entryId} href={url} className="hover:underline">
                                    {v}
                                </EntryLink>
                                <i className="fa-solid fa-arrow-up-right-from-square text-[7px] opacity-30" />
                            </span>
                        );
                    }
                    return <span key={j} style={chipStyle}>{v}</span>;
                })}
            </div>
        );
    }

    // Array of values (plain)
    if (Array.isArray(prop.value)) {
        return (
            <div className="flex flex-wrap gap-1.5">
                {(prop.value as string[]).map((v, j) => (
                    <span key={j} style={chipStyle}>{v}</span>
                ))}
            </div>
        );
    }

    // Single entry reference without URL — render as badge for consistency
    if (prop.type === 'entry_reference' && typeof prop.value === 'string') {
        return <span style={chipStyle}>{prop.value}</span>;
    }

    // Stardate
    if (prop.type === 'stardate' && typeof prop.value === 'string' && prop.value) {
        try {
            const full = formatStardate(BigInt(prop.value));
            return <span className="text-sm" style={monoStyle}>{full}</span>;
        } catch {
            return <span className="text-sm" style={valueDefaultStyle}>{String(prop.value)}</span>;
        }
    }

    // Default
    return <span className="text-sm" style={valueDefaultStyle}>{String(prop.value)}</span>;
}

function IntensityBar({ value }: { value: number }) {
    // 1-10 scale rendered as small dots
    const max = 10;
    return (
        <span className="flex items-center gap-px">
            {Array.from({ length: max }, (_, i) => (
                <span
                    key={i}
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={i < value ? intensityDotActiveStyle : intensityDotInactiveStyle}
                />
            ))}
        </span>
    );
}

function formatDate(date: string | null): string {
    if (!date) return '—';
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}
