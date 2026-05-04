import { useMemo, useState } from 'react';
import EntryLink from '@alexandria/components/entries/EntryLink';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import { formatStardate } from '@alexandria/lib/stardate';
import type { DynamicProperty } from '../Show';

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

const SIMPLE_SORT_LABELS: Record<SimpleSortKey, string> = {
    'default': 'Default',
    'label-asc': 'Name A → Z',
    'label-desc': 'Name Z → A',
};

const TEMPORAL_SORT_LABELS: Record<TemporalSortKey, string> = {
    'default': 'Default',
    'label-asc': 'Name A → Z',
    'label-desc': 'Name Z → A',
    'start-asc': 'Earliest first',
    'start-desc': 'Latest first',
    'intensity-desc': 'Most intense',
    'intensity-asc': 'Least intense',
};

export default function AttributesTab({ properties }: AttributesTabProps) {
    if (properties.length === 0) {
        return (
            <div className="paper-board rounded-2xl border border-base-content/10">
                <div className="flex flex-col items-center bg-base-200 py-16 text-center" style={{ borderRadius: 'inherit' }}>
                    <i className="fa-solid fa-list mb-3 text-3xl text-base-content/20" />
                    <p className="text-sm font-medium text-base-content/40">No attributes set</p>
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
    const [sort, setSort] = useState<SimpleSortKey>('default');

    const sorted = useMemo(() => sortSimple(properties, sort), [properties, sort]);

    const sortItems = (Object.keys(SIMPLE_SORT_LABELS) as SimpleSortKey[]).map((k) => ({
        label: SIMPLE_SORT_LABELS[k],
        icon: sort === k ? 'fa-solid fa-check' : undefined,
        onClick: () => setSort(k),
    }));

    return (
        <div className="paper-board rounded-2xl border border-base-content/10">
            <div className="overflow-hidden bg-base-200" style={{ borderRadius: 'inherit' }}>
                <div
                    className="flex items-center gap-2 border-b border-base-300 px-5 py-3 text-primary-content"
                    style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 80%, transparent), color-mix(in srgb, var(--color-primary) 60%, transparent))' }}
                >
                    <i className="fa-solid fa-list text-xs text-primary-content/60" />
                    <h3 className="text-sm font-semibold">Attributes</h3>
                    <span className="ml-auto rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {properties.length} {properties.length === 1 ? 'field' : 'fields'}
                    </span>
                    <SortTrigger
                        label={SIMPLE_SORT_LABELS[sort]}
                        isActive={sort !== 'default'}
                        items={sortItems}
                        tone="primary"
                    />
                </div>
                <div className="divide-y divide-dashed divide-base-300">
                    {sorted.map((prop, i) => (
                        <div key={i} className="bg-row-tint px-5 py-3.5 transition-colors hover:bg-base-200/50">
                            <div className="text-sm font-semibold text-base-content/60">{prop.label}</div>
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
    const [sort, setSort] = useState<TemporalSortKey>('default');
    const records = prop.value as TemporalRecord[];

    const sorted = useMemo(() => sortTemporal(records, sort), [sort]);

    const sortItems = (Object.keys(TEMPORAL_SORT_LABELS) as TemporalSortKey[]).map((k) => ({
        label: TEMPORAL_SORT_LABELS[k],
        icon: sort === k ? 'fa-solid fa-check' : undefined,
        onClick: () => setSort(k),
    }));

    return (
        <div className="paper-board rounded-2xl border border-base-content/10">
            <div className="overflow-hidden bg-base-200" style={{ borderRadius: 'inherit' }}>
                <div
                    className="flex items-center gap-2 border-b border-base-300 px-5 py-3"
                    style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-secondary) 80%, transparent), color-mix(in srgb, var(--color-secondary) 60%, transparent))' }}
                >
                    <i className="fa-solid fa-timeline text-xs text-secondary-content/60" />
                    <h3 className="text-sm font-semibold text-secondary-content">{prop.label}</h3>
                    <span className="ml-auto rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {records.length} {records.length === 1 ? 'record' : 'records'}
                    </span>
                    <SortTrigger
                        label={TEMPORAL_SORT_LABELS[sort]}
                        isActive={sort !== 'default'}
                        items={sortItems}
                        tone="secondary"
                    />
                </div>
                <div className="divide-y divide-dashed divide-base-300">
                    {sorted.map((record, j) => (
                        <div key={j} className="flex gap-4 bg-row-tint px-5 py-3.5 transition-colors hover:bg-base-200/50">
                            {/* Timeline indicator */}
                            <div className="flex flex-col items-center pt-1">
                                <div className={`h-2.5 w-2.5 rounded-full ${record.end ? 'bg-base-content/20' : 'bg-success'}`} />
                                <div className="mt-1 w-px flex-1 bg-base-content/5" />
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-base-content">{record.label}</div>
                                {record.notes && (
                                    <p className="mt-0.5 text-xs leading-relaxed text-base-content/50">{record.notes}</p>
                                )}
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-base-content/40">
                                    <span>
                                        {formatDate(record.start)}
                                        {' — '}
                                        {record.end ? formatDate(record.end) : <span className="text-success">Present</span>}
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
    // tone colors the trigger text/bg against the colored card header
    const toneClass =
        tone === 'primary'
            ? isActive
                ? 'bg-primary-content/15 text-primary-content ring-1 ring-primary-content/20'
                : 'text-primary-content/70 hover:bg-primary-content/10 hover:text-primary-content'
            : isActive
                ? 'bg-secondary-content/15 text-secondary-content ring-1 ring-secondary-content/20'
                : 'text-secondary-content/70 hover:bg-secondary-content/10 hover:text-secondary-content';

    return (
        <DropdownMenu
            align="right"
            trigger={
                <button
                    type="button"
                    className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${toneClass}`}
                    title="Sort"
                >
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

/* ─── Value renderers (unchanged) ─── */

function SimpleValue({ prop }: { prop: DynamicProperty }) {
    // Boolean
    if (prop.type === 'boolean') {
        return prop.value ? (
            <span className="flex items-center gap-1.5 text-sm text-success">
                <i className="fa-solid fa-check text-xs" /> Yes
            </span>
        ) : (
            <span className="flex items-center gap-1.5 text-sm text-base-content/30">
                <i className="fa-solid fa-xmark text-xs" /> No
            </span>
        );
    }

    // Single entry reference with URL
    if (prop.url && typeof prop.value === 'string') {
        return (
            <EntryLink entryId={prop.entry_id ?? 0} href={prop.url} className="inline-flex items-center gap-1.5 text-sm text-base-content hover:underline">
                {prop.value}
                <i className="fa-solid fa-arrow-up-right-from-square text-[9px] text-base-content/20" />
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
                            <span key={j} className="badge badge-sm border border-base-content/10 bg-base-100 text-base-content/80 inline-flex items-center gap-1">
                                <EntryLink entryId={entryId} href={url} className="hover:underline">
                                    {v}
                                </EntryLink>
                                <i className="fa-solid fa-arrow-up-right-from-square text-[7px] opacity-30" />
                            </span>
                        );
                    }
                    return <span key={j} className="badge badge-sm border border-base-content/10 bg-base-100 text-base-content/80">{v}</span>;
                })}
            </div>
        );
    }

    // Array of values (plain)
    if (Array.isArray(prop.value)) {
        return (
            <div className="flex flex-wrap gap-1.5">
                {(prop.value as string[]).map((v, j) => (
                    <span key={j} className="badge badge-sm border border-base-content/10 bg-base-100 text-base-content/80">{v}</span>
                ))}
            </div>
        );
    }

    // Single entry reference without URL — render as badge for consistency
    if (prop.type === 'entry_reference' && typeof prop.value === 'string') {
        return <span className="badge badge-sm border border-base-content/10 bg-base-100 text-base-content/80">{prop.value}</span>;
    }

    // Stardate
    if (prop.type === 'stardate' && typeof prop.value === 'string' && prop.value) {
        try {
            const full = formatStardate(BigInt(prop.value));
            return <span className="font-mono text-sm text-base-content/80">{full}</span>;
        } catch {
            return <span className="text-sm text-base-content/80">{String(prop.value)}</span>;
        }
    }

    // Default
    return <span className="text-sm text-base-content/80">{String(prop.value)}</span>;
}

function IntensityBar({ value }: { value: number }) {
    // 1-10 scale rendered as small dots
    const max = 10;
    return (
        <span className="flex items-center gap-px" title={`Intensity: ${value}/${max}`}>
            {Array.from({ length: max }, (_, i) => (
                <span
                    key={i}
                    className={`inline-block h-1.5 w-1.5 rounded-full ${i < value ? 'bg-secondary' : 'bg-base-content/10'}`}
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
