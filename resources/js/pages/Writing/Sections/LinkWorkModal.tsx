import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';
import Button from '@alexandria/components/ui/Button';

import type { StructureNode } from './StructureTree';
import type { WorkRow } from './WorkCard';

/**
 * LinkWorkModal — compendium-structure-tab (Task 10).
 *
 * Small picker listing the project's unlinked works (works with no
 * `entry_id` yet) so a viewer can attach one to a structure-tree node
 * in one click. Opened from `StructureTree`'s "+ Link work" row
 * affordance; the caller owns the fetch/mutation and closes the modal
 * on pick.
 */

interface LinkWorkModalProps {
    node: StructureNode;
    works: WorkRow[];
    onPick: (workSlug: string) => void;
    onClose: () => void;
}

/* ── Theme styles ── */

const emptyStateStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const typeStyle: CSSProperties = {
    color: 'var(--theme-brand-primary-500)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontWeight: 600,
};

export default function LinkWorkModal({ node, works, onPick, onClose }: LinkWorkModalProps) {
    const t = useT();
    const unlinkedWorks = works.filter((work) => work.entry_id == null);

    return (
        <Modal open onClose={onClose} maxWidth="max-w-md">
            <ModalHeader
                title={t('writing.structure.pick_work_title').replace(':entry', node.name)}
                onClose={onClose}
            />
            <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto px-6 py-4">
                {unlinkedWorks.length === 0 ? (
                    <p className="px-1 py-4 text-center text-sm italic" style={emptyStateStyle}>
                        {t('writing.structure.no_unlinked_works')}
                    </p>
                ) : (
                    unlinkedWorks.map((work) => (
                        <button
                            key={work.id}
                            type="button"
                            className="alex-row flex items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                            style={{ borderRadius: 'var(--theme-radius-button)' }}
                            onClick={() => onPick(work.slug)}
                        >
                            <span className="min-w-0 flex-1 truncate font-medium">{work.title}</span>
                            <span className="shrink-0 text-[11px]" style={typeStyle}>
                                {t(`writing.types.${work.type}`, work.type)}
                            </span>
                        </button>
                    ))
                )}
            </div>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose}>
                    {t('writing.form.cancel')}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
