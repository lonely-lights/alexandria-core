import { useEffect, useState } from 'react';
import Modal from '@alexandria/components/ui/Modal';
import { compileTemplate } from '../../InfoboxTab';
import type { BlueprintField } from '@alexandria/types/blueprints';

function titleCase(str: string): string {
    return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Inline relationship-subtitle builder. Opened from the relationship
 * display panel; lets the user assemble a template from field values
 * with optional linkability, format, separator, and wrap characters.
 * Template is compiled via InfoboxTab's `compileTemplate` on apply.
 */
export default function SubtitleBuilderModal({ open, onClose, data, onChange, blueprintFields }: {
    open: boolean;
    onClose: () => void;
    data: Record<string, unknown>;
    onChange: (d: Record<string, unknown>) => void;
    blueprintFields: BlueprintField[];
}) {
    type Part = { property: string; format: string };
    type Segment = { field: string; parts: Part[]; linkable?: boolean };

    const [segments, setSegments] = useState<Segment[]>(
        (data.subtitle_segments as Segment[] | undefined) ?? []
    );
    const [separator, setSeparator] = useState((data.subtitle_separator as string) ?? '; ');
    const [wrapPrefix, setWrapPrefix] = useState((data.subtitle_wrap_prefix as string) ?? '');
    const [wrapSuffix, setWrapSuffix] = useState((data.subtitle_wrap_suffix as string) ?? '');

    useEffect(() => {
        if (open) {
            setSegments((data.subtitle_segments as Segment[] | undefined) ?? []);
            setSeparator((data.subtitle_separator as string) ?? '; ');
            setWrapPrefix((data.subtitle_wrap_prefix as string) ?? '');
            setWrapSuffix((data.subtitle_wrap_suffix as string) ?? '');
        }
    }, [open]);

    function addSegment() {
        setSegments((prev) => [...prev, { field: '', parts: [{ property: '', format: '' }], linkable: false }]);
    }

    function apply() {
        const template = compileTemplate(segments, separator, wrapPrefix, wrapSuffix);

        onChange({
            ...data,
            subtitle_segments: segments,
            subtitle_separator: separator,
            subtitle_wrap_prefix: wrapPrefix,
            subtitle_wrap_suffix: wrapSuffix,
            subtitle_template: template,
        });
        onClose();
    }

    if (!open) return null;

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
            <div className="flex flex-col">
                <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold">Subtitle Builder</h2>
                        <p className="mt-0.5 text-xs text-base-content/40">
                            Configure the display template for relationship entries
                        </p>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-square rounded-xl">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="border-b border-base-300 bg-base-200/30 px-6 py-3">
                    <p className="text-xs leading-relaxed text-base-content/50">
                        Each field shows a value from the relationship metadata. Properties traverse into referenced entries.
                        The separator only appears between fields that both have values.
                    </p>
                </div>

                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-base-content/60">Display Fields</label>
                        <button type="button" onClick={addSegment} className="btn btn-ghost btn-xs gap-1 rounded-lg text-primary">
                            <i className="fa-solid fa-plus text-[10px]" /> Add Field
                        </button>
                    </div>

                    {segments.length === 0 ? (
                        <div className="mt-3 rounded-xl border border-dashed border-base-content/10 py-6 text-center">
                            <p className="text-xs text-base-content/30">No fields added yet</p>
                        </div>
                    ) : (
                        <div className="mt-3 space-y-3">
                            {segments.map((seg, i) => (
                                <div key={i} className="rounded-xl border border-base-300 bg-base-100">
                                    <div className="flex items-center gap-2 border-b border-base-200 px-3 py-2">
                                        <select
                                            value={seg.field}
                                            onChange={(e) => setSegments((prev) => prev.map((s, j) => j === i ? { ...s, field: e.target.value } : s))}
                                            className="select select-bordered h-7 min-h-0 flex-1 rounded-lg text-xs"
                                        >
                                            <option value="">Select field...</option>
                                            {blueprintFields.map((f) => (
                                                <option key={f.name} value={f.name}>{f.label} ({titleCase(f.type)})</option>
                                            ))}
                                        </select>
                                        <label className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-base-content/5" title="Make linkable">
                                            <input
                                                type="checkbox"
                                                checked={!!seg.linkable}
                                                onChange={(e) => setSegments((prev) => prev.map((s, j) => j === i ? { ...s, linkable: e.target.checked } : s))}
                                                className="checkbox checkbox-xs checkbox-primary"
                                            />
                                            <i className={`fa-solid fa-link text-[10px] ${seg.linkable ? 'text-primary' : 'text-base-content/20'}`} />
                                        </label>
                                        <button type="button" onClick={() => setSegments((prev) => prev.filter((_, j) => j !== i))} className="flex h-6 w-6 items-center justify-center text-error/30 hover:text-error">
                                            <i className="fa-solid fa-trash text-[10px]" />
                                        </button>
                                    </div>
                                    {seg.field && (
                                        <div className="px-3 py-2">
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span className="text-[10px] font-medium uppercase tracking-wider text-base-content/30">Properties</span>
                                                <button type="button" onClick={() => setSegments((prev) => prev.map((s, j) => j === i ? { ...s, parts: [...s.parts, { property: '', format: '' }] } : s))} className="text-[10px] text-primary hover:underline">+ Add</button>
                                            </div>
                                            <div className="space-y-1.5">
                                                {seg.parts.map((part, pi) => (
                                                    <div key={pi} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={part.property}
                                                            onChange={(e) => setSegments((prev) => prev.map((s, j) => j === i ? { ...s, parts: s.parts.map((p, k) => k === pi ? { ...p, property: e.target.value } : p) } : s))}
                                                            placeholder="e.g., name or event_type.abbreviation"
                                                            className="input input-bordered h-7 min-h-0 flex-1 rounded-lg text-xs"
                                                        />
                                                        <select
                                                            value={part.format}
                                                            onChange={(e) => setSegments((prev) => prev.map((s, j) => j === i ? { ...s, parts: s.parts.map((p, k) => k === pi ? { ...p, format: e.target.value } : p) } : s))}
                                                            className="select select-bordered h-7 min-h-0 w-24 rounded-lg text-xs"
                                                        >
                                                            <option value="">Raw</option>
                                                            <option value="year">Year</option>
                                                            <option value="date">Date</option>
                                                        </select>
                                                        {seg.parts.length > 1 && (
                                                            <button type="button" onClick={() => setSegments((prev) => prev.map((s, j) => j === i ? { ...s, parts: s.parts.filter((_, k) => k !== pi) } : s))} className="flex h-5 w-5 items-center justify-center text-error/20 hover:text-error">
                                                                <i className="fa-solid fa-xmark text-[8px]" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {segments.length > 0 && (
                    <div className="border-t border-base-300 px-6 py-4">
                        <label className="text-sm font-semibold text-base-content/60">Options</label>
                        <div className="mt-3 flex gap-6">
                            <div className="flex-1">
                                <label className="text-xs text-base-content/40">Separator</label>
                                <input type="text" value={separator} onChange={(e) => setSeparator(e.target.value)} className="input input-bordered mt-1 h-8 min-h-0 w-full rounded-lg text-xs" placeholder="; " />
                                <p className="mt-1 text-[10px] text-base-content/25">Only between fields that both have values</p>
                            </div>
                            <div>
                                <label className="text-xs text-base-content/40">Wrap</label>
                                <div className="mt-1 flex items-center gap-2">
                                    <input type="text" value={wrapPrefix} onChange={(e) => setWrapPrefix(e.target.value)} className="input input-bordered h-8 min-h-0 w-10 rounded-lg px-2 text-center text-xs" placeholder="(" />
                                    <span className="text-xs text-base-content/20">...</span>
                                    <input type="text" value={wrapSuffix} onChange={(e) => setWrapSuffix(e.target.value)} className="input input-bordered h-8 min-h-0 w-10 rounded-lg px-2 text-center text-xs" placeholder=")" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between border-t border-base-300 px-6 py-3">
                    <button type="button" onClick={() => { setSegments([]); setSeparator('; '); setWrapPrefix(''); setWrapSuffix(''); }} className="btn btn-ghost btn-sm text-xs text-error/50 hover:text-error">Clear All</button>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm text-xs">Cancel</button>
                        <button type="button" onClick={apply} className="btn btn-primary btn-sm text-xs">Apply</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
