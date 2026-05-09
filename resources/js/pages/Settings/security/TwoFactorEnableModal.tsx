import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import Button from '@alexandria/components/ui/Button';
import OtpField from '@alexandria/components/form/OtpField';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';
import useT, { type Translator } from '@alexandria/hooks/useT';
import PasswordConfirmStep from './PasswordConfirmStep';
import RecoveryCodesPanel from './RecoveryCodesPanel';
import {
    confirmTwoFactor,
    disableTwoFactor,
    enableTwoFactor,
    fetchRecoveryCodes,
} from './twoFactorApi';

interface TwoFactorEnableModalProps {
    open: boolean;
    onClose: () => void;
    /**
     * Setup-phase data from the parent's `twoFactor` prop. Populated
     * after `enableTwoFactor()` returns and a partial reload pulls
     * fresh props.
     */
    qrDataUrl: string | null;
    secret: string | null;
}

type EnableStep = 'password' | 'setup' | 'recovery';

/**
 * Three-step enable wizard.
 *
 *   1. **password** — Fortify's `password.confirm` middleware guards
 *      the enable endpoint, so the user has to confirm before the
 *      secret can be generated.
 *   2. **setup**    — POST /user/two-factor-authentication has run; QR
 *      + manual key are visible. User scans, types the 6-digit code,
 *      and POST /user/confirmed-two-factor-authentication finishes
 *      enrollment.
 *   3. **recovery** — newly minted codes shown ONCE with copy-all and
 *      an acknowledgment gate before Done.
 *
 * Closing the modal mid-setup (X / Esc / backdrop) DELETEs the
 * unconfirmed secret so the user lands back in the disabled phase
 * instead of a half-set-up zombie state.
 */
export default function TwoFactorEnableModal({
    open,
    onClose,
    qrDataUrl,
    secret,
}: TwoFactorEnableModalProps) {
    const t = useT();
    const toast = useToastContext();
    const [step, setStep] = useState<EnableStep>('password');
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [enabling, setEnabling] = useState(false);
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [acknowledged, setAcknowledged] = useState(false);

    // Reset internal state when the modal opens — covers the case
    // where a previous flow was abandoned and the user is starting
    // fresh.
    useEffect(() => {
        if (open) {
            setStep('password');
            setCode('');
            setCodeError(null);
            setRecoveryCodes([]);
            setAcknowledged(false);
            setEnabling(false);
            setConfirming(false);
        }
    }, [open]);

    async function handlePasswordSuccess() {
        setEnabling(true);
        const verdict = await enableTwoFactor();

        if (verdict !== 'ok') {
            setEnabling(false);
            toast.show(t('security.error.generic'), { type: 'danger' });
            return;
        }

        // Pull qr_data_url + secret into props, then advance to setup.
        router.reload({
            only: ['twoFactor'],
            onFinish: () => {
                setEnabling(false);
                setStep('setup');
            },
        });
    }

    async function handleConfirmCode() {
        if (code.length !== 6) return;
        setConfirming(true);
        setCodeError(null);

        const confirmVerdict = await confirmTwoFactor(code);

        if (confirmVerdict !== 'ok') {
            setConfirming(false);
            if (confirmVerdict === 'invalid_code') {
                setCodeError(t('security.error.confirm_invalid_code'));
                setCode('');
            } else {
                toast.show(t('security.error.generic'), { type: 'danger' });
            }
            return;
        }

        // Confirmation succeeded — pull recovery codes for the final step.
        const codes = await fetchRecoveryCodes();
        setConfirming(false);

        if (!codes) {
            // Confirmation went through, but we couldn't read the codes.
            // Don't block the user — close the modal, refresh the section,
            // and tell them they can regenerate.
            toast.show(t('security.error.generic'), { type: 'danger' });
            router.reload({ only: ['twoFactor'] });
            onClose();
            return;
        }

        setRecoveryCodes(codes);
        setStep('recovery');
    }

    async function handleClose() {
        if (step === 'setup' && !confirming) {
            // Aborting before confirmation — disable the unconfirmed
            // secret so the user lands back in the disabled phase.
            await disableTwoFactor();
            router.reload({ only: ['twoFactor'] });
        }
        onClose();
    }

    function handleDone() {
        // Recovery step — codes are already saved server-side, the
        // user has acknowledged. Refresh the section to flip into the
        // enabled phase + announce completion.
        toast.show(t('security.toast.enabled'), { type: 'success' });
        router.reload({ only: ['twoFactor'] });
        onClose();
    }

    const titles: Record<EnableStep, string> = {
        password: t('security.enable.modal_title'),
        setup: t('security.enable.setup_title'),
        recovery: t('security.enable.recovery_title'),
    };

    return (
        <Modal open={open} onClose={handleClose} maxWidth="max-w-xl">
            <ModalHeader title={titles[step]} onClose={handleClose} />

            {step === 'password' && (
                <PasswordConfirmStep
                    t={t}
                    intro={t('security.enable.password_intro')}
                    submitLabel={
                        enabling
                            ? t('common.loading')
                            : t('security.enable.password_submit')
                    }
                    onSuccess={handlePasswordSuccess}
                    onCancel={handleClose}
                />
            )}

            {step === 'setup' && (
                <SetupStep
                    t={t}
                    qrDataUrl={qrDataUrl}
                    secret={secret}
                    code={code}
                    codeError={codeError}
                    confirming={confirming}
                    onCodeChange={(v) => {
                        setCode(v);
                        setCodeError(null);
                    }}
                    onConfirm={handleConfirmCode}
                    onCancel={handleClose}
                />
            )}

            {step === 'recovery' && (
                <RecoveryCodesPanel
                    t={t}
                    codes={recoveryCodes}
                    acknowledged={acknowledged}
                    onAcknowledgeChange={setAcknowledged}
                    onDone={handleDone}
                    doneLabel={t('security.enable.done_button')}
                />
            )}
        </Modal>
    );
}

function SetupStep({
    t,
    qrDataUrl,
    secret,
    code,
    codeError,
    confirming,
    onCodeChange,
    onConfirm,
    onCancel,
}: {
    t: Translator;
    qrDataUrl: string | null;
    secret: string | null;
    code: string;
    codeError: string | null;
    confirming: boolean;
    onCodeChange: (v: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const fadedTextStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    };
    const labelStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    };
    const secretChipStyle = {
        background: 'var(--theme-base-page)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };

    return (
        <div className="space-y-5 p-6">
            <p className="text-sm" style={fadedTextStyle}>
                {t('security.enable.setup_intro')}
            </p>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr]">
                {qrDataUrl && (
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs" style={labelStyle}>
                            {t('security.enable.scan_label')}
                        </span>
                        <div
                            className="p-3"
                            style={{
                                background: 'white',
                                borderRadius: 'var(--theme-radius-card)',
                                border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                            }}
                        >
                            <img
                                src={qrDataUrl}
                                alt={t('security.enable.scan_label')}
                                width={160}
                                height={160}
                            />
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {secret && (
                        <div className="space-y-1">
                            <span className="text-xs" style={labelStyle}>
                                {t('security.enable.manual_label')}
                            </span>
                            <code
                                className="block break-all px-3 py-2 font-mono text-sm"
                                style={secretChipStyle}
                            >
                                {secret}
                            </code>
                        </div>
                    )}

                    <div className="space-y-1">
                        <span className="text-xs" style={labelStyle}>
                            {t('security.enable.code_label')}
                        </span>
                        <OtpField
                            id="two-factor-confirm-code"
                            name="code"
                            length={6}
                            numeric
                            value={code}
                            onChange={onCodeChange}
                            autoFocus
                        />
                        {codeError && (
                            <p
                                className="mt-1 text-xs"
                                style={{ color: 'var(--theme-status-error-stroke)' }}
                            >
                                {codeError}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onCancel}>
                    {t('common.cancel')}
                </Button>
                <Button
                    variant="primary"
                    onClick={onConfirm}
                    loading={confirming}
                    disabled={code.length !== 6}
                >
                    {t('security.enable.confirm_button')}
                </Button>
            </div>
        </div>
    );
}
