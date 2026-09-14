import { router } from '@inertiajs/react';
import { useContext, useEffect, useState } from 'react';

import PickerDropdown from '@alexandria/components/ui/PickerDropdown';
import Button from '@alexandria/components/ui/Button';
import Modal, { ModalFooter, ModalHeader } from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';
import { worksBase } from '@alexandria/lib/urls';

import type { SectionNode } from '../Workspace';
import { WritingSaveContext } from './WritingSaveContext';

interface TargetWork {
    id: number;
    title: string;
    format: string;
}
interface TargetSection {
    id: number;
    parent_id: number | null;
    title: string;
    depth: number;
}

export default function TransferSectionModal({
    section,
    projectSlug,
    workSlug,
    onClose,
}: {
    section: SectionNode;
    projectSlug: string;
    workSlug: string;
    onClose: () => void;
}) {
    const t = useT();
    const saves = useContext(WritingSaveContext);
    const base = `${worksBase(projectSlug, workSlug)}/sections/${section.id}/transfer`;
    const [works, setWorks] = useState<TargetWork[] | null>(null);
    const [sections, setSections] = useState<TargetSection[] | null>(null);
    const [workId, setWorkId] = useState('');
    const [parentId, setParentId] = useState('root');
    const [beforeId, setBeforeId] = useState('end');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        fetch(`${base}/targets${workId ? `/${workId}` : ''}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('load');
                }

                const data = (await response.json()) as { works?: TargetWork[]; sections?: TargetSection[] };

                if (controller.signal.aborted) {
                    return;
                }

                if (workId) {
                    setSections(data.sections ?? []);
                } else {
                    setWorks(data.works ?? []);
                }

                setError(null);
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setError(t('writing.transfer.load_failed'));
                }
            });

        return () => controller.abort();
    }, [base, workId, retry, t]);

    const siblings = (sections ?? []).filter(
        (node) => node.parent_id === (parentId === 'root' ? null : Number(parentId)),
    );
    const close = () => {
        if (!busy) {
            onClose();
        }
    };

    async function submit() {
        if (busy || !workId || sections === null) {
            return;
        }

        setBusy(true);
        setError(null);

        try {
            const saved = await saves?.flush();

            if (saved?.some((success) => !success) || saves?.hasUnsaved) {
                setError(t('writing.transfer.save_failed'));
                setBusy(false);

                return;
            }
        } catch {
            setError(t('writing.transfer.save_failed'));
            setBusy(false);

            return;
        }

        router.put(
            base,
            {
                work_id: Number(workId),
                parent_id: parentId === 'root' ? null : Number(parentId),
                position:
                    beforeId === 'end'
                        ? siblings.length
                        : Math.max(
                              0,
                              siblings.findIndex((node) => String(node.id) === beforeId),
                          ),
            },
            {
                preserveState: 'errors',
                onError: (errors) => setError(Object.values(errors)[0] ?? t('writing.transfer.failed')),
                onFinish: () => setBusy(false),
            },
        );
    }

    return (
        <Modal open onClose={close} dismissible={!busy} maxWidth="max-w-lg">
            <div data-transfer-section>
                <ModalHeader title={t('writing.transfer.title')} onClose={close} />
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        void submit();
                    }}
                >
                    <div className="grid gap-4 px-6 py-5">
                        <p className="text-sm font-semibold">{section.title}</p>
                        <p className="text-xs leading-relaxed opacity-65">{t('writing.transfer.help')}</p>
                        {works === null ? (
                            <p role="status" className="text-xs">
                                {t('writing.flow.loading')}
                            </p>
                        ) : works.length === 0 ? (
                            <p role="status" className="text-sm">
                                {t('writing.transfer.empty')}
                            </p>
                        ) : (
                            <div>
                                <p className="mb-1.5 text-xs opacity-60">{t('writing.transfer.work')}</p>
                                <PickerDropdown
                                    fullWidth
                                    dataAttributes={{ 'data-transfer-picker': 'destination_work' }}
                                    ariaLabel={t('writing.transfer.work')}
                                    value={workId}
                                    disabled={busy}
                                    onChange={(value) => {
                                        setWorkId(value);
                                        setSections(null);
                                        setParentId('root');
                                        setBeforeId('end');
                                        setError(null);
                                    }}
                                    options={[
                                        { value: '', label: t('writing.transfer.choose_work') },
                                        ...works.map((work) => ({ value: String(work.id), label: work.title })),
                                    ]}
                                />
                            </div>
                        )}
                        {workId &&
                            (sections === null ? (
                                <p role="status" className="text-xs">
                                    {t('writing.flow.loading')}
                                </p>
                            ) : (
                                <>
                                    <div>
                                        <p className="mb-1.5 text-xs opacity-60">
                                            {t('writing.workspace.move_target_label')}
                                        </p>
                                        <PickerDropdown
                                            fullWidth
                                            dataAttributes={{ 'data-transfer-picker': 'destination_parent' }}
                                            ariaLabel={t('writing.workspace.move_target_label')}
                                            value={parentId}
                                            disabled={busy}
                                            onChange={(value) => {
                                                setParentId(value);
                                                setBeforeId('end');
                                            }}
                                            options={[
                                                { value: 'root', label: t('writing.workspace.move_top_level') },
                                                ...sections.map((node) => ({
                                                    value: String(node.id),
                                                    label:
                                                        '  '.repeat(node.depth) + (node.depth ? '↳ ' : '') + node.title,
                                                })),
                                            ]}
                                        />
                                    </div>
                                    <div>
                                        <p className="mb-1.5 text-xs opacity-60">{t('writing.transfer.position')}</p>
                                        <PickerDropdown
                                            fullWidth
                                            dataAttributes={{ 'data-transfer-picker': 'destination_position' }}
                                            ariaLabel={t('writing.transfer.position')}
                                            value={beforeId}
                                            disabled={busy}
                                            onChange={setBeforeId}
                                            options={[
                                                { value: 'end', label: t('writing.transfer.at_end') },
                                                ...siblings.map((node) => ({
                                                    value: String(node.id),
                                                    label: t('writing.transfer.before').replace(':title', node.title),
                                                })),
                                            ]}
                                        />
                                    </div>
                                </>
                            ))}
                        {error && (
                            <div role="alert" className="text-sm">
                                <p>{error}</p>
                                <Button variant="ghost" disabled={busy} onClick={() => setRetry((value) => value + 1)}>
                                    {t('writing.transfer.retry')}
                                </Button>
                            </div>
                        )}
                    </div>
                    <ModalFooter>
                        <Button variant="ghost" disabled={busy} onClick={close}>
                            {t('writing.form.cancel')}
                        </Button>
                        <Button type="submit" disabled={busy || !workId || sections === null}>
                            {t(busy ? 'writing.transfer.moving' : 'writing.transfer.confirm')}
                        </Button>
                    </ModalFooter>
                </form>
            </div>
        </Modal>
    );
}
