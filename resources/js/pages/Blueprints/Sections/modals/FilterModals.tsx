import { useState, useEffect } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import type { AvailableColumn } from '@alexandria/types/blueprints';

export interface ColumnFilter {
    type: 'in' | 'contains' | 'exact' | 'blanks' | 'not_blanks' | 'date_preset' | 'date_after' | 'date_before' | 'date_range';
    value?: string;
    values?: string[];
    include_blanks?: boolean;
    preset?: string;
    from?: string;
    to?: string;
}

/* ── Shared Filter Modal Parts ── */

function FilterModalHeader({ label, onClose }: { label: string; onClose: () => void }) {
    return (
        <div className="flex items-center justify-between bg-base-300 px-5 py-3">
            <h3 className="text-sm font-semibold">
                <i className="fa-solid fa-filter mr-2 text-warning" />
                Filter: {label}
            </h3>
            <button type="button" onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
                <i className="fa-solid fa-xmark text-xs" />
            </button>
        </div>
    );
}

function FilterModalFooter({ filter, onClear, onClose, onApply, disabled }: {
    filter: ColumnFilter | null;
    onClear: () => void;
    onClose: () => void;
    onApply: () => void;
    disabled: boolean;
}) {
    return (
        <div className="flex items-center justify-between border-t border-base-content/10 px-5 py-3">
            {filter ? (
                <button type="button" onClick={onClear} className="btn btn-ghost btn-sm rounded-xl text-error">
                    <i className="fa-solid fa-trash mr-1 text-xs" /> Clear
                </button>
            ) : (
                <span />
            )}
            <div className="flex gap-2">
                <button type="button" onClick={onClose} className="btn btn-ghost btn-sm rounded-xl">Cancel</button>
                <button type="button" onClick={onApply} className="btn btn-primary btn-sm rounded-xl" disabled={disabled}>
                    <i className="fa-solid fa-check mr-1" /> Apply
                </button>
            </div>
        </div>
    );
}

/* ── Column Filter Modal (delegates to Value or Date) ── */

export function ColumnFilterModal({ open, column, filter, onApply, onClear, onClose, projectId, blueprintId, valuesUrl }: {
    open: boolean;
    column: AvailableColumn;
    filter: ColumnFilter | null;
    onApply: (filter: ColumnFilter) => void;
    onClear: () => void;
    onClose: () => void;
    projectId: number;
    blueprintId: number;
    valuesUrl?: string;
}) {
    const isDateField = column.field_type === 'Date' || column.field_type === 'Datetime'
        || column.key === 'created_at' || column.key === 'updated_at';
    const isDatetime = column.field_type === 'Datetime' || column.key === 'created_at' || column.key === 'updated_at';

    if (isDateField) {
        return (
            <DateFilterModal
                open={open}
                column={column}
                filter={filter}
                isDatetime={isDatetime}
                onApply={onApply}
                onClear={onClear}
                onClose={onClose}
            />
        );
    }

    return (
        <ValueFilterModal
            open={open}
            column={column}
            filter={filter}
            onApply={onApply}
            onClear={onClear}
            onClose={onClose}
            projectId={projectId}
            blueprintId={blueprintId}
            valuesUrl={valuesUrl}
        />
    );
}

/* ── Value Filter (Excel-style multi-select) ── */

function ValueFilterModal({ open, column, filter, onApply, onClear, onClose, projectId, blueprintId, valuesUrl }: {
    open: boolean;
    column: AvailableColumn;
    filter: ColumnFilter | null;
    onApply: (filter: ColumnFilter) => void;
    onClear: () => void;
    onClose: () => void;
    projectId: number;
    blueprintId: number;
    valuesUrl?: string;
}) {
    const [availableValues, setAvailableValues] = useState<string[]>([]);
    const [hasBlank, setHasBlank] = useState(false);
    const [loadingValues, setLoadingValues] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [selected, setSelected] = useState<Set<string>>(new Set(filter?.values ?? []));
    const [includeBlanks, setIncludeBlanks] = useState(filter?.include_blanks ?? false);

    useEffect(() => {
        if (!open) return;
        setLoadingValues(true);
        setSearchTerm('');

        const url = valuesUrl
            ? `${valuesUrl}?column=${encodeURIComponent(column.key)}`
            : `/api/v1/projects/${projectId}/blueprints/${blueprintId}/column-values?column=${encodeURIComponent(column.key)}`;

        fetch(url, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data) => {
                setAvailableValues(data.values ?? []);
                setHasBlank(data.has_blank ?? false);
                if (!filter) {
                    setSelected(new Set(data.values ?? []));
                    setIncludeBlanks(data.has_blank ?? false);
                }
                setLoadingValues(false);
            })
            .catch(() => setLoadingValues(false));
    }, [open, column.key]);

    const filteredValues = searchTerm
        ? availableValues.filter((v) => v.toLowerCase().includes(searchTerm.toLowerCase()))
        : availableValues;

    const allSelected = filteredValues.every((v) => selected.has(v)) && (!hasBlank || includeBlanks);

    function toggleAll() {
        if (allSelected) {
            setSelected(new Set());
            setIncludeBlanks(false);
        } else {
            setSelected(new Set(availableValues));
            setIncludeBlanks(hasBlank);
        }
    }

    function toggleValue(val: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(val) ? next.delete(val) : next.add(val);
            return next;
        });
    }

    function handleApply() {
        const selectedValues = Array.from(selected);
        if (selectedValues.length === availableValues.length && includeBlanks === hasBlank) {
            onClear();
            return;
        }
        onApply({ type: 'in', values: selectedValues, include_blanks: includeBlanks });
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <FilterModalHeader label={column.label} onClose={onClose} />

            <div className="p-4">
                {availableValues.length > 8 && (
                    <div className="relative mb-3">
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-base-content/30" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search values..."
                            className="input input-bordered input-sm w-full rounded-xl pl-8"
                        />
                    </div>
                )}

                {loadingValues ? (
                    <div className="flex items-center justify-center py-8">
                        <span className="loading loading-spinner loading-sm text-base-content/30" />
                    </div>
                ) : (
                    <div>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-base-200">
                            <input type="checkbox" className="checkbox checkbox-xs checkbox-primary" checked={allSelected} onChange={toggleAll} />
                            <span className="text-sm font-semibold">(Select All)</span>
                        </label>

                        <div className="max-h-[50vh] overflow-y-auto">
                            {filteredValues.map((val) => (
                                <label key={val} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-base-200">
                                    <input type="checkbox" className="checkbox checkbox-xs checkbox-primary" checked={selected.has(val)} onChange={() => toggleValue(val)} />
                                    <span className="text-sm">{val}</span>
                                </label>
                            ))}
                            {filteredValues.length === 0 && !hasBlank && (
                                <p className="py-4 text-center text-sm italic text-base-content/30">No values found</p>
                            )}
                        </div>

                        {hasBlank && !searchTerm && (
                            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-base-200">
                                <input type="checkbox" className="checkbox checkbox-xs checkbox-primary" checked={includeBlanks} onChange={() => setIncludeBlanks(!includeBlanks)} />
                                <span className="text-sm italic text-base-content/50">(Blanks)</span>
                            </label>
                        )}
                    </div>
                )}
            </div>

            <FilterModalFooter filter={filter} onClear={onClear} onClose={onClose} onApply={handleApply} disabled={selected.size === 0 && !includeBlanks} />
        </Modal>
    );
}

/* ── Date Filter ── */

const DATE_PRESETS = [
    { key: 'today', label: 'Today' },
    { key: 'last_7', label: 'Last 7 Days' },
    { key: 'last_30', label: 'Last 30 Days' },
    { key: 'last_year', label: 'Last Year' },
    { key: 'all_time', label: 'All Time' },
] as const;

function DateFilterModal({ open, column, filter, isDatetime, onApply, onClear, onClose }: {
    open: boolean;
    column: AvailableColumn;
    filter: ColumnFilter | null;
    isDatetime: boolean;
    onApply: (filter: ColumnFilter) => void;
    onClear: () => void;
    onClose: () => void;
}) {
    type DateMode = 'preset' | 'after' | 'before' | 'range';

    const initialMode = (): DateMode => {
        if (!filter) return 'preset';
        if (filter.type === 'date_preset') return 'preset';
        if (filter.type === 'date_after') return 'after';
        if (filter.type === 'date_before') return 'before';
        if (filter.type === 'date_range') return 'range';
        return 'preset';
    };

    const [mode, setMode] = useState<DateMode>(initialMode);
    const [preset, setPreset] = useState(filter?.preset ?? 'all_time');
    const [afterValue, setAfterValue] = useState(filter?.value ?? '');
    const [beforeValue, setBeforeValue] = useState(filter?.value ?? '');
    const [rangeFrom, setRangeFrom] = useState(filter?.from ?? '');
    const [rangeTo, setRangeTo] = useState(filter?.to ?? '');

    // For datetime fields, split into date + optional time
    const [afterTime, setAfterTime] = useState('');
    const [beforeTime, setBeforeTime] = useState('');
    const [rangeFromTime, setRangeFromTime] = useState('');
    const [rangeToTime, setRangeToTime] = useState('');

    function combineDatetime(date: string, time: string): string {
        if (!date) return '';
        return time ? `${date}T${time}` : date;
    }

    function handleApply() {
        switch (mode) {
            case 'preset':
                if (preset === 'all_time') { onClear(); return; }
                onApply({ type: 'date_preset', preset });
                return;
            case 'after':
                if (!afterValue) return;
                onApply({ type: 'date_after', value: combineDatetime(afterValue, afterTime) });
                return;
            case 'before':
                if (!beforeValue) return;
                onApply({ type: 'date_before', value: combineDatetime(beforeValue, beforeTime) });
                return;
            case 'range':
                if (!rangeFrom && !rangeTo) return;
                onApply({ type: 'date_range', from: combineDatetime(rangeFrom, rangeFromTime), to: combineDatetime(rangeTo, rangeToTime) });
                return;
        }
    }

    const canApply = mode === 'preset' || (mode === 'after' && afterValue) || (mode === 'before' && beforeValue) || (mode === 'range' && (rangeFrom || rangeTo));

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <FilterModalHeader label={column.label} onClose={onClose} />

            <div className="p-4 space-y-4">
                {/* Mode selector */}
                <div className="flex flex-wrap gap-1.5">
                    {(['preset', 'after', 'before', 'range'] as DateMode[]).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMode(m)}
                            className={`btn btn-xs rounded-lg capitalize ${mode === m ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            {m === 'preset' ? 'Quick' : m === 'range' ? 'Custom Range' : m.charAt(0).toUpperCase() + m.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Preset buttons */}
                {mode === 'preset' && (
                    <div className="space-y-1">
                        {DATE_PRESETS.map((p) => (
                            <label key={p.key} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-base-200">
                                <input
                                    type="radio"
                                    name="date_preset"
                                    className="radio radio-xs radio-primary"
                                    checked={preset === p.key}
                                    onChange={() => setPreset(p.key)}
                                />
                                <span className="text-sm">{p.label}</span>
                            </label>
                        ))}
                    </div>
                )}

                {/* After */}
                {mode === 'after' && (
                    <div className="form-control">
                        <label className="label py-1"><span className="label-text text-sm">Show entries after</span></label>
                        <input type="date" value={afterValue} onChange={(e) => setAfterValue(e.target.value)} className="input input-bordered input-sm w-full rounded-xl" />
                        {isDatetime && (
                            <div className="mt-1.5 flex items-center gap-2">
                                <span className="text-xs text-base-content/40">Time</span>
                                <input type="time" value={afterTime} onChange={(e) => setAfterTime(e.target.value)} className="input input-bordered input-xs rounded-lg" />
                                <span className="text-xs italic text-base-content/30">(optional)</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Before */}
                {mode === 'before' && (
                    <div className="form-control">
                        <label className="label py-1"><span className="label-text text-sm">Show entries before</span></label>
                        <input type="date" value={beforeValue} onChange={(e) => setBeforeValue(e.target.value)} className="input input-bordered input-sm w-full rounded-xl" />
                        {isDatetime && (
                            <div className="mt-1.5 flex items-center gap-2">
                                <span className="text-xs text-base-content/40">Time</span>
                                <input type="time" value={beforeTime} onChange={(e) => setBeforeTime(e.target.value)} className="input input-bordered input-xs rounded-lg" />
                                <span className="text-xs italic text-base-content/30">(optional)</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Custom Range */}
                {mode === 'range' && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="form-control">
                            <label className="label py-1"><span className="label-text text-sm">From</span></label>
                            <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="input input-bordered input-sm w-full rounded-xl" />
                            {isDatetime && (
                                <input type="time" value={rangeFromTime} onChange={(e) => setRangeFromTime(e.target.value)} className="input input-bordered input-xs mt-1.5 w-full rounded-lg" />
                            )}
                        </div>
                        <div className="form-control">
                            <label className="label py-1"><span className="label-text text-sm">To</span></label>
                            <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="input input-bordered input-sm w-full rounded-xl" />
                            {isDatetime && (
                                <input type="time" value={rangeToTime} onChange={(e) => setRangeToTime(e.target.value)} className="input input-bordered input-xs mt-1.5 w-full rounded-lg" />
                            )}
                        </div>
                    </div>
                )}
            </div>

            <FilterModalFooter filter={filter} onClear={onClear} onClose={onClose} onApply={handleApply} disabled={!canApply} />
        </Modal>
    );
}
