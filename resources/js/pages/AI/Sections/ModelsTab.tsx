import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import Pagination from '@alexandria/components/ui/Pagination';
import { createColumnPersistence } from '@alexandria/lib/persistedColumns';
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

const COLUMN_LABELS: Record<ColumnKey, string> = {
    name: 'Name',
    model_id: 'Model ID',
    category: 'Category',
    input_price: 'Input / M',
    output_price: 'Output / M',
    context: 'Context',
    features: 'Features',
    notes: 'Notes',
};

const CATEGORIES = ['General', 'Fast', 'Creative', 'Analyst', 'Image', 'Video', 'Audio', 'Embedding', 'Agent'];

const { load: loadColumns, save: saveColumns } = createColumnPersistence<ColumnKey>(
    'ai-models-columns',
    ALL_COLUMNS,
    DEFAULT_COLUMNS,
);

function formatPrice(val: number | null): ReactNode {
    if (val === null) {
        return <span className="text-base-content/30">—</span>;
    }
    const n = Number(val);
    if (n === 0) {
        return <span className="text-success font-medium">Free</span>;
    }
    return <span className="tabular-nums">${n.toFixed(2)}</span>;
}

function formatContext(val: number | null): ReactNode {
    if (val === null) {
        return <span className="text-base-content/30">—</span>;
    }
    if (val >= 1_000_000) {
        return `${Math.round(val / 1_000_000)}M`;
    }
    if (val >= 1_000) {
        return `${Math.round(val / 1_000)}K`;
    }
    return String(val);
}

function FeatureIcons({ model }: { model: AiModelEntry }) {
    return (
        <div className="flex items-center gap-2">
            {model.supports_json_mode && (
                <span title="JSON Mode">
                    <i className="fa-solid fa-code text-xs text-info" />
                </span>
            )}
            {model.supports_vision && (
                <span title="Vision">
                    <i className="fa-solid fa-eye text-xs text-purple-500" />
                </span>
            )}
            {(model as AiModelEntry & { supports_thinking?: boolean }).supports_thinking && (
                <span title="Thinking">
                    <i className="fa-solid fa-brain text-xs text-secondary" />
                </span>
            )}
            {(model as AiModelEntry & { supports_tool_use?: boolean }).supports_tool_use && (
                <span title="Tool Use">
                    <i className="fa-solid fa-wrench text-xs text-warning" />
                </span>
            )}
        </div>
    );
}

export default function ModelsTab({ projectId, providers }: ModelsTabProps) {
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

    const showFilterOptions: { value: ShowFilter; label: string }[] = [
        { value: 'all', label: 'All Models' },
        { value: 'active', label: 'Active Only' },
        { value: 'flagship', label: 'Flagship' },
        { value: 'recommended', label: 'Recommended' },
    ];

    return (
        <div className="flex flex-col gap-4">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <input
                    type="text"
                    placeholder="Search models…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input input-bordered input-sm w-56 rounded-xl"
                />

                {/* Provider pills */}
                <button
                    type="button"
                    onClick={() => { setSelectedProvider(null); setPage(1); }}
                    className={`btn btn-xs rounded-lg ${selectedProvider === null ? 'btn-primary' : 'btn-ghost'}`}
                >
                    All
                    <span className="badge badge-xs ml-1">
                        {Object.values(countsByProvider).reduce((a, b) => a + b, 0)}
                    </span>
                </button>
                {providers.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedProvider(p.id); setPage(1); }}
                        className={`btn btn-xs rounded-lg ${selectedProvider === p.id ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        {p.name}
                        {countsByProvider[p.id] !== undefined && (
                            <span className="badge badge-xs ml-1">{countsByProvider[p.id]}</span>
                        )}
                    </button>
                ))}

                {/* Show filter */}
                <select
                    value={showFilter}
                    onChange={(e) => { setShowFilter(e.target.value as ShowFilter); setPage(1); }}
                    className="select select-bordered select-sm rounded-xl"
                >
                    {showFilterOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                {/* Compact + gear — right-aligned */}
                <div className="ml-auto flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-base-content/70">
                        <input
                            type="checkbox"
                            checked={compact}
                            onChange={(e) => setCompact(e.target.checked)}
                            className="toggle toggle-xs toggle-primary"
                        />
                        Compact
                    </label>

                    {/* Gear / column config */}
                    <div ref={gearRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setGearOpen((v) => !v)}
                            className="btn btn-ghost btn-xs btn-square rounded-lg"
                            title="Configure columns"
                        >
                            <i className="fa-solid fa-gear text-xs" />
                        </button>
                        {gearOpen && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-base-300 bg-base-100 p-2 shadow-lg">
                                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-base-content/50">
                                    Columns
                                </p>
                                {ALL_COLUMNS.map((col) => (
                                    <label
                                        key={col}
                                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-base-200"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={columns.includes(col)}
                                            onChange={() => toggleColumn(col)}
                                            className="checkbox checkbox-xs"
                                        />
                                        {COLUMN_LABELS[col]}
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
                    const catKey = cat.toLowerCase();
                    const active = selectedCategories.includes(catKey);
                    const count = countsByCategory[catKey];
                    return (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(catKey)}
                            className={`btn btn-xs gap-1 rounded-lg ${active ? 'btn-secondary' : 'btn-ghost'}`}
                        >
                            {cat}
                            {count !== undefined && (
                                <span className="badge badge-xs">{count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-base-content/10 bg-base-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-base-content/10 bg-base-300/40">
                                {columns.map((col) => (
                                    <th
                                        key={col}
                                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-base-content/50"
                                    >
                                        {COLUMN_LABELS[col]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-200">
                            {loading && (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="px-4 py-12 text-center"
                                    >
                                        <span className="loading loading-spinner loading-sm text-primary" />
                                    </td>
                                </tr>
                            )}
                            {!loading && (!models?.data || models.data.length === 0) && (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="px-4 py-12 text-center text-sm text-base-content/40"
                                    >
                                        <i className="fa-solid fa-microchip mb-2 block text-2xl text-base-content/15" />
                                        No models match the current filters
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                models?.data.map((model) => (
                                    <tr key={model.id} className="transition-colors hover:bg-base-200/30">
                                        {columns.map((col) => (
                                            <td key={col} className={cellPadding}>
                                                {col === 'name' && (
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="font-medium text-sm">{model.display_name}</span>
                                                            {model.is_flagship && (
                                                                <span className="badge badge-primary badge-xs">Flagship</span>
                                                            )}
                                                            {model.is_recommended && (
                                                                <span className="badge badge-success badge-xs">Rec</span>
                                                            )}
                                                            {!model.is_active && (
                                                                <span className="badge badge-ghost badge-xs">Inactive</span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-base-content/50">{model.provider.name}</span>
                                                    </div>
                                                )}
                                                {col === 'model_id' && (
                                                    <code className="text-xs">{model.model_id}</code>
                                                )}
                                                {col === 'category' && (
                                                    <span className="badge badge-sm border-0 bg-base-content/10 capitalize text-base-content/70">{model.category}</span>
                                                )}
                                                {col === 'input_price' && formatPrice(model.input_price_per_million)}
                                                {col === 'output_price' && formatPrice(model.output_price_per_million)}
                                                {col === 'context' && (
                                                    <span className="tabular-nums text-sm">{formatContext(model.context_window)}</span>
                                                )}
                                                {col === 'features' && <FeatureIcons model={model} />}
                                                {col === 'notes' && (
                                                    <span className="block max-w-[200px] truncate text-xs text-base-content/70" title={model.notes ?? undefined}>
                                                        {model.notes ?? <span className="text-base-content/30">—</span>}
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                {models && models.last_page > 1 && (
                    <div className="border-t border-base-300/50 p-3">
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
