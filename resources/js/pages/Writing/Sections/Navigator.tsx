import { router, useForm } from '@inertiajs/react';
import { useState, type CSSProperties } from 'react';

import useT, { type Translator } from '@alexandria/hooks/useT';
import Button from '@alexandria/components/ui/Button';
import ConfirmModal from '@alexandria/components/ui/ConfirmModal';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';
import Input from '@alexandria/components/form/Input';

import type { SectionNode } from '../Workspace';

/**
 * Workspace section Navigator — Stage 8g.1 (Plan 2 Task 6).
 *
 * Recursive section tree with expand/collapse, selection, and (when
 * the viewer can update the work) add-child / delete hover actions
 * plus a root-level add button. Mutations POST/DELETE through Inertia;
 * the server sends fresh `sections` props back, so no manual tree
 * state sync is needed — the expanded set keys off ids and tolerates
 * stale entries.
 */

interface NavigatorProps {
    projectSlug: string;
    workSlug: string;
    sections: SectionNode[];
    currentSlug: string | null;
    canUpdate: boolean;
    onSelect: (slug: string) => void;
    /** Autosave-confirmed word counts (by section id) overlaying the prop tree. */
    liveCounts?: Record<number, number>;
}

/* ── Theme styles ── */

const selectedRowStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)',
    color: 'var(--theme-brand-primary-500)',
};

const chevronStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const leafDotStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
};

const labelChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    lineHeight: 1.6,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
};

const wordCountStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
};

const hoverActionStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

/** Collect the ids of every node that has children (default-expanded set). */
function collectParentIds(nodes: SectionNode[], into: Set<number>): Set<number> {
    for (const node of nodes) {
        if (node.children.length > 0) {
            into.add(node.id);
            collectParentIds(node.children, into);
        }
    }
    return into;
}

export default function Navigator({
    projectSlug,
    workSlug,
    sections,
    currentSlug,
    canUpdate,
    onSelect,
    liveCounts,
}: NavigatorProps) {
    const t = useT();
    const [expanded, setExpanded] = useState<Set<number>>(
        () => collectParentIds(sections, new Set()),
    );
    const [addTarget, setAddTarget] = useState<{ parentId: number | null } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SectionNode | null>(null);
    const [deleting, setDeleting] = useState(false);

    function toggle(id: number) {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function openAddChild(node: SectionNode) {
        // Pre-expand the parent so the new child is visible when the
        // fresh tree comes back.
        setExpanded((prev) => new Set(prev).add(node.id));
        setAddTarget({ parentId: node.id });
    }

    function confirmDelete() {
        if (deleteTarget === null) {
            return;
        }

        router.delete(`/works/${projectSlug}/${workSlug}/sections/${deleteTarget.id}`, {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    }

    return (
        <div className="flex flex-col gap-0.5 p-2">
            {sections.map((node) => (
                <NavigatorRow
                    key={node.id}
                    node={node}
                    depth={0}
                    currentSlug={currentSlug}
                    expanded={expanded}
                    canUpdate={canUpdate}
                    onSelect={onSelect}
                    onToggle={toggle}
                    onAddChild={openAddChild}
                    onDelete={setDeleteTarget}
                    liveCounts={liveCounts}
                    t={t}
                />
            ))}

            {canUpdate && (
                <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    icon="fa-solid fa-plus"
                    iconPosition="before"
                    className="mt-2"
                    onClick={() => setAddTarget({ parentId: null })}
                >
                    {t('writing.workspace.add_section')}
                </Button>
            )}

            {addTarget !== null && (
                <AddSectionModal
                    projectSlug={projectSlug}
                    workSlug={workSlug}
                    parentId={addTarget.parentId}
                    onClose={() => setAddTarget(null)}
                />
            )}

            <ConfirmModal
                open={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title={t('writing.workspace.delete_confirm_title')}
                message={t('writing.workspace.delete_confirm_body')}
                confirmLabel={t('writing.workspace.delete_confirm_action')}
                variant="danger"
                loading={deleting}
            />
        </div>
    );
}

function NavigatorRow({
    node,
    depth,
    currentSlug,
    expanded,
    canUpdate,
    onSelect,
    onToggle,
    onAddChild,
    onDelete,
    liveCounts,
    t,
}: {
    node: SectionNode;
    depth: number;
    currentSlug: string | null;
    expanded: Set<number>;
    canUpdate: boolean;
    onSelect: (slug: string) => void;
    onToggle: (id: number) => void;
    onAddChild: (node: SectionNode) => void;
    onDelete: (node: SectionNode) => void;
    liveCounts?: Record<number, number>;
    t: Translator;
}) {
    const isSelected = node.slug === currentSlug;
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const wordCount = liveCounts?.[node.id] ?? node.word_count;

    return (
        <>
            <div
                className="alex-row group flex cursor-pointer items-center gap-1 py-1 pr-2 text-sm"
                style={{
                    paddingLeft: `${depth * 18 + 8}px`,
                    borderRadius: 'var(--theme-radius-button)',
                    ...(isSelected ? selectedRowStyle : {}),
                }}
                onClick={() => onSelect(node.slug)}
            >
                {/* Expand/collapse chevron (leaf nodes render a dot) */}
                <button
                    type="button"
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren) {
                            onToggle(node.id);
                        }
                    }}
                    tabIndex={hasChildren ? 0 : -1}
                    aria-hidden={!hasChildren}
                >
                    {hasChildren ? (
                        <i
                            className={`fa-solid fa-chevron-right text-[9px] transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                            style={chevronStyle}
                        />
                    ) : (
                        <span className="h-1 w-1 rounded-full" style={leafDotStyle} />
                    )}
                </button>

                {node.label && (
                    <span className="flex-shrink-0" style={labelChipStyle}>
                        {node.label}
                    </span>
                )}

                <span className={`min-w-0 flex-1 truncate ${isSelected ? 'font-medium' : ''}`}>
                    {node.title}
                </span>

                {/* Hover actions */}
                {canUpdate && (
                    <span className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <button
                            type="button"
                            className="flex h-5 w-5 items-center justify-center"
                            style={hoverActionStyle}
                            title={t('writing.workspace.add_child')}
                            aria-label={t('writing.workspace.add_child')}
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddChild(node);
                            }}
                        >
                            <i className="fa-solid fa-plus text-[10px]" />
                        </button>
                        <button
                            type="button"
                            className="flex h-5 w-5 items-center justify-center"
                            style={hoverActionStyle}
                            title={t('writing.workspace.delete_section')}
                            aria-label={t('writing.workspace.delete_section')}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(node);
                            }}
                        >
                            <i className="fa-solid fa-trash text-[10px]" />
                        </button>
                    </span>
                )}

                {wordCount > 0 && (
                    <span
                        className="flex-shrink-0 text-[11px] tabular-nums"
                        style={wordCountStyle}
                    >
                        {wordCount.toLocaleString()}
                    </span>
                )}
            </div>

            {hasChildren && isExpanded && node.children.map((child) => (
                <NavigatorRow
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    currentSlug={currentSlug}
                    expanded={expanded}
                    canUpdate={canUpdate}
                    onSelect={onSelect}
                    onToggle={onToggle}
                    onAddChild={onAddChild}
                    onDelete={onDelete}
                    liveCounts={liveCounts}
                    t={t}
                />
            ))}
        </>
    );
}

function AddSectionModal({
    projectSlug,
    workSlug,
    parentId,
    onClose,
}: {
    projectSlug: string;
    workSlug: string;
    parentId: number | null;
    onClose: () => void;
}) {
    const t = useT();
    const form = useForm<{ title: string; label: string; parent_id: number | null }>({
        title: '',
        label: '',
        parent_id: parentId,
    });

    function submit() {
        form.post(`/works/${projectSlug}/${workSlug}/sections`, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        });
    }

    return (
        <Modal open onClose={onClose} maxWidth="max-w-md">
            <ModalHeader
                title={
                    parentId === null
                        ? t('writing.workspace.add_section')
                        : t('writing.workspace.add_child')
                }
                onClose={onClose}
            />
            {/* noValidate: server-side validation owns the error UI. */}
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
            >
                <div className="flex flex-col gap-4 px-6 py-5">
                    <Input
                        label={t('writing.workspace.section_title_placeholder')}
                        name="title"
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                        error={form.errors.title}
                        autoFocus
                        required
                        size="md"
                    />
                    <Input
                        label={t('writing.workspace.section_label')}
                        name="label"
                        value={form.data.label}
                        onChange={(e) => form.setData('label', e.target.value)}
                        error={form.errors.label}
                        size="md"
                    />
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={onClose}>
                        {t('writing.form.cancel')}
                    </Button>
                    <Button type="submit" loading={form.processing}>
                        {t('writing.form.create')}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
