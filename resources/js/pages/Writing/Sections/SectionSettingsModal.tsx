import Button from '@alexandria/components/ui/Button';
import Toggle from '@alexandria/components/form/Toggle';
import Modal, { ModalFooter, ModalHeader } from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';

interface SectionSettingsModalProps {
    open: boolean;
    showSectionTypeLabels: boolean;
    saving: boolean;
    error: string | null;
    onShowSectionTypeLabelsChange: (value: boolean) => void;
    onClose: () => void;
}

export default function SectionSettingsModal({
    open,
    showSectionTypeLabels,
    saving,
    error,
    onShowSectionTypeLabelsChange,
    onClose,
}: SectionSettingsModalProps) {
    const t = useT();

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-md">
            <ModalHeader title={t('writing.workspace.section_settings')} onClose={onClose} />
            <div className="grid gap-3 px-6 py-4">
                <Toggle
                    label={t('writing.workspace.show_section_type_labels')}
                    description={t('writing.workspace.show_section_type_labels_description')}
                    checked={showSectionTypeLabels}
                    disabled={saving}
                    onChange={onShowSectionTypeLabelsChange}
                />
                {error !== null && (
                    <p className="text-xs" role="alert" style={{ color: 'var(--theme-status-danger-fill)' }}>
                        {error}
                    </p>
                )}
            </div>
            <ModalFooter>
                <Button type="button" variant="secondary" onClick={onClose}>
                    {t('common.close')}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
