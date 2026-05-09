import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import Button from '@alexandria/components/ui/Button';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';
import useT from '@alexandria/hooks/useT';
import PasswordConfirmStep from './PasswordConfirmStep';
import { disableTwoFactor } from './twoFactorApi';

interface TwoFactorDisableModalProps {
    open: boolean;
    onClose: () => void;
}

type DisableStep = 'password' | 'confirm';

/**
 * Two-step disable wizard.
 *
 *   1. **password** — confirm before tearing down the second factor.
 *   2. **confirm**  — explicit "are you sure?" with a warning, since
 *      disabling 2FA materially weakens account security and should
 *      not happen by accident.
 */
export default function TwoFactorDisableModal({
    open,
    onClose,
}: TwoFactorDisableModalProps) {
    const t = useT();
    const toast = useToastContext();
    const [step, setStep] = useState<DisableStep>('password');
    const [disabling, setDisabling] = useState(false);

    useEffect(() => {
        if (open) {
            setStep('password');
            setDisabling(false);
        }
    }, [open]);

    async function handleConfirmDisable() {
        setDisabling(true);
        const verdict = await disableTwoFactor();

        if (verdict !== 'ok') {
            setDisabling(false);
            toast.show(t('security.error.generic'), { type: 'danger' });
            return;
        }

        toast.show(t('security.toast.disabled'), { type: 'success' });
        router.reload({ only: ['twoFactor'] });
        onClose();
    }

    const titles: Record<DisableStep, string> = {
        password: t('security.disable.modal_title'),
        confirm: t('security.disable.confirm_title'),
    };

    const warningStyle = {
        background: 'var(--theme-base-surface)',
        color: 'var(--theme-base-content)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
        borderInlineStartWidth: '4px',
        borderInlineStartColor: 'var(--theme-status-warning-fill)',
        borderRadius: 'var(--theme-radius-card)',
    };

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-md">
            <ModalHeader title={titles[step]} onClose={onClose} />

            {step === 'password' && (
                <PasswordConfirmStep
                    t={t}
                    intro={t('security.disable.password_intro')}
                    submitLabel={t('security.disable.password_submit')}
                    onSuccess={() => setStep('confirm')}
                    onCancel={onClose}
                />
            )}

            {step === 'confirm' && (
                <div className="space-y-4 p-6">
                    <div className="flex items-start gap-2 px-3 py-2 text-sm" style={warningStyle}>
                        <i
                            className="fa-solid fa-triangle-exclamation mt-0.5 flex-shrink-0"
                            style={{ color: 'var(--theme-status-warning-fill)' }}
                            aria-hidden="true"
                        />
                        <span>{t('security.disable.confirm_warning')}</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleConfirmDisable}
                            loading={disabling}
                            icon="fa-solid fa-shield-slash"
                            iconPosition="before"
                        >
                            {t('security.disable.confirm_button')}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
