import { type CSSProperties, type ReactNode, useState, useEffect, useRef } from "react";
import { router } from "@inertiajs/react";
import Sortable from "sortablejs";
import ActionButton from "@alexandria/components/ui/ActionButton";
import Modal from "@alexandria/components/ui/Modal";
import { useReorderMode } from "@alexandria/hooks/useReorderMode";
import ReorderModeToggle from "@alexandria/components/ui/ReorderModeToggle";
import useT from "@alexandria/hooks/useT";
import type { Translator } from "@alexandria/hooks/useT";
import type {
    BlueprintField,
    InfoboxBlock,
    SiblingBlueprint,
} from "@alexandria/types/blueprints";
import {
    helperFainterStyle,
    helperSoftStyle,
    helperStyle,
    inputStyle,
    labelStyle,
    selectStyle,
    softDividerStyle,
    warningTextStyle,
} from "./modals/settings/settingsPanelStyles";

/* ── Theme-token style recipes (local to this file) ────────────── */

const compactInputStyle: CSSProperties = {
    ...inputStyle,
    height: "1.75rem",
    fontSize: "0.75rem",
};

const compactSelectStyle: CSSProperties = {
    ...selectStyle,
    height: "1.75rem",
    fontSize: "0.75rem",
};

const blockRowSelectedStyle: CSSProperties = {
    border: "1px solid var(--theme-brand-primary-500)",
    background:
        "color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)",
    borderRadius: "var(--theme-radius-card)",
    transition:
        "border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const blockRowIdleStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "var(--theme-base-200)",
    borderRadius: "var(--theme-radius-card)",
    transition:
        "border-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const blockListEmptyStyle: CSSProperties = {
    border: "1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

const blockPaletteShellStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "var(--theme-base-200)",
    borderRadius: "var(--theme-radius-card)",
    overflow: "hidden",
};

const blockPaletteHeaderStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
    background: "color-mix(in srgb, var(--theme-base-300) 40%, transparent)",
};

const blockPaletteIconWrapStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--theme-base-200) 50%, transparent)",
    borderRadius: "var(--theme-radius-input)",
};

const blockEditorShellStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-brand-primary-500) 30%, transparent)",
    background: "var(--theme-base-200)",
    borderRadius: "var(--theme-radius-card)",
    boxShadow:
        "0 1px 2px 0 color-mix(in srgb, var(--theme-base-content) 8%, transparent)",
    overflow: "hidden",
};

const blockEditorHeaderStyle: CSSProperties = {
    borderBottom:
        "1px solid color-mix(in srgb, var(--theme-base-content) 5%, transparent)",
    background:
        "linear-gradient(90deg, color-mix(in srgb, var(--theme-brand-primary-500) 80%, transparent), color-mix(in srgb, var(--theme-brand-primary-500) 60%, transparent))",
    color: "var(--theme-brand-primary-content)",
};

const subtitlePickerBtnStyle: CSSProperties = {
    border: "1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    background: "color-mix(in srgb, var(--theme-base-200) 40%, transparent)",
    borderRadius: "var(--theme-radius-input)",
    transition:
        "background-color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const deleteBtnStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-status-error-stroke) 20%, transparent)",
    borderRadius: "var(--theme-radius-button)",
    transition:
        "color var(--theme-motion-duration-fast) var(--theme-motion-easing-standard), opacity var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)",
};

const previewBoxStyle: CSSProperties = {
    background:
        "color-mix(in srgb, var(--theme-brand-secondary-500) 30%, transparent)",
    color: "var(--theme-brand-secondary-content)",
    borderRadius: "var(--theme-radius-input)",
};

const codeStyle: CSSProperties = {
    background: "var(--theme-base-300)",
    padding: "0 0.25rem",
    fontSize: "0.625rem",
    borderRadius: "0.25rem",
};

const sectionDividerStyle: CSSProperties = {
    borderBottom: "1px solid var(--theme-base-300)",
};

const helperBannerStyle: CSSProperties = {
    ...sectionDividerStyle,
    background: "color-mix(in srgb, var(--theme-base-200) 30%, transparent)",
};

const segmentCardStyle: CSSProperties = {
    border: "1px solid var(--theme-base-300)",
    background: "var(--theme-base-100)",
    borderRadius: "var(--theme-radius-card)",
};

const segmentHeaderDividerStyle: CSSProperties = {
    borderBottom: "1px solid var(--theme-base-200)",
};

const dashedEmptyStyle: CSSProperties = {
    border: "1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    borderRadius: "var(--theme-radius-card)",
};

const errorSoftStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-status-error-stroke) 30%, transparent)",
};
const errorVerySoftStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-status-error-stroke) 20%, transparent)",
};
const errorHalfStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-status-error-stroke) 50%, transparent)",
};
const primaryTextStyle: CSSProperties = {
    color: "var(--theme-brand-primary-500)",
};
const veryHelperStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 25%, transparent)",
};
const dragHandleStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
};
const closeBtnStyle: CSSProperties = {
    borderRadius: "var(--theme-radius-button)",
    width: "2rem",
    height: "2rem",
};

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

export function compileTemplate(
    segments: SubtitleSegment[],
    separator: string,
    prefix: string,
    suffix: string,
): string {
    const validSegs = segments.filter(
        (s) => s.field && s.parts.some((p) => p.property),
    );
    if (validSegs.length === 0) return "";

    const compiled = validSegs.map((seg) => {
        const placeholders = seg.parts
            .filter((p) => p.property)
            .map((p) => {
                const path = `${seg.field}.${p.property}`;
                const fmt =
                    p.format === "year"
                        ? " | formatDateTime('Y')"
                        : p.format === "date"
                          ? " | formatDateTime('M j, Y')"
                          : "";
                return `{{ ${path}${fmt} }}`;
            })
            .join(" ");

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
                joined.push(
                    `@if(${validSegs[i].field} AND ${validSegs[i + 1].field})${separator}@end`,
                );
            }
        }
        result = joined.join("");
    }

    // Wrap
    if (prefix || suffix) {
        const condition = validSegs.map((s) => s.field).join(" OR ");
        result = `@if(${condition})${prefix}${result}${suffix}@end`;
    }

    return result;
}

function previewTemplate(
    segments: SubtitleSegment[],
    separator: string,
    prefix: string,
    suffix: string,
    t: Translator,
): string {
    const parts = segments
        .filter((s) => s.field && s.parts.some((p) => p.property))
        .map((seg) => {
            const display = seg.parts
                .filter((p) => p.property)
                .map((p) => {
                    let d = titleCase(
                        p.property.split(".").pop() ?? p.property,
                    );
                    if (p.format === "year") d += "(Y)";
                    if (p.format === "date") d += "(date)";
                    return d;
                })
                .join(" ");
            return seg.linkable ? `[${display}]` : display;
        });
    if (parts.length === 0)
        return t("blueprints.infobox.subtitle.preview_empty");
    return prefix + parts.join(separator) + suffix;
}

function titleCase(str: string): string {
    return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Block type config ── */

const BLOCK_TYPES = [
    { type: "header", icon: "fa-solid fa-heading" },
    { type: "attribute", icon: "fa-solid fa-tag" },
    { type: "relationships", icon: "fa-solid fa-diagram-project" },
    { type: "hierarchy", icon: "fa-solid fa-sitemap" },
    { type: "mentioned_in", icon: "fa-solid fa-at" },
] as const;

function blockTypeLabel(t: Translator, type: InfoboxBlock["type"]): string {
    return t(`blueprints.infobox.block_type.${type}.label`);
}

function blockTypeDescription(
    t: Translator,
    type: InfoboxBlock["type"],
): string {
    return t(`blueprints.infobox.block_type.${type}.description`);
}

/* ── Component ── */

export default function InfoboxTab({
    projectSlug,
    blueprintSlug,
    schema,
    fields,
    relationshipBlueprints,
}: InfoboxTabProps) {
    const t = useT();
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
        if (reorderMode !== "drag") return;
        const el = sortableRef.current;
        if (!el) return;
        const sortable = Sortable.create(el, {
            handle: ".drag-handle",
            animation: 150,
            ghostClass: "opacity-30",
            onEnd: (evt) => {
                const { oldIndex, newIndex, from, item } = evt;
                if (
                    oldIndex == null ||
                    newIndex == null ||
                    oldIndex === newIndex
                )
                    return;
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

    function addBlock(type: InfoboxBlock["type"]) {
        const newBlock: InfoboxBlock = { type, data: getDefaultData(type) };
        setBlocks((prev) => [...prev, newBlock]);
        setEditingIndex(blocks.length);
        setDirty(true);
    }

    function updateBlock(index: number, data: Record<string, unknown>) {
        setBlocks((prev) =>
            prev.map((b, i) => (i === index ? { ...b, data } : b)),
        );
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
        router.put(
            `/p/${projectSlug}/${blueprintSlug}/infobox`,
            {
                infobox_schema: blocks,
            } as any,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDirty(false);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            },
        );
    }

    const editingBlock = editingIndex !== null ? blocks[editingIndex] : null;

    return (
        <div className="space-y-5 p-5">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold" style={labelStyle}>
                        {t("blueprints.infobox.title")}
                    </h2>
                    <p className="mt-0.5 text-xs" style={helperFainterStyle}>
                        {t("blueprints.infobox.subtitle")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ReorderModeToggle
                        mode={reorderMode}
                        onChange={setReorderMode}
                    />
                    {dirty && (
                        <span className="text-xs" style={warningTextStyle}>
                            {t("blueprints.infobox.unsaved")}
                        </span>
                    )}
                    <ActionButton
                        icon="fa-solid fa-plus"
                        label={t("blueprints.infobox.add_block")}
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditingIndex(null)}
                    />
                    <ActionButton
                        icon="fa-solid fa-save"
                        label={t("common.save")}
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
                        <div
                            className="py-16 text-center"
                            style={blockListEmptyStyle}
                        >
                            <i
                                className="fa-solid fa-puzzle-piece mb-3 text-3xl"
                                style={{
                                    color: "color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
                                }}
                            />
                            <p className="text-sm" style={helperSoftStyle}>
                                {t("blueprints.infobox.empty.title")}
                            </p>
                            <p
                                className="mt-1 text-xs"
                                style={{
                                    color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
                                }}
                            >
                                {t("blueprints.infobox.empty.hint")}
                            </p>
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
                                    relationshipBlueprints={
                                        relationshipBlueprints
                                    }
                                    onEdit={() =>
                                        setEditingIndex(
                                            editingIndex === index
                                                ? null
                                                : index,
                                        )
                                    }
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
                            onChange={(data) =>
                                updateBlock(editingIndex!, data)
                            }
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

function BlockRow({
    block,
    index,
    totalBlocks,
    isEditing,
    fields,
    relationshipBlueprints,
    onEdit,
    onRemove,
    onMove,
    reorderMode,
}: {
    block: InfoboxBlock;
    index: number;
    totalBlocks: number;
    isEditing: boolean;
    fields: BlueprintField[];
    relationshipBlueprints: SiblingBlueprint[];
    onEdit: () => void;
    onRemove: () => void;
    onMove: (index: number, direction: -1 | 1) => void;
    reorderMode: "drag" | "arrows";
}) {
    const t = useT();
    const config =
        BLOCK_TYPES.find((bt) => bt.type === block.type) ?? BLOCK_TYPES[0];
    const summary = getBlockSummary(block, fields, relationshipBlueprints, t);
    const showReorder = totalBlocks > 1;

    return (
        <div
            className="group flex items-center"
            style={isEditing ? blockRowSelectedStyle : blockRowIdleStyle}
        >
            {/* Drag handle or arrow buttons */}
            {showReorder &&
                (reorderMode === "drag" ? (
                    <div
                        className="drag-handle flex w-8 flex-shrink-0 cursor-grab items-center justify-center active:cursor-grabbing"
                        style={dragHandleStyle}
                    >
                        <i className="fa-solid fa-grip-vertical text-sm" />
                    </div>
                ) : (
                    <div
                        className="flex w-8 flex-shrink-0 flex-col items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => onMove(index, -1)}
                            disabled={index === 0}
                            className="alex-btn alex-btn--ghost inline-flex h-4 items-center justify-center px-1 disabled:opacity-20"
                            style={{
                                borderRadius: "var(--theme-radius-button)",
                            }}
                        >
                            <i className="fa-solid fa-chevron-up text-[9px]" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onMove(index, 1)}
                            disabled={index === totalBlocks - 1}
                            className="alex-btn alex-btn--ghost inline-flex h-4 items-center justify-center px-1 disabled:opacity-20"
                            style={{
                                borderRadius: "var(--theme-radius-button)",
                            }}
                        >
                            <i className="fa-solid fa-chevron-down text-[9px]" />
                        </button>
                    </div>
                ))}

            {/* Content — clickable */}
            <button
                type="button"
                onClick={onEdit}
                className="flex flex-1 items-center gap-2 px-3 py-2.5 text-left"
            >
                <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium">
                        {blockTypeLabel(t, config.type)}
                    </div>
                    {summary && (
                        <div
                            className="truncate text-[11px]"
                            style={helperFainterStyle}
                        >
                            {summary}
                        </div>
                    )}
                </div>
            </button>

            {/* Delete */}
            <button
                type="button"
                onClick={onRemove}
                className="mr-3 flex h-7 w-7 flex-shrink-0 items-center justify-center opacity-0 transition-all group-hover:opacity-100"
                style={deleteBtnStyle}
            >
                <i className="fa-solid fa-trash text-[10px]" />
            </button>
        </div>
    );
}

/* ── Block Palette ── */

function BlockPalette({
    onAdd,
}: {
    onAdd: (type: InfoboxBlock["type"]) => void;
}) {
    const t = useT();
    return (
        <div style={blockPaletteShellStyle}>
            <div className="px-4 py-3" style={blockPaletteHeaderStyle}>
                <h3
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={helperStyle}
                >
                    {t("blueprints.infobox.palette.title")}
                </h3>
            </div>
            <div className="p-2">
                {BLOCK_TYPES.map((bt) => (
                    <button
                        key={bt.type}
                        type="button"
                        onClick={() => onAdd(bt.type)}
                        className="alex-row flex w-full items-center gap-3 px-3 py-2.5 text-left"
                        style={{ borderRadius: "var(--theme-radius-card)" }}
                    >
                        <div
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center"
                            style={blockPaletteIconWrapStyle}
                        >
                            <i
                                className={`${bt.icon} text-xs`}
                                style={helperFainterStyle}
                            />
                        </div>
                        <div>
                            <div className="text-sm font-medium">
                                {blockTypeLabel(t, bt.type)}
                            </div>
                            <div
                                className="text-[11px]"
                                style={helperFainterStyle}
                            >
                                {blockTypeDescription(t, bt.type)}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ── Block Editor ── */

function BlockEditor({
    block,
    fields,
    relationshipBlueprints,
    onChange,
    onClose,
}: {
    block: InfoboxBlock;
    fields: BlueprintField[];
    relationshipBlueprints: SiblingBlueprint[];
    onChange: (data: Record<string, unknown>) => void;
    onClose: () => void;
}) {
    const t = useT();
    const config =
        BLOCK_TYPES.find((bt) => bt.type === block.type) ?? BLOCK_TYPES[0];

    return (
        <div style={blockEditorShellStyle}>
            <div
                className="flex items-center justify-between px-4 py-3"
                style={blockEditorHeaderStyle}
            >
                <h3 className="flex items-center gap-2 text-xs font-semibold">
                    <i
                        className={config.icon}
                        style={{
                            color: "color-mix(in srgb, var(--theme-brand-primary-content) 60%, transparent)",
                        }}
                    />
                    {blockTypeLabel(t, config.type)}
                </h3>
                <button
                    onClick={onClose}
                    className="transition-colors"
                    style={{
                        color: "color-mix(in srgb, var(--theme-brand-primary-content) 40%, transparent)",
                    }}
                >
                    <i className="fa-solid fa-xmark text-xs" />
                </button>
            </div>
            <div className="space-y-3 p-3">
                {block.type === "header" && (
                    <HeaderEditor data={block.data} onChange={onChange} />
                )}
                {block.type === "attribute" && (
                    <AttributeEditor
                        data={block.data}
                        fields={fields}
                        onChange={onChange}
                    />
                )}
                {block.type === "relationships" && (
                    <RelationshipsEditor
                        data={block.data}
                        relationshipBlueprints={relationshipBlueprints}
                        onChange={onChange}
                    />
                )}
                {block.type === "hierarchy" && (
                    <HierarchyEditor data={block.data} onChange={onChange} />
                )}
                {block.type === "mentioned_in" && (
                    <MentionedInEditor data={block.data} onChange={onChange} />
                )}
            </div>
        </div>
    );
}

/* ── Editor field row helpers ── */

function EditorLabel({ children }: { children: ReactNode }) {
    return (
        <label className="text-[11px] font-medium" style={helperStyle}>
            {children}
        </label>
    );
}

function EditorTextInput({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="mt-1 w-full px-2 focus:outline-none focus:ring-2"
            style={compactInputStyle}
        />
    );
}

function EditorNumberInput({
    value,
    onChange,
    min,
}: {
    value: number;
    onChange: (v: number) => void;
    min?: number;
}) {
    return (
        <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value) || (min ?? 1))}
            min={min}
            className="mt-1 w-full px-2 focus:outline-none focus:ring-2"
            style={compactInputStyle}
        />
    );
}

function EditorSelect({
    value,
    onChange,
    children,
}: {
    value: string;
    onChange: (v: string) => void;
    children: ReactNode;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 w-full px-2 focus:outline-none focus:ring-2"
            style={compactSelectStyle}
        >
            {children}
        </select>
    );
}

function EditorToggleRow({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium" style={helperStyle}>
                {label}
            </label>
            <input
                type="checkbox"
                role="switch"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                style={{
                    accentColor: "var(--theme-brand-primary-500)",
                    width: "1.75rem",
                    height: "1.125rem",
                }}
            />
        </div>
    );
}

/* ── Block type editors ── */

function HeaderEditor({
    data,
    onChange,
}: {
    data: Record<string, unknown>;
    onChange: (d: Record<string, unknown>) => void;
}) {
    const t = useT();
    return (
        <div>
            <EditorLabel>
                {t("blueprints.infobox.editor.header.text_label")}
            </EditorLabel>
            <EditorTextInput
                value={(data.text as string) ?? ""}
                onChange={(v) => onChange({ ...data, text: v })}
                placeholder={t(
                    "blueprints.infobox.editor.header.text_placeholder",
                )}
            />
        </div>
    );
}

function AttributeEditor({
    data,
    fields,
    onChange,
}: {
    data: Record<string, unknown>;
    fields: BlueprintField[];
    onChange: (d: Record<string, unknown>) => void;
}) {
    const t = useT();
    return (
        <>
            <div>
                <EditorLabel>
                    {t("blueprints.infobox.editor.attribute.field")}
                </EditorLabel>
                <EditorSelect
                    value={(data.field_name as string) ?? ""}
                    onChange={(v) => onChange({ ...data, field_name: v })}
                >
                    <option value="">
                        {t(
                            "blueprints.infobox.editor.attribute.field_placeholder",
                        )}
                    </option>
                    {fields.map((f) => (
                        <option key={f.name} value={f.name}>
                            {f.label} ({titleCase(f.type)})
                        </option>
                    ))}
                </EditorSelect>
            </div>
            <EditorToggleRow
                label={t("blueprints.infobox.editor.limit_items")}
                checked={!!data.limit_enabled}
                onChange={(v) => onChange({ ...data, limit_enabled: v })}
            />
            {data.limit_enabled && (
                <div>
                    <EditorLabel>
                        {t("blueprints.infobox.editor.show_first")}
                    </EditorLabel>
                    <EditorNumberInput
                        value={(data.visible_limit as number) ?? 3}
                        onChange={(v) =>
                            onChange({ ...data, visible_limit: v })
                        }
                        min={1}
                    />
                </div>
            )}
        </>
    );
}

function RelationshipsEditor({
    data,
    relationshipBlueprints,
    onChange,
}: {
    data: Record<string, unknown>;
    relationshipBlueprints: SiblingBlueprint[];
    onChange: (d: Record<string, unknown>) => void;
}) {
    const t = useT();
    const [subtitleModalOpen, setSubtitleModalOpen] = useState(false);
    const selectedSlug = (data.target_blueprint_slug as string) ?? "";
    const hasSubtitle = !!(data.subtitle_template as string);

    return (
        <>
            <div>
                <EditorLabel>
                    {t("blueprints.infobox.editor.relationships.blueprint")}
                </EditorLabel>
                <EditorSelect
                    value={selectedSlug}
                    onChange={(v) =>
                        onChange({ ...data, target_blueprint_slug: v })
                    }
                >
                    <option value="">
                        {t(
                            "blueprints.infobox.editor.relationships.blueprint_placeholder",
                        )}
                    </option>
                    {relationshipBlueprints.map((rb) => (
                        <option key={rb.slug} value={rb.slug}>
                            {rb.name}
                        </option>
                    ))}
                </EditorSelect>
            </div>
            <div>
                <EditorLabel>
                    {t("blueprints.infobox.editor.relationships.direction")}
                </EditorLabel>
                <EditorSelect
                    value={(data.direction as string) ?? "both"}
                    onChange={(v) => onChange({ ...data, direction: v })}
                >
                    <option value="both">
                        {t(
                            "blueprints.infobox.editor.relationships.direction_both",
                        )}
                    </option>
                    <option value="outgoing">
                        {t(
                            "blueprints.infobox.editor.relationships.direction_outgoing",
                        )}
                    </option>
                    <option value="incoming">
                        {t(
                            "blueprints.infobox.editor.relationships.direction_incoming",
                        )}
                    </option>
                </EditorSelect>
            </div>
            <div>
                <EditorLabel>
                    {t("blueprints.infobox.editor.relationships.header_label")}
                </EditorLabel>
                <EditorTextInput
                    value={(data.header_text as string) ?? ""}
                    onChange={(v) => onChange({ ...data, header_text: v })}
                    placeholder={t(
                        "blueprints.infobox.editor.relationships.header_placeholder",
                    )}
                />
            </div>

            {/* Subtitle button */}
            {selectedSlug && (
                <div>
                    <EditorLabel>
                        {t(
                            "blueprints.infobox.editor.relationships.subtitle_label",
                        )}
                    </EditorLabel>
                    <button
                        type="button"
                        onClick={() => setSubtitleModalOpen(true)}
                        className="alex-row mt-1 flex w-full items-center justify-between px-3 py-2 text-left text-xs"
                        style={subtitlePickerBtnStyle}
                    >
                        <span
                            style={hasSubtitle ? labelStyle : helperSoftStyle}
                        >
                            {hasSubtitle
                                ? t(
                                      "blueprints.infobox.editor.relationships.subtitle_configured",
                                  )
                                : t(
                                      "blueprints.infobox.editor.relationships.subtitle_none",
                                  )}
                        </span>
                        <i
                            className={`fa-solid ${hasSubtitle ? "fa-pen" : "fa-plus"} text-[10px]`}
                            style={helperSoftStyle}
                        />
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
            <EditorToggleRow
                label={t("blueprints.infobox.editor.limit_items")}
                checked={!!data.limit_enabled}
                onChange={(v) => onChange({ ...data, limit_enabled: v })}
            />
            {data.limit_enabled && (
                <div>
                    <EditorLabel>
                        {t("blueprints.infobox.editor.show_first")}
                    </EditorLabel>
                    <EditorNumberInput
                        value={(data.visible_limit as number) ?? 5}
                        onChange={(v) =>
                            onChange({ ...data, visible_limit: v })
                        }
                        min={1}
                    />
                </div>
            )}
        </>
    );
}

function HierarchyEditor({
    data,
    onChange,
}: {
    data: Record<string, unknown>;
    onChange: (d: Record<string, unknown>) => void;
}) {
    const t = useT();
    return (
        <>
            <div>
                <EditorLabel>
                    {t("blueprints.infobox.editor.hierarchy.direction")}
                </EditorLabel>
                <EditorSelect
                    value={(data.direction as string) ?? "both"}
                    onChange={(v) => onChange({ ...data, direction: v })}
                >
                    <option value="both">
                        {t(
                            "blueprints.infobox.editor.hierarchy.direction_both",
                        )}
                    </option>
                    <option value="parent">
                        {t(
                            "blueprints.infobox.editor.hierarchy.direction_parent",
                        )}
                    </option>
                    <option value="children">
                        {t(
                            "blueprints.infobox.editor.hierarchy.direction_children",
                        )}
                    </option>
                </EditorSelect>
            </div>
            <EditorToggleRow
                label={t("blueprints.infobox.editor.hierarchy.limit_children")}
                checked={data.limit_enabled !== false}
                onChange={(v) => onChange({ ...data, limit_enabled: v })}
            />
            {data.limit_enabled !== false && (
                <div>
                    <EditorLabel>
                        {t("blueprints.infobox.editor.show_first")}
                    </EditorLabel>
                    <EditorNumberInput
                        value={(data.visible_limit as number) ?? 5}
                        onChange={(v) =>
                            onChange({ ...data, visible_limit: v })
                        }
                        min={1}
                    />
                </div>
            )}
        </>
    );
}

function MentionedInEditor({
    data,
    onChange,
}: {
    data: Record<string, unknown>;
    onChange: (d: Record<string, unknown>) => void;
}) {
    const t = useT();
    return (
        <>
            <div>
                <EditorLabel>
                    {t("blueprints.infobox.editor.mentioned.label")}
                </EditorLabel>
                <EditorTextInput
                    value={(data.label as string) ?? "First Appears"}
                    onChange={(v) => onChange({ ...data, label: v })}
                    placeholder={t(
                        "blueprints.infobox.editor.mentioned.label_placeholder",
                    )}
                />
            </div>
            <div>
                <EditorLabel>
                    {t("blueprints.infobox.editor.mentioned.targets")}
                </EditorLabel>
                <EditorTextInput
                    value={(
                        (data.target_blueprint_slugs as string[]) ?? []
                    ).join(", ")}
                    onChange={(v) =>
                        onChange({
                            ...data,
                            target_blueprint_slugs: v
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                        })
                    }
                    placeholder={t(
                        "blueprints.infobox.editor.mentioned.targets_placeholder",
                    )}
                />
            </div>
            <EditorToggleRow
                label={t("blueprints.infobox.editor.mentioned.trace_parents")}
                checked={data.trace_parents !== false}
                onChange={(v) => onChange({ ...data, trace_parents: v })}
            />
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <EditorLabel>
                        {t("blueprints.infobox.editor.mentioned.sort_by")}
                    </EditorLabel>
                    <EditorTextInput
                        value={(data.sort_by as string) ?? "sort_order"}
                        onChange={(v) => onChange({ ...data, sort_by: v })}
                    />
                </div>
                <div>
                    <EditorLabel>
                        {t(
                            "blueprints.infobox.editor.mentioned.sort_direction",
                        )}
                    </EditorLabel>
                    <EditorSelect
                        value={(data.sort_direction as string) ?? "asc"}
                        onChange={(v) =>
                            onChange({ ...data, sort_direction: v })
                        }
                    >
                        <option value="asc">
                            {t("blueprints.infobox.editor.mentioned.sort_asc")}
                        </option>
                        <option value="desc">
                            {t("blueprints.infobox.editor.mentioned.sort_desc")}
                        </option>
                    </EditorSelect>
                </div>
            </div>
            <EditorToggleRow
                label={t("blueprints.infobox.editor.mentioned.limit_results")}
                checked={data.limit_enabled === true}
                onChange={(v) => onChange({ ...data, limit_enabled: v })}
            />
            {data.limit_enabled === true && (
                <div>
                    <EditorLabel>
                        {t("blueprints.infobox.editor.show_first")}
                    </EditorLabel>
                    <EditorNumberInput
                        value={(data.visible_limit as number) ?? 1}
                        onChange={(v) =>
                            onChange({ ...data, visible_limit: v })
                        }
                        min={1}
                    />
                </div>
            )}
        </>
    );
}

/* ── Subtitle Builder Modal ── */

function SubtitleBuilderModal({
    open,
    onClose,
    data,
    onChange,
    relationshipBlueprints,
    selectedSlug,
}: {
    open: boolean;
    onClose: () => void;
    data: Record<string, unknown>;
    onChange: (d: Record<string, unknown>) => void;
    relationshipBlueprints: SiblingBlueprint[];
    selectedSlug: string;
}) {
    const t = useT();
    const [relFields, setRelFields] = useState<BlueprintField[]>([]);
    const [segments, setSegmentsState] = useState<SubtitleSegment[]>(
        (data.subtitle_segments as SubtitleSegment[] | undefined) ?? [],
    );
    const [separator, setSeparator] = useState(
        (data.subtitle_separator as string) ?? "; ",
    );
    const [wrapPrefix, setWrapPrefix] = useState(
        (data.subtitle_wrap_prefix as string) ?? "",
    );
    const [wrapSuffix, setWrapSuffix] = useState(
        (data.subtitle_wrap_suffix as string) ?? "",
    );

    // Fetch fields for the selected relationship blueprint
    useEffect(() => {
        if (!selectedSlug || !open) return;
        const rb = relationshipBlueprints.find((b) => b.slug === selectedSlug);
        if (!rb) return;
        fetch(`/api/v1/blueprints/${rb.id}/fields`, {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        })
            .then((r) => (r.ok ? r.json() : []))
            .then((fields) => setRelFields(fields))
            .catch(() => setRelFields([]));
    }, [selectedSlug, open]);

    // Sync local state when modal opens
    useEffect(() => {
        if (open) {
            setSegmentsState(
                (data.subtitle_segments as SubtitleSegment[] | undefined) ?? [],
            );
            setSeparator((data.subtitle_separator as string) ?? "; ");
            setWrapPrefix((data.subtitle_wrap_prefix as string) ?? "");
            setWrapSuffix((data.subtitle_wrap_suffix as string) ?? "");
        }
    }, [open]);

    function addSegment() {
        setSegmentsState((prev) => [
            ...prev,
            { field: "", parts: [{ property: "", format: "" }] },
        ]);
    }

    function updateSegmentField(i: number, field: string) {
        setSegmentsState((prev) =>
            prev.map((s, j) => (j === i ? { ...s, field } : s)),
        );
    }

    function addPart(segIndex: number) {
        setSegmentsState((prev) =>
            prev.map((s, j) =>
                j === segIndex
                    ? {
                          ...s,
                          parts: [...s.parts, { property: "", format: "" }],
                      }
                    : s,
            ),
        );
    }

    function updatePart(
        segIndex: number,
        partIndex: number,
        updates: Partial<SubtitlePart>,
    ) {
        setSegmentsState((prev) =>
            prev.map((s, j) =>
                j === segIndex
                    ? {
                          ...s,
                          parts: s.parts.map((p, k) =>
                              k === partIndex ? { ...p, ...updates } : p,
                          ),
                      }
                    : s,
            ),
        );
    }

    function removePart(segIndex: number, partIndex: number) {
        setSegmentsState((prev) =>
            prev.map((s, j) =>
                j === segIndex
                    ? {
                          ...s,
                          parts: s.parts.filter((_, k) => k !== partIndex),
                      }
                    : s,
            ),
        );
    }

    function removeSegment(i: number) {
        setSegmentsState((prev) => prev.filter((_, j) => j !== i));
    }

    function apply() {
        const compiled = compileTemplate(
            segments,
            separator,
            wrapPrefix,
            wrapSuffix,
        );
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
        setSeparator("; ");
        setWrapPrefix("");
        setWrapSuffix("");
    }

    const rbName =
        relationshipBlueprints.find((b) => b.slug === selectedSlug)?.name ??
        selectedSlug;
    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
            <div className="flex flex-col">
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={sectionDividerStyle}
                >
                    <div>
                        <h2 className="text-lg font-bold">
                            {t("blueprints.infobox.subtitle.title")}
                        </h2>
                        <p
                            className="mt-0.5 text-xs"
                            style={helperFainterStyle}
                        >
                            {t("blueprints.infobox.subtitle.subtitle_prefix")}
                            <span className="font-medium" style={labelStyle}>
                                {rbName}
                            </span>
                            {t("blueprints.infobox.subtitle.subtitle_suffix")}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="alex-btn alex-btn--ghost inline-flex items-center justify-center"
                        style={closeBtnStyle}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Instructions */}
                <div className="px-6 py-3" style={helperBannerStyle}>
                    <p className="text-xs leading-relaxed" style={helperStyle}>
                        {t("blueprints.infobox.subtitle.intro_prefix")}
                        <code style={codeStyle}>event_type.abbreviation</code>
                        {t("blueprints.infobox.subtitle.intro_suffix")}
                    </p>
                </div>

                {/* Segments */}
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <label
                            className="text-sm font-semibold"
                            style={labelStyle}
                        >
                            {t("blueprints.infobox.subtitle.display_fields")}
                        </label>
                        <button
                            type="button"
                            onClick={addSegment}
                            className="alex-btn alex-btn--ghost inline-flex items-center gap-1 px-2 py-1 text-xs"
                            style={{
                                ...primaryTextStyle,
                                borderRadius: "var(--theme-radius-button)",
                            }}
                        >
                            <i className="fa-solid fa-plus text-[10px]" />{" "}
                            {t("blueprints.infobox.subtitle.add_field")}
                        </button>
                    </div>

                    {segments.length === 0 ? (
                        <div
                            className="mt-3 py-6 text-center"
                            style={dashedEmptyStyle}
                        >
                            <i
                                className="fa-solid fa-puzzle-piece mb-2 text-xl"
                                style={{
                                    color: "color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
                                }}
                            />
                            <p className="text-xs" style={helperSoftStyle}>
                                {t("blueprints.infobox.subtitle.empty.title")}
                            </p>
                            <p
                                className="mt-1 text-[10px]"
                                style={{
                                    color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
                                }}
                            >
                                {t("blueprints.infobox.subtitle.empty.hint")}
                            </p>
                        </div>
                    ) : (
                        <div className="mt-3 space-y-3">
                            {segments.map((seg, i) => (
                                <div key={i} style={segmentCardStyle}>
                                    {/* Segment header: field picker + linkable + remove */}
                                    <div
                                        className="flex items-center gap-2 px-3 py-2"
                                        style={segmentHeaderDividerStyle}
                                    >
                                        <select
                                            value={seg.field}
                                            onChange={(e) =>
                                                updateSegmentField(
                                                    i,
                                                    e.target.value,
                                                )
                                            }
                                            className="flex-1 px-2 focus:outline-none focus:ring-2"
                                            style={compactSelectStyle}
                                        >
                                            <option value="">
                                                {t(
                                                    "blueprints.infobox.subtitle.field_placeholder",
                                                )}
                                            </option>
                                            {relFields.map((f) => (
                                                <option
                                                    key={f.name}
                                                    value={f.name}
                                                >
                                                    {f.label} (
                                                    {titleCase(f.type)})
                                                </option>
                                            ))}
                                        </select>
                                        <label
                                            className="alex-row flex flex-shrink-0 cursor-pointer items-center gap-1.5 px-2 py-1"
                                            style={{
                                                borderRadius:
                                                    "var(--theme-radius-button)",
                                            }}
                                            title={t(
                                                "blueprints.infobox.subtitle.linkable_tooltip",
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!!seg.linkable}
                                                onChange={(e) =>
                                                    setSegmentsState((prev) =>
                                                        prev.map((s, j) =>
                                                            j === i
                                                                ? {
                                                                      ...s,
                                                                      linkable:
                                                                          e
                                                                              .target
                                                                              .checked,
                                                                  }
                                                                : s,
                                                        ),
                                                    )
                                                }
                                                style={{
                                                    accentColor:
                                                        "var(--theme-brand-primary-500)",
                                                }}
                                            />
                                            <i
                                                className="fa-solid fa-link text-[10px]"
                                                style={
                                                    seg.linkable
                                                        ? primaryTextStyle
                                                        : {
                                                              color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
                                                          }
                                                }
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => removeSegment(i)}
                                            className="alex-row flex h-6 w-6 flex-shrink-0 items-center justify-center"
                                            style={{
                                                ...errorSoftStyle,
                                                borderRadius:
                                                    "var(--theme-radius-button)",
                                            }}
                                        >
                                            <i className="fa-solid fa-trash text-[10px]" />
                                        </button>
                                    </div>

                                    {/* Parts */}
                                    {seg.field && (
                                        <div className="px-3 py-2">
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span
                                                    className="text-[10px] font-medium uppercase tracking-wider"
                                                    style={helperSoftStyle}
                                                >
                                                    {t(
                                                        "blueprints.infobox.subtitle.properties",
                                                    )}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => addPart(i)}
                                                    className="text-[10px] hover:underline"
                                                    style={primaryTextStyle}
                                                >
                                                    + {t("common.add")}
                                                </button>
                                            </div>
                                            <div className="space-y-1.5">
                                                {seg.parts.map((part, pi) => (
                                                    <div
                                                        key={pi}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <PropertyPicker
                                                            field={seg.field}
                                                            relFields={
                                                                relFields
                                                            }
                                                            value={
                                                                part.property
                                                            }
                                                            onChange={(v) =>
                                                                updatePart(
                                                                    i,
                                                                    pi,
                                                                    {
                                                                        property:
                                                                            v,
                                                                    },
                                                                )
                                                            }
                                                        />
                                                        <select
                                                            value={part.format}
                                                            onChange={(e) =>
                                                                updatePart(
                                                                    i,
                                                                    pi,
                                                                    {
                                                                        format: e
                                                                            .target
                                                                            .value,
                                                                    },
                                                                )
                                                            }
                                                            className="w-24 px-2 focus:outline-none focus:ring-2"
                                                            style={
                                                                compactSelectStyle
                                                            }
                                                        >
                                                            <option value="">
                                                                {t(
                                                                    "blueprints.infobox.subtitle.format.raw",
                                                                )}
                                                            </option>
                                                            <option value="year">
                                                                {t(
                                                                    "blueprints.infobox.subtitle.format.year",
                                                                )}
                                                            </option>
                                                            <option value="date">
                                                                {t(
                                                                    "blueprints.infobox.subtitle.format.date",
                                                                )}
                                                            </option>
                                                        </select>
                                                        {seg.parts.length >
                                                            1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removePart(
                                                                        i,
                                                                        pi,
                                                                    )
                                                                }
                                                                className="alex-row flex h-5 w-5 flex-shrink-0 items-center justify-center"
                                                                style={{
                                                                    ...errorVerySoftStyle,
                                                                    borderRadius:
                                                                        "var(--theme-radius-button)",
                                                                }}
                                                            >
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
                    <div className="px-6 py-4" style={softDividerStyle}>
                        <label
                            className="text-sm font-semibold"
                            style={labelStyle}
                        >
                            {t("blueprints.infobox.subtitle.options")}
                        </label>
                        <div className="mt-3 flex gap-6">
                            <div className="flex-1">
                                <label
                                    className="text-xs"
                                    style={helperFainterStyle}
                                >
                                    {t(
                                        "blueprints.infobox.subtitle.separator_label",
                                    )}
                                </label>
                                <input
                                    type="text"
                                    value={separator}
                                    onChange={(e) =>
                                        setSeparator(e.target.value)
                                    }
                                    className="mt-1 w-full px-2 focus:outline-none focus:ring-2"
                                    style={{
                                        ...compactInputStyle,
                                        height: "2rem",
                                    }}
                                    placeholder="; "
                                />
                                <p
                                    className="mt-1 text-[10px]"
                                    style={veryHelperStyle}
                                >
                                    {t(
                                        "blueprints.infobox.subtitle.separator_hint",
                                    )}
                                </p>
                            </div>
                            <div>
                                <label
                                    className="text-xs"
                                    style={helperFainterStyle}
                                >
                                    {t(
                                        "blueprints.infobox.subtitle.wrap_label",
                                    )}
                                </label>
                                <div className="mt-1 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={wrapPrefix}
                                        onChange={(e) =>
                                            setWrapPrefix(e.target.value)
                                        }
                                        className="w-10 px-2 text-center focus:outline-none focus:ring-2"
                                        style={{
                                            ...compactInputStyle,
                                            height: "2rem",
                                        }}
                                        placeholder="("
                                    />
                                    <span
                                        className="text-xs"
                                        style={{
                                            color: "color-mix(in srgb, var(--theme-base-content) 20%, transparent)",
                                        }}
                                    >
                                        ...
                                    </span>
                                    <input
                                        type="text"
                                        value={wrapSuffix}
                                        onChange={(e) =>
                                            setWrapSuffix(e.target.value)
                                        }
                                        className="w-10 px-2 text-center focus:outline-none focus:ring-2"
                                        style={{
                                            ...compactInputStyle,
                                            height: "2rem",
                                        }}
                                        placeholder=")"
                                    />
                                </div>
                                <p
                                    className="mt-1 text-[10px]"
                                    style={veryHelperStyle}
                                >
                                    {t("blueprints.infobox.subtitle.wrap_hint")}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview */}
                {segments.filter((s) => s.field).length > 0 && (
                    <div className="px-6 py-3" style={softDividerStyle}>
                        <label
                            className="text-[10px] font-medium uppercase tracking-wider"
                            style={helperSoftStyle}
                        >
                            {t("blueprints.infobox.subtitle.preview")}
                        </label>
                        <div
                            className="mt-1 px-3 py-2 text-sm"
                            style={previewBoxStyle}
                        >
                            {previewTemplate(
                                segments,
                                separator,
                                wrapPrefix,
                                wrapSuffix,
                                t,
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div
                    className="flex items-center justify-between px-6 py-3"
                    style={softDividerStyle}
                >
                    <button
                        type="button"
                        onClick={clearAll}
                        className="alex-btn alex-btn--ghost inline-flex items-center px-2 py-1 text-xs"
                        style={{
                            ...errorHalfStyle,
                            borderRadius: "var(--theme-radius-button)",
                        }}
                    >
                        {t("blueprints.infobox.subtitle.clear_all")}
                    </button>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="alex-btn alex-btn--ghost inline-flex items-center px-3 py-1 text-xs"
                            style={{
                                borderRadius: "var(--theme-radius-button)",
                            }}
                        >
                            {t("common.cancel")}
                        </button>
                        <button
                            type="button"
                            onClick={apply}
                            className="alex-btn alex-btn--primary inline-flex items-center px-3 py-1 text-xs"
                            style={{
                                borderRadius: "var(--theme-radius-button)",
                            }}
                        >
                            {t("blueprints.infobox.subtitle.apply")}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

/* ── Property Picker ── */

interface PropertyOption {
    value: string; // dot-path like "event_type.abbreviation"
    label: string; // friendly like "Event Type → Abbreviation"
    group?: string; // optgroup label
}

function PropertyPicker({
    field,
    relFields,
    value,
    onChange,
}: {
    field: string;
    relFields: BlueprintField[];
    value: string;
    onChange: (v: string) => void;
}) {
    const t = useT();
    const [options, setOptions] = useState<PropertyOption[]>([]);
    const [loading, setLoading] = useState(false);

    // Find the selected field's target blueprint
    const selectedField = relFields.find((f) => f.name === field);
    const targetSlug = (
        selectedField?.validation_rules as Record<string, unknown>
    )?.target_blueprint_slug as string | undefined;

    useEffect(() => {
        if (!targetSlug) {
            // Non-reference field — just offer "name" as direct value
            setOptions([{ value: "name", label: "Name" }]);
            return;
        }

        setLoading(true);

        // Fetch the target blueprint by slug to get its ID, then fetch its fields
        fetch(`/api/v1/entries/search?blueprint_slug=${targetSlug}&limit=0`, {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        }).catch(() => null);

        // We need blueprint ID from slug. Use the blueprints fields endpoint.
        // First find the blueprint by searching all project blueprints
        fetchBlueprintFieldsBySlug(targetSlug)
            .then((fields) => {
                const opts: PropertyOption[] = [
                    { value: "name", label: "Name", group: "Direct" },
                ];

                // Add direct properties
                for (const f of fields) {
                    if (f.name === "name") continue;
                    opts.push({
                        value: f.name,
                        label: titleCase(f.name),
                        group: "Direct",
                    });
                }

                // For entry_reference fields, fetch one level deeper
                const refFields = fields.filter(
                    (f) => f.type === "entry_reference",
                );
                const deepFetches = refFields.map(async (rf) => {
                    const refSlug = (
                        rf.validation_rules as Record<string, unknown>
                    )?.target_blueprint_slug as string | undefined;
                    if (!refSlug) return [];
                    const nestedFields =
                        await fetchBlueprintFieldsBySlug(refSlug);
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
            })
            .catch(() => {
                setOptions([{ value: "name", label: "Name" }]);
                setLoading(false);
            });
    }, [field, targetSlug]);

    // Group options by group
    const groups = options.reduce<Record<string, PropertyOption[]>>(
        (acc, opt) => {
            const g = opt.group ?? "";
            if (!acc[g]) acc[g] = [];
            acc[g].push(opt);
            return acc;
        },
        {},
    );

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-2 focus:outline-none focus:ring-2"
            style={compactSelectStyle}
            disabled={loading}
        >
            <option value="">
                {loading
                    ? t("common.loading")
                    : t("blueprints.infobox.subtitle.property_placeholder")}
            </option>
            {Object.entries(groups).map(([groupName, groupOpts]) =>
                groupName ? (
                    <optgroup key={groupName} label={groupName}>
                        {groupOpts.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </optgroup>
                ) : (
                    groupOpts.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))
                ),
            )}
        </select>
    );
}

// Cache for blueprint fields by slug
const blueprintFieldsCache = new Map<string, BlueprintField[]>();

async function fetchBlueprintFieldsBySlug(
    slug: string,
): Promise<BlueprintField[]> {
    if (blueprintFieldsCache.has(slug)) {
        return blueprintFieldsCache.get(slug)!;
    }

    // Find blueprint ID by slug via the database schema endpoint
    const bpRes = await fetch(`/api/v1/blueprints/by-slug/${slug}/fields`, {
        headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
    });

    if (!bpRes.ok) return [];
    const fields = await bpRes.json();
    blueprintFieldsCache.set(slug, fields);
    return fields;
}

function getDefaultData(type: InfoboxBlock["type"]): Record<string, unknown> {
    switch (type) {
        case "header":
            return { text: "" };
        case "attribute":
            return { field_name: "", limit_enabled: false, visible_limit: 3 };
        case "relationships":
            return {
                target_blueprint_slug: "",
                direction: "both",
                limit_enabled: false,
                visible_limit: 5,
            };
        case "hierarchy":
            return { direction: "both", limit_enabled: true, visible_limit: 5 };
        case "mentioned_in":
            return {
                label: "First Appears",
                target_blueprint_slugs: ["work"],
                trace_parents: true,
                sort_by: "release_order",
                sort_direction: "asc",
                limit_enabled: true,
                visible_limit: 1,
            };
    }
}

function getBlockSummary(
    block: InfoboxBlock,
    fields: BlueprintField[],
    relationshipBlueprints: SiblingBlueprint[],
    t: Translator,
): string | null {
    switch (block.type) {
        case "header":
            return (block.data.text as string) || null;
        case "attribute": {
            const fieldName = block.data.field_name as string;
            const field = fields.find((f) => f.name === fieldName);
            return field ? field.label : fieldName || null;
        }
        case "relationships": {
            if (block.data.header_text) return block.data.header_text as string;
            const slug = block.data.target_blueprint_slug as string;
            const rb = relationshipBlueprints.find((b) => b.slug === slug);
            return rb ? rb.name : slug || null;
        }
        case "hierarchy": {
            const dir = (block.data.direction as string) ?? "both";
            return dir === "both"
                ? t("blueprints.infobox.summary.hierarchy.both")
                : dir === "parent"
                  ? t("blueprints.infobox.summary.hierarchy.parent")
                  : t("blueprints.infobox.summary.hierarchy.children");
        }
        case "mentioned_in": {
            return (
                (block.data.label as string) ||
                t("blueprints.infobox.block_type.mentioned_in.label")
            );
        }
    }
}
