import type { ReactNode, CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import Pagination from '@alexandria/components/ui/Pagination';
import { createColumnPersistence } from '@alexandria/lib/persistedColumns';
import useT, { type Translator } from '@alexandria/hooks/useT';
import type { AiModelEntry, AiProvider, PaginatedResponse } from '@alexandria/types/ai-dashboard';

interface ModelsTabProps {
    projectId: number;
    providers: AiProvider[];
}

interface ModelsDashboardResponse {
    models: PaginatedResponse<AiModelEntry>;
    counts_by_provider: Record<number, number>;
    counts_by_category: Record<string, number>;
}

type ShowFilter = 'all' | 'active' | 'flagship' | 'recommended';

const ALL_COLUMNS = ['name', 'model_id', 'category', 'input_price', 'output_price', 'context', 'features', 'notes'] as const;
type ColumnKey = (typeof ALL_COLUMNS)[number];

const DEFAULT_COLUMNS: ColumnKey[] = ['name', 'category', 'input_price', 'output_price', 'context', 'features'];

const COLUMN_LABEL_KEYS: Record<ColumnKey, string> = {
    name: 'ai.models_tab.column.name',
    model_id: 'ai.models_tab.column.model_id',
    category: 'ai.models_tab.column.category',
    input_price: 'ai.models_tab.column.input_price',
    output_price: 'ai.models_tab.column.output_price',
    context: 'ai.models_tab.column.context',
    features: 'ai.models_tab.column.features',
    notes: 'ai.models_tab.column.notes',
};

const CATEGORIES: { key: string; labelKey: string }[] = [
    { key: 'general', labelKey: 'ai.models_tab.category.general' },
    { key: 'fast', labelKey: 'ai.models_tab.category.fast' },
    { key: 'creative', labelKey: 'ai.models_tab.category.creative' },
    { key: 'analyst', labelKey: 'ai.models_tab.category.analyst' },
    { key: 'image', labelKey: 'ai.models_tab.category.image' },
    { key: 'video', labelKey: 'ai.models_tab.category.video' },
    { key: 'audio', labelKey: 'ai.models_tab.category.audio' },
    { key: 'embedding', labelKey: 'ai.models_tab.category.embedding' },
    { key: 'agent', labelKey: 'ai.models_tab.category.agent' },
];

const { load: loadColumns, save: saveColumns } = createColumnPersistence<ColumnKey>(
    'ai-models-columns',
    ALL_COLUMNS,
    DEFAULT_COLUMNS,
);

/* ── Theme styles ── */

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)' };
const microText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)' };
const labelText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };
const bodyText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)' };

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
};

const selectStyle: CSSProperties = {
    ...inputStyle,
    paddingRight: '2rem',
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

const categoryActiveStyle: CSSProperties = {
    background: 'var(--theme-brand-secondary-500)',
    color: 'var(--theme-brand-secondary-content)',
    borderRadius: 'var(--theme-radius-button)',
};

const countBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.6875rem',
    marginLeft: '0.25rem',
};

const gearBtnStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
    width: '1.75rem',
    height: '1.75rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const gearDropdownStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    background: 'var(--theme-base-100)',
    borderRadius: 'var(--theme-radius-card)',
    boxShadow: '0 10px 20px -5px color-mix(in srgb, var(--theme-base-content) 25%, transparent)',
};

const gearItemStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-input)',
    transition: 'background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
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

const categoryBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    border: 'none',
    textTransform: 'capitalize',
};

function statusBadgeStyle(variant: 'flagship' | 'recommended' | 'inactive'): CSSProperties {
    const map = {
        flagship: { fill: 'var(--theme-brand-primary-500)', content: 'var(--theme-brand-primary-content)' },
        recommended: { fill: 'var(--theme-status-success-fill)', content: 'var(--theme-status-success-content)' },
        inactive: { fill: 'color-mix(in srgb, var(--theme-base-content) 12%, transparent)', content: 'var(--theme-base-content)' },
    };
    const tokens = map[variant];
    return {
        background: tokens.fill,
        color: tokens.content,
        borderRadius: 'var(--theme-radius-badge)',
    };
}

function formatPrice(val: number | null, t: Translator): ReactNode {
    if (val === null) {
        return <span style={microText}>{t('ai.models_tab.dash')}</span>;
    }
    const n = Number(val);
    if (n === 0) {
        return <span className="font-medium" style={{ color: 'var(--theme-status-success-stroke)' }}>{t('ai.models_tab.price.free')}</span>;
    }
    return <span className="tabular-nums">${n.toFixed(2)}</span>;
}

function formatContext(val: number | null, t: Translator): ReactNode {
    if (val === null) {
        return <span style={microText}>{t('ai.models_tab.dash')}</span>;
    }
    if (val >= 1_000_000) {
        return `${Math.round(val / 1_000_000)}M`;
    }
    if (val >= 1_000) {
        return `${Math.round(val / 1_000)}K`;
    }
    return String(val);
}

function FeatureIcons({ model, t }: { model: AiModelEntry; t: Translator }) {
    return (
        <div className="flex items-center gap-2">
            {model.supports_json_mode && (
                <span title={t('ai.models_tab.feature.json')}>
                    <i className="fa-solid fa-code text-xs" style={{ color: 'var(--theme-status-info-stroke)' }} aria-hidden="true" />
                </span>
            )}
            {model.supports_vision && (
                <span title={t('ai.models_tab.feature.vision')}>
                    <i className="fa-solid fa-eye text-xs" style={{ color: 'var(--theme-brand-secondary-700)' }} aria-hidden="true" />
                </span>
            )}
            {(model as AiModelEntry & { supports_thinking?: boolean }).supports_thinking && (
                <span title={t('ai.models_tab.feature.thinking')}>
                    <i className="fa-solid fa-brain text-xs" style={{ color: 'var(--theme-brand-secondary-500)' }} aria-hidden="true" />
                </span>
            )}
            {(model as AiModelEntry & { supports_tool_use?: boolean }).supports_tool_use && (
                <span title={t('ai.models_tab.feature.tool_use')}>
                    <i className="fa-solid fa-wrench text-xs" style={{ color: 'var(--theme-status-warning-stroke)' }} aria-hidden="true" />
                </span>
            )}
        </div>
    );
}

export default function ModelsTab({ projectId, providers }: ModelsTabProps) {
    const t = useT();
    const [data, setData] = useState<ModelsDashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showFilter, setShowFilter] = useState<ShowFilter>('all');
    const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [compact, setCompact] = useState(false);
    const [columns, setColumns] = useState<ColumnKey[]>(loadColumns);
    const [gearOpen, setGearOpen] = useState(false);
    const gearRef = useRef<HTMLDivElement>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Close gear dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (gearRef.current && !gearRef.current.contains(e.target as Node)) {
                setGearOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Fetch models
    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), per_page: '25' });
        if (debouncedSearch) {
            params.set('search', debouncedSearch);
        }
        if (showFilter !== 'all') {
            params.set('show_only', showFilter);
        }
        if (selectedProvider !== null) {
            params.set('provider_id', String(selectedProvider));
        }
        if (selectedCategories.length > 0) {
            params.set('category', selectedCategories.join(','));
        }

        fetch(`/api/v1/projects/${projectId}/ai/dashboard-models?${params.toString()}`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((res) => res.json())
            .then((json: ModelsDashboardResponse) => setData(json))
            .finally(() => setLoading(false));
    }, [page, debouncedSearch, showFilter, selectedProvider, selectedCategories]);

    const countsByProvider = data?.counts_by_provider ?? {};
    const countsByCategory = data?.counts_by_category ?? {};
    const models = data?.models;

    const cellPadding = compact ? 'px-4 py-2' : 'px-4 py-3';

    function toggleColumn(col: ColumnKey) {
        const updated = columns.includes(col) ? columns.filter((c) => c !== col) : [...columns, col];
        setColumns(updated);
        saveColumns(updated);
    }

    function toggleCategory(cat: string) {
        setSelectedCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
        );
        setPage(1);
    }

    const showFilterOptions: { value: ShowFilter; labelKey: string }[] = [
        { value: 'all', labelKey: 'ai.models_tab.show.all' },
        { value: 'active', labelKey: 'ai.models_tab.show.active' },
        { value: 'flagship', labelKey: 'ai.models_tab.show.flagship' },
        { value: 'recommended', labelKey: 'ai.models_tab.show.recommended' },
    ];

    return (
        <div className="flex flex-col gap-4">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <input
                    type="text"
                    placeholder={t('ai.models_tab.search_placeholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-56"
                    style={inputStyle}
                />

                {/* Provider pills */}
                <button
                    type="button"
                    onClick={() => { setSelectedProvider(null); setPage(1); }}
                    className="alex-btn inline-flex items-center px-3 py-1 text-xs font-medium"
                    style={selectedProvider === null ? tabActiveStyle : tabIdleStyle}
                    aria-pressed={selectedProvider === null}
                >
                    {t('ai.models_tab.provider.all')}
                    <span style={countBadgeStyle}>
                        {Object.values(countsByProvider).reduce((a, b) => a + b, 0)}
                    </span>
                </button>
                {providers.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedProvider(p.id); setPage(1); }}
                        className="alex-btn inline-flex items-center px-3 py-1 text-xs font-medium"
                        style={selectedProvider === p.id ? tabActiveStyle : tabIdleStyle}
                        aria-pressed={selectedProvider === p.id}
                    >
                        {p.name}
                        {countsByProvider[p.id] !== undefined && (
                            <span style={countBadgeStyle}>{countsByProvider[p.id]}</span>
                        )}
                    </button>
                ))}

                {/* Show filter */}
                <select
                    value={showFilter}
                    onChange={(e) => { setShowFilter(e.target.value as ShowFilter); setPage(1); }}
                    style={selectStyle}
                >
                    {showFilterOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {t(opt.labelKey)}
                        </option>
                    ))}
                </select>

                {/* Compact + gear — right-aligned */}
                <div className="ml-auto flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs" style={bodyText}>
                        <input
                            type="checkbox"
                            checked={compact}
                            onChange={(e) => setCompact(e.target.checked)}
                            className="alex-toggle"
                        />
                        {t('ai.models_tab.compact_label')}
                    </label>

                    {/* Gear / column config */}
                    <div ref={gearRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setGearOpen((v) => !v)}
                            className="alex-btn"
                            style={gearBtnStyle}
                            title={t('ai.models_tab.gear_tooltip')}
                            aria-label={t('ai.models_tab.gear_tooltip')}
                        >
                            <i className="fa-solid fa-gear text-xs" aria-hidden="true" />
                        </button>
                        {gearOpen && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-44 p-2" style={gearDropdownStyle}>
                                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider" style={labelText}>
                                    {t('ai.models_tab.columns_heading')}
                                </p>
                                {ALL_COLUMNS.map((col) => (
                                    <label
                                        key={col}
                                        className="alex-notes-tag-row flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm"
                                        style={gearItemStyle}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={columns.includes(col)}
                                            onChange={() => toggleColumn(col)}
                                            className="alex-checkbox"
                                        />
                                        {t(COLUMN_LABEL_KEYS[col])}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => {
                    const active = selectedCategories.includes(cat.key);
                    const count = countsByCategory[cat.key];
                    return (
                        <button
                            key={cat.key}
                            type="button"
                            onClick={() => toggleCategory(cat.key)}
                            className="alex-btn inline-flex items-center gap-1 px-3 py-1 text-xs font-medium"
                            style={active ? categoryActiveStyle : tabIdleStyle}
                            aria-pressed={active}
                        >
                            {t(cat.labelKey)}
                            {count !== undefined && (
                                <span style={countBadgeStyle}>{count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div style={tableWrapStyle}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={tableHeadStyle}>
                                {columns.map((col) => (
                                    <th
                                        key={col}
                                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                        style={labelText}
                                    >
                                        {t(COLUMN_LABEL_KEYS[col])}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-12 text-center">
                                        <i
                                            className="fa-solid fa-circle-notch fa-spin text-base"
                                            style={{ color: 'var(--theme-brand-primary-500)' }}
                                            aria-hidden="true"
                                        />
                                    </td>
                                </tr>
                            )}
                            {!loading && (!models?.data || models.data.length === 0) && (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-12 text-center text-sm" style={fadedText}>
                                        <i
                                            className="fa-solid fa-microchip mb-2 block text-2xl"
                                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 15%, transparent)' }}
                                            aria-hidden="true"
                                        />
                                        {t('ai.models_tab.empty')}
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                models?.data.map((model, i, arr) => {
                                    const isLast = i === arr.length - 1;
                                    return (
                                        <tr key={model.id} style={isLast ? undefined : rowDivider}>
                                            {columns.map((col) => (
                                                <td key={col} className={cellPadding}>
                                                    {col === 'name' && (
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span className="font-medium text-sm">{model.display_name}</span>
                                                                {model.is_flagship && (
                                                                    <span className="px-1.5 py-0.5 text-[10px] font-semibold" style={statusBadgeStyle('flagship')}>
                                                                        {t('ai.models_tab.badge.flagship')}
                                                                    </span>
                                                                )}
                                                                {model.is_recommended && (
                                                                    <span className="px-1.5 py-0.5 text-[10px] font-semibold" style={statusBadgeStyle('recommended')}>
                                                                        {t('ai.models_tab.badge.recommended')}
                                                                    </span>
                                                                )}
                                                                {!model.is_active && (
                                                                    <span className="px-1.5 py-0.5 text-[10px] font-semibold" style={statusBadgeStyle('inactive')}>
                                                                        {t('ai.models_tab.badge.inactive')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs" style={labelText}>{model.provider.name}</span>
                                                        </div>
                                                    )}
                                                    {col === 'model_id' && (
                                                        <code className="text-xs">{model.model_id}</code>
                                                    )}
                                                    {col === 'category' && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 text-[11px]" style={categoryBadgeStyle}>
                                                            {model.category}
                                                        </span>
                                                    )}
                                                    {col === 'input_price' && formatPrice(model.input_price_per_million, t)}
                                                    {col === 'output_price' && formatPrice(model.output_price_per_million, t)}
                                                    {col === 'context' && (
                                                        <span className="tabular-nums text-sm">{formatContext(model.context_window, t)}</span>
                                                    )}
                                                    {col === 'features' && <FeatureIcons model={model} t={t} />}
                                                    {col === 'notes' && (
                                                        <span className="block max-w-[200px] truncate text-xs" style={bodyText} title={model.notes ?? undefined}>
                                                            {model.notes ?? <span style={microText}>{t('ai.models_tab.dash')}</span>}
                                                        </span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>

                {models && models.last_page > 1 && (
                    <div className="p-3" style={paginationBorderTop}>
                        <Pagination
                            currentPage={models.current_page}
                            lastPage={models.last_page}
                            from={models.from}
                            to={models.to}
                            total={models.total}
                            onPageChange={(p) => { setPage(p); }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
