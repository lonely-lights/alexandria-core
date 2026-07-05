import { useState } from 'react';

import Button from '@alexandria/components/ui/Button';
import Select from '@alexandria/components/form/Select';
import Modal, { ModalFooter, ModalHeader } from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';

import type { SectionNode } from '../Workspace';

/**
 * "Move to…" parent picker — Stage 11 Slice 1. The accessible /
 * deep-tree alternative to cross-parent drag. Options are every
 * section except the moving node's own subtree, plus top level; the
 * move appends at the end of the chosen parent's children.
 *
 * projectSlug / workSlug are intentionally absent: the onMove callback
 * owns the router.put call and already has those values in its closure.
 */
export default function MoveSectionModal({
    section,
    sections,
    onMove,
    onClose,
}: {
    section: SectionNode;
    sections: SectionNode[];
    onMove: (sectionId: number, toParentId: number | null, position: number) => void;
    onClose: () => void;
}) {
    const t = useT();

    // SectionNode has no parent_id field — always default to root.
    const [parentId, setParentId] = useState<string>('root');

    interface PickerOption {
        id: number;
        title: string;
        depth: number;
        childCount: number;
    }

    const pickerOptions: PickerOption[] = [];
    const collect = (nodes: SectionNode[], depth: number) => {
        for (const node of nodes) {
            if (node.id === section.id) continue; // self + subtree excluded
            pickerOptions.push({ id: node.id, title: node.title, depth, childCount: node.children.length });
            collect(node.children, depth + 1);
        }
    };
    collect(sections, 0);

    function submit() {
        const toParentId = parentId === 'root' ? null : Number(parentId);
        const position =
            toParentId === null
                ? sections.length
                : (pickerOptions.find((o) => o.id === toParentId)?.childCount ?? 0);
        onMove(section.id, toParentId, position);
        onClose();
    }

    const selectOptions = [
        { value: 'root', label: t('writing.workspace.move_top_level') },
        ...pickerOptions.map((o) => ({
            value: String(o.id),
            label: (o.depth > 0 ? '—'.repeat(o.depth) + ' ' : '') + o.title,
        })),
    ];

    return (
        <Modal open onClose={onClose} maxWidth="max-w-md">
            <ModalHeader title={t('writing.workspace.move_section')} onClose={onClose} />
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
            >
                <div className="grid gap-2 px-6 py-5">
                    <Select
                        id="move-section-parent"
                        name="parent_id"
                        label={t('writing.workspace.move_target_label')}
                        value={parentId}
                        onChange={(e) => setParentId(e.target.value)}
                        options={selectOptions}
                    />
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={onClose}>
                        {t('writing.form.cancel')}
                    </Button>
                    <Button type="submit">{t('writing.workspace.move_confirm')}</Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
