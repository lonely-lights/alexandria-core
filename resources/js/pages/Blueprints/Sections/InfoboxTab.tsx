import { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import Sortable from 'sortablejs';
import ActionButton from '@alexandria/components/ui/ActionButton';
import Modal from '@alexandria/components/ui/Modal';
import { useReorderMode } from '@alexandria/hooks/useReorderMode';
import ReorderModeToggle from '@alexandria/components/ui/ReorderModeToggle';
import type { BlueprintField, InfoboxBlock, SiblingBlueprint } from '@alexandria/types/blueprints';

interface InfoboxTabProps {
    projectSlug: string;
    blueprintSlug: string;
    schema: InfoboxBlock[];
    fields: BlueprintField[];
    relationshipBlueprints: SiblingBlueprint[];
}

export interface SubtitlePart {
    property: string;
    format: string;
}

export interface SubtitleSegment {
    field: string;
    parts: SubtitlePart[];
    linkable?: boolean;
}

export function compileTemplate(segments: SubtitleSegment[], separator: string, prefix: string, suffix: string): string {
    const validSegs = segments.filter((s) => s.field && s.parts.some((p) => p.property));
    if (validSegs.length === 0) return '';

    const compiled = validSegs.map((seg) => {
        const placeholders = seg.parts
            .filter((p) => p.property)
            .map((p) => {
                const path = `${seg.field}.${p.property}`;
                const fmt = p.format === 'year' ? " | formatDateTime('Y')" : p.format === 'date' ? " | formatDateTime('M j, Y')" : '';
                return `{{ ${path}${fmt} }}`;
            })
            .join(' ');

        // Wrap in wiki-link syntax if linkable: [[entry_name|display_text]]
        const content = seg.linkable
            ? `[[{{ ${seg.field}.name }}|${placeholders}]]`
            : placeholders;

        return `@if(${seg.field})${content}@end`;
    });

    // Join with conditional separators
    let result: string;
    if (compiled.length === 1) {
        result = compiled[0];
    } else {
        const joined: string[] = [];
        for (let i = 0; i < compiled.length; i++) {
            joined.push(compiled[i]);
            if (i < compiled.length - 1) {
                joined.push(`@if(${validSegs[i].field} AND ${validSegs[i + 1].field})${separator}@end`);
            }
        }
        result = joined.join('');
    }

    // Wrap
    if (prefix || suffix) {
        const condition = validSegs.map((s) => s.field).join(' OR ');
        result = `@if(${condition})${prefix}${result}${suffix}@end`;
    }

    return result;
}

function previewTemplate(segments: SubtitleSegment[], separator: string, prefix: string, suffix: string): string {
    const parts = segments.filter((s) => s.field && s.parts.some((p) => p.property)).map((seg) => {
        const display = seg.parts.filter((p) => p.property).map((p) => {
            let d = titleCase(p.property.split('.').pop() ?? p.property);
            if (p.format === 'year') d += '(Y)';
            if (p.format === 'date') d += '(date)';
            return d;
        }).join(' ');
        return seg.linkable ? `[${display}]` : display;
    });
    if (parts.length === 0) return 'No fields configured';
    return prefix + parts.join(separator) + suffix;
}

function titleCase(str: string): string {
    return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Block type config ── */

const BLOCK_TYPES = [
    { type: 'header', label: 'Header', icon: 'fa-solid fa-heading', description: 'Section divider label' },
    { type: 'attribute', label: 'Attribute', icon: 'fa-solid fa-tag', description: 'Display a field value' },
    { type: 'relationships', label: 'Relationships', icon: 'fa-solid fa-diagram-project', description: 'Show related entries' },
    { type: 'hierarchy', label: 'Hierarchy', icon: 'fa-solid fa-sitemap', description: 'Parent and children' },
    { type: 'mentioned_in', label: 'Mentioned In', icon: 'fa-solid fa-at', description: 'Show works that mention this entry' },
] as const;

/* ── Component ── */

export default function InfoboxTab({ projectSlug, blueprintSlug, schema, fields, relationshipBlueprints }: InfoboxTabProps) {
    const [blocks, setBlocks] = useState<InfoboxBlock[]>(schema);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const sortableRef = useRef<HTMLDivElement>(null);
    const blocksRef = useRef(blocks);
    blocksRef.current = blocks;
    const [reorderMode, setReorderMode] = useReorderMode();

    // SortableJS for drag reorder — only active when reorderMode === 'drag'
    useEffect(() => {
        if (reorderMode !== 'drag') return;
        const el = sortableRef.current;
        if (!el) return;
        const sortable = Sortable.create(el, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'opacity-30',
            onEnd: (evt) => {
                const { oldIndex, newIndex, from, item } = evt;
                if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
                // Revert DOM so React stays in control
                from.removeChild(item);
                const ref = from.children[oldIndex];
                ref ? from.insertBefore(item, ref) : from.appendChild(item);
                // Update state
                setBlocks((prev) => {
                    const next = [...prev];
                    const [moved] = next.splice(oldIndex, 1);
                    next.splice(newIndex, 0, moved);
                    return next;
                });
                setDirty(true);
            },
        });
        return () => sortable.destroy();
    }, [blocks.length, reorderMode]);

    function moveBlock(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= blocks.length) return;
        setBlocks((prev) => {
            const next = [...prev];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
        setDirty(true);
    }

    function addBlock(type: InfoboxBlock['type']) {
        const newBlock: InfoboxBlock = { type, data: getDefaultData(type) };
        setBlocks((prev) => [...prev, newBlock]);
        setEditingIndex(blocks.length);
        setDirty(true);
    }

    function updateBlock(index: number, data: Record<string, unknown>) {
        setBlocks((prev) => prev.map((b, i) => i === index ? { ...b, data } : b));
        setDirty(true);
    }

    function removeBlock(index: number) {
        setBlocks((prev) => prev.filter((_, i) => i !== index));
        setEditingIndex(null);
        setDirty(true);
    }

    function save() {
        setSaving(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.put(`/p/${projectSlug}/${blueprintSlug}/infobox`, {
            infobox_schema: blocks,
        } as any, {
            preserveScroll: true,
            onSuccess: () => {
                setDirty(false);
                setSaving(false);
            },
            onError: () => setSaving(false),
        });
    }

    const editingBlock = editingIndex !== null ? blocks[editingIndex] : null;

    return (
        <div className="space-y-5 p-5">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-base-content/70">Infobox Designer</h2>
                    <p className="mt-0.5 text-xs text-base-content/40">
                        Configure what appears in the entry infobox sidebar.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ReorderModeToggle mode={reorderMode} onChange={setReorderMode} />
                    {dirty && (
                        <span className="text-xs text-warning">Unsaved changes</span>
                    )}
                    <ActionButton
                        icon="fa-solid fa-plus"
                        label="Add Block"
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditingIndex(null)}
                    />
                    <ActionButton
                        icon="fa-solid fa-save"
                        label="Save"
                        onClick={save}
                        loading={saving}
                        disabled={!dirty}
                    />
                </div>
            </div>

            <div className="flex gap-6">
                {/* Block list — narrow side (golden ratio) */}
                <div className="w-[38.2%] min-w-0">
                    {blocks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-base-content/10 py-16 text-center">
                            <i className="fa-solid fa-puzzle-piece mb-3 text-3xl text-base-content/10" />
                            <p className="text-sm text-base-content/30">No blocks yet</p>
                            <p className="mt-1 text-xs text-base-content/20">Add blocks from the palette on the right</p>
                        </div>
                    ) : (
                        <div ref={sortableRef} className="space-y-2">
                            {blocks.map((block, index) => (
                                <BlockRow
                                    key={index}
                                    block={block}
                                    index={index}
                                    totalBlocks={blocks.length}
                                    isEditing={editingIndex === index}
                                    fields={fields}
                                    relationshipBlueprints={relationshipBlueprints}
                                    onEdit={() => setEditingIndex(editingIndex === index ? null : index)}
                                    onRemove={() => removeBlock(index)}
                                    onMove={moveBlock}
                                    reorderMode={reorderMode}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Right side — wide side (golden ratio) */}
                <div className="w-[61.8%] min-w-0">
                    {editingBlock ? (
                        <BlockEditor
                            block={editingBlock}
                            fields={fields}
                            relationshipBlueprints={relationshipBlueprints}
                            onChange={(data) => updateBlock(editingIndex!, data)}
                            onClose={() => setEditingIndex(null)}
                        />
                    ) : (
                        <BlockPalette onAdd={addBlock} />
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Block Row ── */

function BlockRow({ block, index, totalBlocks, isEditing, fields, relationshipBlueprints, onEdit, onRemove, onMove, reorderMode }: {
    block: InfoboxBlock;
    index: number;
    totalBlocks: number;
    isEditing: boolean;
    fields: BlueprintField[];
    relationshipBlueprints: SiblingBlueprint[];
    onEdit: () => void;
    onRemove: () => void;
    onMove: (index: number, direction: -1 | 1) => void;
    reorderMode: 'drag' | 'arrows';
}) {
    const config = BLOCK_TYPES.find((t) => t.type === block.type) ?? BLOCK_TYPES[0];
    const summary = getBlockSummary(block, fields, relationshipBlueprints);
    const showReorder = totalBlocks > 1;

    return (
        <div className={`group flex items-center rounded-xl border transition-colors ${
            isEditing ? 'border-primary bg-primary/5' : 'border-base-content/10 bg-base-200 hover:border-base-content/20'
        }`}>
            {/* Drag handle or arrow buttons */}
            {showReorder && (
                reorderMode === 'drag' ? (
                    <div className="drag-handle flex w-8 flex-shrink-0 cursor-grab items-center justify-center text-base-content/20 active:cursor-grabbing">
                        <i className="fa-solid fa-grip-vertical text-sm" />
                    </div>
                ) : (
                    <div className="flex w-8 flex-shrink-0 flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => onMove(index, -1)}
                            disabled={index === 0}
                            className="btn btn-ghost btn-xs h-4 min-h-0 rounded px-1 disabled:opacity-20"
                        >
                            <i className="fa-solid fa-chevron-up text-[9px]" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onMove(index, 1)}
                            disabled={index === totalBlocks - 1}
                            className="btn btn-ghost btn-xs h-4 min-h-0 rounded px-1 disabled:opacity-20"
                        >
                            <i className="fa-solid fa-chevron-down text-[9px]" />
                        </button>
                    </div>
                )
            )}

            {/* Content — clickable */}
            <button
                type="button"
                onClick={onEdit}
                className="flex flex-1 items-center gap-2 px-3 py-2.5 text-left"
            >
                <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-base-content">{config.label}</div>
                    {summary && (
                        <div className="truncate text-[11px] text-base-content/40">{summary}</div>
                    )}
                </div>
            </button>

            {/* Delete */}
            <button
                type="button"
                onClick={onRemove}
                className="mr-3 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-error/20 opacity-0 transition-all hover:text-error group-hover:opacity-100"
            >
                <i className="fa-solid fa-trash text-[10px]" />
            </button>
        </div>
    );
}

/* ── Block Palette ── */

function BlockPalette({ onAdd }: { onAdd: (type: InfoboxBlock['type']) => void }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-200">
            <div className="border-b border-base-content/5 bg-base-300/40 px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Add Block</h3>
            </div>
            <div className="p-2">
                {BLOCK_TYPES.map((bt) => (
                    <button
                        key={bt.type}
                        type="button"
                        onClick={() => onAdd(bt.type)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-base-200/50"
                    >
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-base-200/50">
                            <i className={`${bt.icon} text-xs text-base-content/40`} />
                        </div>
                        <div>
                            <div className="text-sm font-medium">{bt.label}</div>
                            <div className="text-[11px] text-base-content/40">{bt.description}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ── Block Editor ── */

function BlockEditor({ block, fields, relationshipBlueprints, onChange, onClose }: {
    block: InfoboxBlock;
    fields: BlueprintField[];
    relationshipBlueprints: SiblingBlueprint[];
    onChange: (data: Record<string, unknown>) => void;
    onClose: () => void;
}) {
    const config = BLOCK_TYPES.find((t) => t.type === block.type) ?? BLOCK_TYPES[0];

    return (
        <div className="overflow-hidden rounded-2xl border border-primary/30 bg-base-200 shadow-sm">
            <div
                className="flex items-center justify-between border-b border-base-content/5 px-4 py-3"
                style={{ background: 'linear-gradient(90deg, oklch(var(--p) / 0.8), oklch(var(--p) / 0.6))' }}
            >
                <h3 className="flex items-center gap-2 text-xs font-semibold text-primary-content">
                    <i className={`${config.icon} text-primary-content/60`} />
                    {config.label}
                </h3>
                <button onClick={onClose} className="text-primary-content/40 transition-colors hover:text-primary-content">
                    <i className="fa-solid fa-xmark text-xs" />
                </button>
            </div>
            <div className="space-y-3 p-3">
                {block.type === 'header' && (
                    <HeaderEditor data={block.data} onChange={onChange} />
                )}
                {block.type === 'attribute' && (
                    <AttributeEditor data={block.data} fields={fields} onChange={onChange} />
                )}
                {block.type === 'relationships' && (
                    <RelationshipsEditor data={block.data} relationshipBlueprints={relationshipBlueprints} onChange={onChange} />
                )}
                {block.type === 'hierarchy' && (
                    <HierarchyEditor data={block.data} onChange={onChange} />
                )}
                {block.type === 'mentioned_in' && (
                    <MentionedInEditor data={block.data} onChange={onChange} />
                )}
            </div>
        </div>
    );
}

/* ── Block type editors ── */

function HeaderEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
    return (
        <div>
            <label className="text-[11px] font-medium text-base-content/50">Header Text</label>
            <input
                type="text"
                value={(data.text as string) ?? ''}
                onChange={(e) => onChange({ ...data, text: e.target.value })}
                placeholder="Section title"
                className="input input-bordered mt-1 h-7 min-h-0 w-full rounded-lg text-xs"
            />
        </div>
    );
}

function AttributeEditor({ data, fields, onChange }: { data: Record<string, unknown>; fields: BlueprintField[]; onChange: (d: Record<string, unknown>) => void }) {
    return (
        <>
            <div>
                <label className="text-[11px] font-medium text-base-content/50">Field</label>
                <select
                    value={(data.field_name as string) ?? ''}
                    onChange={(e) => onChange({ ...data, field_name: e.target.value })}
                    className="select select-bordered mt-1 h-7 min-h-0 w-full rounded-lg text-xs"
                >
                    <option value="">Select field...</option>
                    {fields.map((f) => (
                        <option key={f.name} value={f.name}>{f.label} ({titleCase(f.type)})</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-base-content/50">Limit items</label>
                <input
                    type="checkbox"
                    className="toggle toggle-primary toggle-xs"
                    checked={!!data.limit_enabled}
                    onChange={(e) => onChange({ ...data, limit_enabled: e.target.checked })}
                />
            </div>
            {data.limit_enabled && (
                <div>
                    <label className="text-[11px] font-medium text-base-content/50">Show first</label>
                    <input
                        type="number"
                        value={(data.visible_limit as number) ?? 3}
                        onChange={(e) => onChange({ ...data, visible_limit: parseInt(e.target.value) || 3 })}
                        min={1}
                        className="input input-bordered mt-1 h-7 min-h-0 w-full rounded-lg text-xs"
                    />
                </div>
            )}
        </>
    );
}

function RelationshipsEditor({ data, relationshipBlueprints, onChange }: { data: Record<string, unknown>; relationshipBlueprints: SiblingBlueprint[]; onChange: (d: Record<string, unknown>) => void }) {
    const [subtitleModalOpen, setSubtitleModalOpen] = useState(false);
    const selectedSlug = (data.target_blueprint_slug as string) ?? '';
    const hasSubtitle = !!(data.subtitle_template as string);

    return (
        <>
            <div>
                <label className="text-[11px] font-medium text-base-content/50">Relationship Blueprint</label>
                <select
                    value={selectedSlug}
                    onChange={(e) => onChange({ ...data, target_blueprint_slug: e.target.value })}
                    className="select select-bordered mt-1 h-7 min-h-0 w-full rounded-lg text-xs"
                >
                    <option value="">Select blueprint...</option>
                    {relationshipBlueprints.map((rb) => (
                        <option key={rb.slug} value={rb.slug}>{rb.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="text-[11px] font-medium text-base-content/50">Direction</label>
                <select
                    value={(data.direction as string) ?? 'both'}
                    onChange={(e) => onChange({ ...data, direction: e.target.value })}
                    className="select select-bordered mt-1 h-7 min-h-0 w-full rounded-lg text-xs"
                >
                    <option value="both">Both</option>
                    <option value="outgoing">Outgoing only</option>
                    <option value="incoming">Incoming only</option>
                </select>
            </div>
            <div>
                <label className="text-[11px] font-medium text-base-content/50">Header text (optional)</label>
                <input
                    type="text"
                    value={(data.header_text as string) ?? ''}
                    onChange={(e) => onChange({ ...data, header_text: e.target.value })}
                    placeholder="Auto-generated from blueprint name"
                    className="input input-bordered mt-1 h-7 min-h-0 w-full rounded-lg text-xs"
                />
            </div>

            {/* Subtitle button */}
            {selectedSlug && (
                <div>
                    <label className="text-[11px] font-medium text-base-content/50">Subtitle</label>
                    <button
                        type="button"
                        onClick={() => setSubtitleModalOpen(true)}
                        className="mt-1 flex w-full items-center justify-between rounded-lg border border-base-content/10 bg-base-200/40 px-3 py-2 text-left text-xs transition-colors hover:border-primary/30 hover:bg-base-200/60"
                    >
                        <span className={hasSubtitle ? 'text-base-content/70' : 'text-base-content/30'}>
                            {hasSubtitle ? 'Subtitle configured' : 'No subtitle'}
                        </span>
                        <i className={`fa-solid ${hasSubtitle ? 'fa-pen' : 'fa-plus'} text-[10px] text-base-content/30`} />
                    </button>
                </div>
            )}

            {/* Subtitle builder modal */}
            <SubtitleBuilderModal
                open={subtitleModalOpen}
                onClose={() => setSubtitleModalOpen(false)}
                data={data}
                onChange={onChange}
                relationshipBlueprints={relationshipBlueprints}
                selectedSlug={selectedSlug}
            />
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-base-content/50">Limit items</label>
                <input
                    type="checkbox"
                    className="toggle toggle-primary toggle-xs"
                    checked={!!data.limit_enabled}
                    onChange={(e) => onChange({ ...data, limit_enabled: e.target.checked })}
                />
            </div>
            {data.limit_enabled && (
                <div>
                    <label className="text-[11px] font-medium text-base-content/50">Show first</label>
                    <input
                        type="number"
                        value={(data.visible_limit as number) ?? 5}
                        onChange={(e) => onChange({ ...data, visible_limit: parseInt(e.target.value) || 5 })}
                        min={1}
                        className="input input-bordered mt-1 h-7 min-h-0 w-full rounded-lg text-xs"
                    />
                </div>
            )}
        </>
    );
}

function HierarchyEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
    return (
        <>
            <div>
                <label className="text-[11px] font-medium text-base-content/50">Direction</label>
                <select
                    value={(data.direction as string) ?? 'both'}
                    onChange={(e) => onChange({ ...data, direction: e.target.value })}
                    className="select select-bordered mt-1 h-7 min-h-0 w-full rounded-lg text-xs"
                >
                    <option value="both">Both parent and children</option>
                    <option value="parent">Parent only</option>
                    <option value="children">Children only</option>
                </select>
            </div>
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-base-content/50">Limit children</label>
                <input
                    type="checkbox"
                    className="toggle toggle-primary toggle-xs"
                    checked={data.limit_enabled !== false}
                    onChange={(e) => onChange({ ...data, limit_enabled: e.target.checked })}
                />
            </div>
            {data.limit_enabled !== false && (
                <div>
                    <label className="text-[11px] font-medium text-base-content/50">Show first</label>
                    <input
                        type="number"
                        value={(data.visible_limit as number) ?? 5}
                        onChange={(e) => onChange({ ...data, visible_limit: parseInt(e.target.value) || 5 })}
                        min={1}
                        className="input input-bordered mt-1 h-7 min-h-0 w-full rounded-lg text-xs"
                    />
                </div>
            )}
        </>
    );
}

function MentionedInEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
    return (
        <>
            <div>
                <label className="text-[11px] font-medium text-base-content/50">Label</label>
                <input
                    type="text"
                    value={(data.label as string) ?? 'First Appears'}
                    onChange={(e) => onChange({ ...data, label: e.target.value })}
                    placeholder="First Appears"
                    className="input input-bordered mt-1 h-7 min-h-0 w-full rounded-lg text-xs"
                />
            </div>
            <div>
                <label className="text-[11px] font-medium text-base-content/50">Target blueprint slugs (comma-separated)</label>
                <input
                    type="text"
                    value={((data.target_blueprint_slugs as string[]) ?? []).join(', ')}
                    onChange={(e) => onChange({ ...data, target_blueprint_slugs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                    placeholder="work"
                    className="input input-bordered mt-1 h-7 min-h-0 w-full rounded-lg text-xs"
                />
            </div>
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-base-content/50">Trace parent chain</label>
                <input
                    type="checkbox"
                    className="toggle toggle-primary toggle-xs"
                    checked={data.trace_parents !== false}
                    onChange={(e) => onChange({ ...data, trace_parents: e.target.checked })}
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[11px] font-medium text-base-content/50">Sort by</label>
                    <input
                        type="text"
                        value={(data.sort_by as string) ?? 'sort_order'}
                        onChange={(e) => onChange({ ...data, sort_by: e.target.value })}
                        className="input input-bordered mt-1 h-7 min-h-0 w-full rounded-lg text-xs"
                    />
                </div>
                <div>
                    <label className="text-[11px] font-medium text-base-content/50">Direction</label>
                    <select
                        value={(data.sort_direction as string) ?? 'asc'}
                        onChange={(e) => onChange({ ...data, sort_direction: e.target.value })}
                        className="select select-bordered mt-1 h-7 min-h-0 w-full rounded-lg text-xs"
                    >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                    </select>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-base-content/50">Limit results</label>
                <input
                    type="checkbox"
                    className="toggle toggle-primary toggle-xs"
                    checked={data.limit_enabled === true}
                    onChange={(e) => onChange({ ...data, limit_enabled: e.target.checked })}
                />
            </div>
            {data.limit_enabled === true && (
                <div>
                    <label className="text-[11px] font-medium text-base-content/50">Show first</label>
                    <input
                        type="number"
                        value={(data.visible_limit as number) ?? 1}
                        onChange={(e) => onChange({ ...data, visible_limit: parseInt(e.target.value) || 1 })}
                        min={1}
                        className="input input-bordered mt-1 h-7 min-h-0 w-full rounded-lg text-xs"
                    />
                </div>
            )}
        </>
    );
}

/* ── Helpers ── */

/* ── Subtitle Builder Modal ── */

function SubtitleBuilderModal({ open, onClose, data, onChange, relationshipBlueprints, selectedSlug }: {
    open: boolean;
    onClose: () => void;
    data: Record<string, unknown>;
    onChange: (d: Record<string, unknown>) => void;
    relationshipBlueprints: SiblingBlueprint[];
    selectedSlug: string;
}) {
    const [relFields, setRelFields] = useState<BlueprintField[]>([]);
    const [segments, setSegmentsState] = useState<SubtitleSegment[]>(
        (data.subtitle_segments as SubtitleSegment[] | undefined) ?? []
    );
    const [separator, setSeparator] = useState((data.subtitle_separator as string) ?? '; ');
    const [wrapPrefix, setWrapPrefix] = useState((data.subtitle_wrap_prefix as string) ?? '');
    const [wrapSuffix, setWrapSuffix] = useState((data.subtitle_wrap_suffix as string) ?? '');

    // Fetch fields for the selected relationship blueprint
    useEffect(() => {
        if (!selectedSlug || !open) return;
        const rb = relationshipBlueprints.find((b) => b.slug === selectedSlug);
        if (!rb) return;
        fetch(`/api/v1/blueprints/${rb.id}/fields`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.ok ? r.json() : [])
            .then((fields) => setRelFields(fields))
            .catch(() => setRelFields([]));
    }, [selectedSlug, open]);

    // Sync local state when modal opens
    useEffect(() => {
        if (open) {
            setSegmentsState((data.subtitle_segments as SubtitleSegment[] | undefined) ?? []);
            setSeparator((data.subtitle_separator as string) ?? '; ');
            setWrapPrefix((data.subtitle_wrap_prefix as string) ?? '');
            setWrapSuffix((data.subtitle_wrap_suffix as string) ?? '');
        }
    }, [open]);

    function addSegment() {
        setSegmentsState((prev) => [...prev, { field: '', parts: [{ property: '', format: '' }] }]);
    }

    function updateSegmentField(i: number, field: string) {
        setSegmentsState((prev) => prev.map((s, j) => j === i ? { ...s, field } : s));
    }

    function addPart(segIndex: number) {
        setSegmentsState((prev) => prev.map((s, j) => j === segIndex ? { ...s, parts: [...s.parts, { property: '', format: '' }] } : s));
    }

    function updatePart(segIndex: number, partIndex: number, updates: Partial<SubtitlePart>) {
        setSegmentsState((prev) => prev.map((s, j) => j === segIndex ? {
            ...s,
            parts: s.parts.map((p, k) => k === partIndex ? { ...p, ...updates } : p),
        } : s));
    }

    function removePart(segIndex: number, partIndex: number) {
        setSegmentsState((prev) => prev.map((s, j) => j === segIndex ? {
            ...s,
            parts: s.parts.filter((_, k) => k !== partIndex),
        } : s));
    }

    function removeSegment(i: number) {
        setSegmentsState((prev) => prev.filter((_, j) => j !== i));
    }

    function apply() {
        const compiled = compileTemplate(segments, separator, wrapPrefix, wrapSuffix);
        onChange({
            ...data,
            subtitle_segments: segments,
            subtitle_separator: separator,
            subtitle_wrap_prefix: wrapPrefix,
            subtitle_wrap_suffix: wrapSuffix,
            subtitle_template: compiled,
        });
        onClose();
    }

    function clearAll() {
        setSegmentsState([]);
        setSeparator('; ');
        setWrapPrefix('');
        setWrapSuffix('');
    }

    const rbName = relationshipBlueprints.find((b) => b.slug === selectedSlug)?.name ?? selectedSlug;
    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
            <div className="flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold">Subtitle Builder</h2>
                        <p className="mt-0.5 text-xs text-base-content/40">
                            Configure what appears below each entry in the <span className="font-medium text-base-content/60">{rbName}</span> section
                        </p>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-square rounded-xl">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Instructions */}
                <div className="border-b border-base-300 bg-base-200/30 px-6 py-3">
                    <p className="text-xs leading-relaxed text-base-content/50">
                        Add fields from the relationship blueprint to build a subtitle line. Each field can optionally traverse
                        into a referenced entry's property (e.g., <code className="rounded bg-base-300 px-1 text-[10px]">event_type.abbreviation</code>).
                        The separator only appears between fields that have values — no hanging separators.
                    </p>
                </div>

                {/* Segments */}
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-base-content/60">Display Fields</label>
                        <button type="button" onClick={addSegment} className="btn btn-ghost btn-xs gap-1 rounded-lg text-primary">
                            <i className="fa-solid fa-plus text-[10px]" /> Add Field
                        </button>
                    </div>

                    {segments.length === 0 ? (
                        <div className="mt-3 rounded-xl border border-dashed border-base-content/10 py-6 text-center">
                            <i className="fa-solid fa-puzzle-piece mb-2 text-xl text-base-content/10" />
                            <p className="text-xs text-base-content/30">No fields added yet</p>
                            <p className="mt-1 text-[10px] text-base-content/20">Click "Add Field" to build the subtitle</p>
                        </div>
                    ) : (
                        <div className="mt-3 space-y-3">
                            {segments.map((seg, i) => (
                                <div key={i} className="rounded-xl border border-base-300 bg-base-100">
                                    {/* Segment header: field picker + linkable + remove */}
                                    <div className="flex items-center gap-2 border-b border-base-200 px-3 py-2">
                                        <select
                                            value={seg.field}
                                            onChange={(e) => updateSegmentField(i, e.target.value)}
                                            className="select select-bordered h-7 min-h-0 flex-1 rounded-lg text-xs"
                                        >
                                            <option value="">Select field...</option>
                                            {relFields.map((f) => (
                                                <option key={f.name} value={f.name}>{f.label} ({titleCase(f.type)})</option>
                                            ))}
                                        </select>
                                        <label className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-base-content/5" title="Make this segment a clickable link to the entry">
                                            <input
                                                type="checkbox"
                                                checked={!!seg.linkable}
                                                onChange={(e) => setSegmentsState((prev) => prev.map((s, j) => j === i ? { ...s, linkable: e.target.checked } : s))}
                                                className="checkbox checkbox-xs checkbox-primary"
                                            />
                                            <i className={`fa-solid fa-link text-[10px] ${seg.linkable ? 'text-primary' : 'text-base-content/20'}`} />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => removeSegment(i)}
                                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-error/30 transition-colors hover:text-error"
                                        >
                                            <i className="fa-solid fa-trash text-[10px]" />
                                        </button>
                                    </div>

                                    {/* Parts */}
                                    {seg.field && (
                                        <div className="px-3 py-2">
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span className="text-[10px] font-medium uppercase tracking-wider text-base-content/30">Properties to display</span>
                                                <button type="button" onClick={() => addPart(i)} className="text-[10px] text-primary hover:underline">+ Add</button>
                                            </div>
                                            <div className="space-y-1.5">
                                                {seg.parts.map((part, pi) => (
                                                    <div key={pi} className="flex items-center gap-2">
                                                        <PropertyPicker
                                                            field={seg.field}
                                                            relFields={relFields}
                                                            value={part.property}
                                                            onChange={(v) => updatePart(i, pi, { property: v })}
                                                        />
                                                        <select
                                                            value={part.format}
                                                            onChange={(e) => updatePart(i, pi, { format: e.target.value })}
                                                            className="select select-bordered h-7 min-h-0 w-24 rounded-lg text-xs"
                                                        >
                                                            <option value="">Raw</option>
                                                            <option value="year">Year</option>
                                                            <option value="date">Date</option>
                                                        </select>
                                                        {seg.parts.length > 1 && (
                                                            <button type="button" onClick={() => removePart(i, pi)} className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-error/20 hover:text-error">
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

                {/* Separator & Wrapping */}
                {segments.length > 0 && (
                    <div className="border-t border-base-300 px-6 py-4">
                        <label className="text-sm font-semibold text-base-content/60">Options</label>
                        <div className="mt-3 flex gap-6">
                            <div className="flex-1">
                                <label className="text-xs text-base-content/40">Separator between fields</label>
                                <input
                                    type="text"
                                    value={separator}
                                    onChange={(e) => setSeparator(e.target.value)}
                                    className="input input-bordered mt-1 h-8 min-h-0 w-full rounded-lg text-xs"
                                    placeholder="; "
                                />
                                <p className="mt-1 text-[10px] text-base-content/25">Only shows between fields that both have values</p>
                            </div>
                            <div>
                                <label className="text-xs text-base-content/40">Wrap with</label>
                                <div className="mt-1 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={wrapPrefix}
                                        onChange={(e) => setWrapPrefix(e.target.value)}
                                        className="input input-bordered h-8 min-h-0 w-10 rounded-lg px-2 text-center text-xs"
                                        placeholder="("
                                    />
                                    <span className="text-xs text-base-content/20">...</span>
                                    <input
                                        type="text"
                                        value={wrapSuffix}
                                        onChange={(e) => setWrapSuffix(e.target.value)}
                                        className="input input-bordered h-8 min-h-0 w-10 rounded-lg px-2 text-center text-xs"
                                        placeholder=")"
                                    />
                                </div>
                                <p className="mt-1 text-[10px] text-base-content/25">Only if any field has data</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview */}
                {segments.filter((s) => s.field).length > 0 && (
                    <div className="border-t border-base-300 px-6 py-3">
                        <label className="text-[10px] font-medium uppercase tracking-wider text-base-content/30">Preview</label>
                        <div className="mt-1 rounded-lg bg-secondary/30 px-3 py-2 text-sm text-secondary-content">
                            {previewTemplate(segments, separator, wrapPrefix, wrapSuffix)}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-base-300 px-6 py-3">
                    <button type="button" onClick={clearAll} className="btn btn-ghost btn-sm text-xs text-error/50 hover:text-error">
                        Clear All
                    </button>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm text-xs">Cancel</button>
                        <button type="button" onClick={apply} className="btn btn-primary btn-sm text-xs">Apply</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

/* ── Property Picker ── */

interface PropertyOption {
    value: string;   // dot-path like "event_type.abbreviation"
    label: string;   // friendly like "Event Type → Abbreviation"
    group?: string;  // optgroup label
}

function PropertyPicker({ field, relFields, value, onChange }: {
    field: string;
    relFields: BlueprintField[];
    value: string;
    onChange: (v: string) => void;
}) {
    const [options, setOptions] = useState<PropertyOption[]>([]);
    const [loading, setLoading] = useState(false);

    // Find the selected field's target blueprint
    const selectedField = relFields.find((f) => f.name === field);
    const targetSlug = (selectedField?.validation_rules as Record<string, unknown>)?.target_blueprint_slug as string | undefined;

    useEffect(() => {
        if (!targetSlug) {
            // Non-reference field — just offer "name" as direct value
            setOptions([{ value: 'name', label: 'Name' }]);
            return;
        }

        setLoading(true);

        // Fetch the target blueprint by slug to get its ID, then fetch its fields
        fetch(`/api/v1/entries/search?blueprint_slug=${targetSlug}&limit=0`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        }).catch(() => null);

        // We need blueprint ID from slug. Use the blueprints fields endpoint.
        // First find the blueprint by searching all project blueprints
        fetchBlueprintFieldsBySlug(targetSlug).then((fields) => {
            const opts: PropertyOption[] = [
                { value: 'name', label: 'Name', group: 'Direct' },
            ];

            // Add direct properties
            for (const f of fields) {
                if (f.name === 'name') continue;
                opts.push({
                    value: f.name,
                    label: titleCase(f.name),
                    group: 'Direct',
                });
            }

            // For entry_reference fields, fetch one level deeper
            const refFields = fields.filter((f) => f.type === 'entry_reference');
            const deepFetches = refFields.map(async (rf) => {
                const refSlug = (rf.validation_rules as Record<string, unknown>)?.target_blueprint_slug as string | undefined;
                if (!refSlug) return [];
                const nestedFields = await fetchBlueprintFieldsBySlug(refSlug);
                return nestedFields.map((nf) => ({
                    value: `${rf.name}.${nf.name}`,
                    label: `${titleCase(rf.name)} → ${titleCase(nf.name)}`,
                    group: titleCase(rf.name),
                }));
            });

            Promise.all(deepFetches).then((nested) => {
                for (const group of nested) {
                    opts.push(...group);
                }
                setOptions(opts);
                setLoading(false);
            });
        }).catch(() => {
            setOptions([{ value: 'name', label: 'Name' }]);
            setLoading(false);
        });
    }, [field, targetSlug]);

    // Group options by group
    const groups = options.reduce<Record<string, PropertyOption[]>>((acc, opt) => {
        const g = opt.group ?? '';
        if (!acc[g]) acc[g] = [];
        acc[g].push(opt);
        return acc;
    }, {});

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="select select-bordered h-7 min-h-0 flex-1 rounded-lg text-xs"
            disabled={loading}
        >
            <option value="">{loading ? 'Loading...' : 'Select property...'}</option>
            {Object.entries(groups).map(([groupName, groupOpts]) =>
                groupName ? (
                    <optgroup key={groupName} label={groupName}>
                        {groupOpts.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </optgroup>
                ) : (
                    groupOpts.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))
                )
            )}
        </select>
    );
}

// Cache for blueprint fields by slug
const blueprintFieldsCache = new Map<string, BlueprintField[]>();

async function fetchBlueprintFieldsBySlug(slug: string): Promise<BlueprintField[]> {
    if (blueprintFieldsCache.has(slug)) {
        return blueprintFieldsCache.get(slug)!;
    }

    // Find blueprint ID by slug via the database schema endpoint
    const bpRes = await fetch(`/api/v1/blueprints/by-slug/${slug}/fields`, {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
    });

    if (!bpRes.ok) return [];
    const fields = await bpRes.json();
    blueprintFieldsCache.set(slug, fields);
    return fields;
}

function getDefaultData(type: InfoboxBlock['type']): Record<string, unknown> {
    switch (type) {
        case 'header': return { text: '' };
        case 'attribute': return { field_name: '', limit_enabled: false, visible_limit: 3 };
        case 'relationships': return { target_blueprint_slug: '', direction: 'both', limit_enabled: false, visible_limit: 5 };
        case 'hierarchy': return { direction: 'both', limit_enabled: true, visible_limit: 5 };
        case 'mentioned_in': return { label: 'First Appears', target_blueprint_slugs: ['work'], trace_parents: true, sort_by: 'release_order', sort_direction: 'asc', limit_enabled: true, visible_limit: 1 };
    }
}

function getBlockSummary(block: InfoboxBlock, fields: BlueprintField[], relationshipBlueprints: SiblingBlueprint[]): string | null {
    switch (block.type) {
        case 'header':
            return (block.data.text as string) || null;
        case 'attribute': {
            const fieldName = block.data.field_name as string;
            const field = fields.find((f) => f.name === fieldName);
            return field ? field.label : fieldName || null;
        }
        case 'relationships': {
            if (block.data.header_text) return block.data.header_text as string;
            const slug = block.data.target_blueprint_slug as string;
            const rb = relationshipBlueprints.find((b) => b.slug === slug);
            return rb ? rb.name : slug || null;
        }
        case 'hierarchy': {
            const dir = (block.data.direction as string) ?? 'both';
            return dir === 'both' ? 'Parent & Children' : dir === 'parent' ? 'Parent only' : 'Children only';
        }
        case 'mentioned_in': {
            return (block.data.label as string) || 'Mentioned In';
        }
    }
}
