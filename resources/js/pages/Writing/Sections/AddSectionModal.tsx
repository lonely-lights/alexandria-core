import { useForm } from '@inertiajs/react';

import useT from '@alexandria/hooks/useT';
import Button from '@alexandria/components/ui/Button';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';
import Input from '@alexandria/components/form/Input';
import { worksBase } from '@alexandria/lib/urls';

/**
 * Add-section modal — Stage 8g.1 (lifted out of Navigator in Ribbon
 * Plan 2 Task 3). The Workspace owns the trigger state (`addTarget`)
 * so the Navigator's hover affordances and the ribbon's Structure-tab
 * buttons converge on one modal. `parentId: null` creates a root
 * section; a number nests under that section.
 */
export default function AddSectionModal({
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
        form.post(`${worksBase(projectSlug, workSlug)}/sections`, {
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
