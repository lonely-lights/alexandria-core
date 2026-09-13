import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';
import { useState } from 'react';
import ThreadDetailModal from './ThreadDetailModal';
import type { ThreadDetailModalProps } from './ThreadDetailModal';

type Props = Omit<ThreadDetailModalProps, 'threadId'> & {
    threads: Array<{ id: number; title: string }>;
};

/** Overlapping annotations remain individually reachable from the same words. */
export default function ThreadHighlightDetails({ threads, ...props }: Props) {
    const t = useT();
    const [selected, setSelected] = useState<number | null>(
        threads.length === 1 ? threads[0].id : null,
    );

    if (selected !== null) {
        return <ThreadDetailModal {...props} threadId={selected} />;
    }

    return (
        <Modal open onClose={props.onClose}>
            <ModalHeader
                title={t('writing.threads.highlight_choose')}
                onClose={props.onClose}
            />
            <div className="flex flex-col gap-1 p-3">
                {threads.map((thread) => (
                    <button
                        key={thread.id}
                        type="button"
                        className="alex-row rounded px-3 py-2 text-left"
                        onClick={() => setSelected(thread.id)}
                    >
                        {thread.title}
                    </button>
                ))}
            </div>
        </Modal>
    );
}
