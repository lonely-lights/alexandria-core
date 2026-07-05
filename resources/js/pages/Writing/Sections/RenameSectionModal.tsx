import { router, useForm } from '@inertiajs/react';

import Button from '@alexandria/components/ui/Button';
import Input from '@alexandria/components/form/Input';
import Modal, { ModalFooter, ModalHeader } from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';

import type { SectionNode } from '../Workspace';

export default function RenameSectionModal({
    projectSlug,
    workSlug,
    section,
    onClose,
}: {
    projectSlug: string;
    workSlug: string;
    section: SectionNode;
    onClose: () => void;
}) {
    const t = useT();
    const form = useForm<{ title: string }>({
        title: section.title,
    });

    function submit() {
        form.put(`/works/${projectSlug}/${workSlug}/sections/${section.id}`, {
            preserveScroll: true,
            preserveState: true,
            only: ['sections', 'currentSection'],
            onSuccess: (page) => {
                const fresh = (page.props as {
                    currentSection?: { id: number; slug: string } | null;
                }).currentSection;

                // The rename regenerated the slug server-side; if the renamed
                // section is the one that's open, sync the address bar with a
                // client-side replace (no server round-trip, no editor remount).
                if (
                    fresh &&
                    fresh.id === section.id &&
                    !window.location.pathname.endsWith(`/${fresh.slug}`)
                ) {
                    router.replace({
                        url: `/works/${projectSlug}/${workSlug}/${fresh.slug}`,
                    });
                }

                onClose();
            },
        });
    }

    return (
        <Modal open onClose={onClose} maxWidth="max-w-md">
            <ModalHeader title={t('writing.workspace.rename_section')} onClose={onClose} />
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
            >
                <div className="px-6 py-5">
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
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={onClose}>
                        {t('writing.form.cancel')}
                    </Button>
                    <Button type="submit" loading={form.processing}>
                        {t('writing.settings.save')}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
