import { useState } from 'react';
import { router } from '@inertiajs/react';
import Button from '@alexandria/components/ui/Button';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';
import useT, { type Translator } from '@alexandria/hooks/useT';
import TwoFactorEnableModal from '../security/TwoFactorEnableModal';
import TwoFactorRegenerateModal from '../security/TwoFactorRegenerateModal';
import TwoFactorDisableModal from '../security/TwoFactorDisableModal';
import PasswordConfirmStep from '../security/PasswordConfirmStep';
import { disableTwoFactor } from '../security/twoFactorApi';

/**
 * Security tab — orchestrates the three Fortify-driven 2FA wizards.
 *
 * Steady-state UI is intentionally thin (banner + Enable / Regenerate /
 * Disable buttons). Every state-changing action runs inside its own
 * modal wizard:
 *
 *   - **TwoFactorEnableModal**     — password → setup → recovery codes
 *   - **TwoFactorRegenerateModal** — password → recovery codes
 *   - **TwoFactorDisableModal**    — password → confirm
 *
 * Recovery codes never appear in the steady-state surface — they're
 * displayed once (during enroll or regenerate) with an acknowledgment
 * gate, then locked behind regenerate.
 */
interface SecuritySectionProps {
    twoFactor: {
        enabled: boolean;
        confirmed: boolean;
        qr_data_url: string | null;
        secret: string | null;
    };
}

export default function SecuritySection({ twoFactor }: SecuritySectionProps) {
    const t = useT();
    const toast = useToastContext();

    const [enableOpen, setEnableOpen] = useState(false);
    const [regenerateOpen, setRegenerateOpen] = useState(false);
    const [disableOpen, setDisableOpen] = useState(false);
    const [cancelSetupOpen, setCancelSetupOpen] = useState(false);

    // State machine: derive once per render.
    const phase: 'disabled' | 'setup-pending' | 'enabled' =
        !twoFactor.enabled
            ? 'disabled'
            : twoFactor.confirmed
                ? 'enabled'
                : 'setup-pending';

    return (
        <div className="space-y-6">
            <h3 className="font-serif text-2xl font-bold leading-tight">
                {t('security.two_factor.heading')}
            </h3>

            {phase === 'disabled' && (
                <DisabledPanel t={t} onEnable={() => setEnableOpen(true)} />
            )}

            {phase === 'setup-pending' && (
                <SetupPendingPanel
                    t={t}
                    onResume={() => setEnableOpen(true)}
                    onCancel={() => setCancelSetupOpen(true)}
                />
            )}

            {phase === 'enabled' && (
                <EnabledPanel
                    t={t}
                    onRegenerate={() => setRegenerateOpen(true)}
                    onDisable={() => setDisableOpen(true)}
                />
            )}

            <TwoFactorEnableModal
                open={enableOpen}
                onClose={() => setEnableOpen(false)}
                qrDataUrl={twoFactor.qr_data_url}
                secret={twoFactor.secret}
            />
            <TwoFactorRegenerateModal
                open={regenerateOpen}
                onClose={() => setRegenerateOpen(false)}
            />
            <TwoFactorDisableModal
                open={disableOpen}
                onClose={() => setDisableOpen(false)}
            />
            <CancelSetupModal
                open={cancelSetupOpen}
                onClose={() => setCancelSetupOpen(false)}
                t={t}
                toast={toast}
            />
        </div>
    );
}

/**
 * Password-gated cancel for an abandoned enrollment. The DELETE route
 * sits behind password.confirm, so a direct call from the steady state
 * always 423s on a fresh session — the cancel must confirm the password
 * first, like every other 2FA wizard.
 */
function CancelSetupModal({
    open,
    onClose,
    t,
    toast,
}: {
    open: boolean;
    onClose: () => void;
    t: Translator;
    toast: ReturnType<typeof useToastContext>;
}) {
    async function handleConfirmed() {
        const verdict = await disableTwoFactor();
        if (verdict !== 'ok') {
            toast.show(t('security.error.generic'), { type: 'danger' });
            return;
        }
        toast.show(t('security.toast.setup_cancelled'), { type: 'success' });
        router.reload({ only: ['twoFactor'] });
        onClose();
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-md">
            <ModalHeader title={t('security.setup_pending.cancel_modal_title')} onClose={onClose} />
            <PasswordConfirmStep
                t={t}
                intro={t('security.setup_pending.cancel_password_intro')}
                submitLabel={t('security.setup_pending.cancel_confirm_button')}
                onSuccess={handleConfirmed}
                onCancel={onClose}
            />
        </Modal>
    );
}

/* ── Phase: Disabled ── */
function DisabledPanel({ t, onEnable }: { t: Translator; onEnable: () => void }) {
    const fadedTextStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    };

    return (
        <div className="space-y-4">
            <p className="text-sm font-medium">{t('security.two_factor.disabled_summary')}</p>
            <p className="text-sm" style={fadedTextStyle}>
                {t('security.two_factor.disabled_explanation')}
            </p>
            <div>
                <Button
                    variant="primary"
                    onClick={onEnable}
                    icon="fa-solid fa-shield-halved"
                    iconPosition="before"
                >
                    {t('security.two_factor.enable_button')}
                </Button>
            </div>
        </div>
    );
}

/* ── Phase: Setup-pending (user closed mid-enrollment) ── */
function SetupPendingPanel({
    t,
    onResume,
    onCancel,
}: {
    t: Translator;
    onResume: () => void;
    onCancel: () => void;
}) {
    const warningBannerStyle = {
        background: 'var(--theme-base-surface)',
        color: 'var(--theme-base-content)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
        borderInlineStartWidth: '4px',
        borderInlineStartColor: 'var(--theme-status-warning-fill)',
        borderRadius: 'var(--theme-radius-card)',
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 text-sm" style={warningBannerStyle}>
                <i
                    className="fa-solid fa-triangle-exclamation mt-0.5 shrink-0"
                    style={{ color: 'var(--theme-status-warning-fill)' }}
                    aria-hidden="true"
                />
                <div className="space-y-1">
                    <p className="font-medium">{t('security.setup_pending.heading')}</p>
                    <p style={{ color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)' }}>
                        {t('security.setup_pending.explanation')}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    variant="primary"
                    onClick={onResume}
                    icon="fa-solid fa-shield-halved"
                    iconPosition="before"
                >
                    {t('security.setup_pending.resume_button')}
                </Button>
                <Button variant="ghost" onClick={onCancel}>
                    {t('security.setup_pending.cancel_button')}
                </Button>
            </div>
        </div>
    );
}

/* ── Phase: Enabled ── */
function EnabledPanel({
    t,
    onRegenerate,
    onDisable,
}: {
    t: Translator;
    onRegenerate: () => void;
    onDisable: () => void;
}) {
    const successBannerStyle = {
        background: 'var(--theme-base-surface)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
        borderInlineStartWidth: '4px',
        borderInlineStartColor: 'var(--theme-status-success-fill)',
        borderRadius: 'var(--theme-radius-card)',
        color: 'var(--theme-base-content)',
    };
    const fadedTextStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    };

    return (
        <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 text-sm" style={successBannerStyle}>
                <i
                    className="fa-solid fa-shield-halved mt-0.5 shrink-0"
                    style={{ color: 'var(--theme-status-success-fill)' }}
                    aria-hidden="true"
                />
                <div className="space-y-1">
                    <p className="font-medium">{t('security.two_factor.enabled_summary')}</p>
                    <p style={fadedTextStyle}>{t('security.two_factor.enabled_explanation')}</p>
                </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
                <Button
                    variant="ghost"
                    onClick={onRegenerate}
                    icon="fa-solid fa-rotate"
                    iconPosition="before"
                >
                    {t('security.two_factor.regenerate_codes_button')}
                </Button>
                <Button
                    variant="danger"
                    onClick={onDisable}
                    icon="fa-solid fa-shield-slash"
                    iconPosition="before"
                >
                    {t('security.two_factor.disable_button')}
                </Button>
            </div>
        </div>
    );
}
