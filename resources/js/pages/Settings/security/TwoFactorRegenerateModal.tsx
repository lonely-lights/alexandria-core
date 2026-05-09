import { useEffect, useState } from 'react';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';
import useT from '@alexandria/hooks/useT';
import PasswordConfirmStep from './PasswordConfirmStep';
import RecoveryCodesPanel from './RecoveryCodesPanel';
import { fetchRecoveryCodes, regenerateRecoveryCodes } from './twoFactorApi';

interface TwoFactorRegenerateModalProps {
    open: boolean;
    onClose: () => void;
}

type RegenerateStep = 'password' | 'recovery';

/**
 * Two-step regenerate wizard.
 *
 *   1. **password** — confirm before invalidating the existing codes.
 *   2. **recovery** — display the freshly minted codes ONCE with
 *      copy-all + acknowledgment gate.
 *
 * The previous codes are invalidated server-side the moment Fortify
 * rotates them — closing the modal mid-flow is fine; the new codes
 * just become unrecoverable until the next regenerate.
 */
export default function TwoFactorRegenerateModal({
    open,
    onClose,
}: TwoFactorRegenerateModalProps) {
    const t = useT();
    const toast = useToastContext();
    const [step, setStep] = useState<RegenerateStep>('password');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [acknowledged, setAcknowledged] = useState(false);

    useEffect(() => {
        if (open) {
            setStep('password');
            setRecoveryCodes([]);
            setAcknowledged(false);
        }
    }, [open]);

    async function handlePasswordSuccess() {
        const verdict = await regenerateRecoveryCodes();

        if (verdict !== 'ok') {
            toast.show(t('security.error.generic'), { type: 'danger' });
            return;
        }

        const codes = await fetchRecoveryCodes();

        if (!codes) {
            toast.show(t('security.error.generic'), { type: 'danger' });
            onClose();
            return;
        }

        setRecoveryCodes(codes);
        setStep('recovery');
    }

    function handleDone() {
        toast.show(t('security.toast.codes_regenerated'), { type: 'success' });
        onClose();
    }

    const titles: Record<RegenerateStep, string> = {
        password: t('security.regenerate.modal_title'),
        recovery: t('security.regenerate.recovery_title'),
    };

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-xl">
            <ModalHeader title={titles[step]} onClose={onClose} />

            {step === 'password' && (
                <PasswordConfirmStep
                    t={t}
                    intro={t('security.regenerate.password_intro')}
                    submitLabel={t('security.regenerate.password_submit')}
                    onSuccess={handlePasswordSuccess}
                    onCancel={onClose}
                />
            )}

            {step === 'recovery' && (
                <RecoveryCodesPanel
                    t={t}
                    codes={recoveryCodes}
                    acknowledged={acknowledged}
                    onAcknowledgeChange={setAcknowledged}
                    onDone={handleDone}
                />
            )}
        </Modal>
    );
}
