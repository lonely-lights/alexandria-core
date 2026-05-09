import { useState } from 'react';
import { router } from '@inertiajs/react';
import Button from '@alexandria/components/ui/Button';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';
import useT, { type Translator } from '@alexandria/hooks/useT';
import TwoFactorEnableModal from '../security/TwoFactorEnableModal';
import TwoFactorRegenerateModal from '../security/TwoFactorRegenerateModal';
import TwoFactorDisableModal from '../security/TwoFactorDisableModal';
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
                    toast={toast}
                    onResume={() => setEnableOpen(true)}
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
        </div>
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
    toast,
    onResume,
}: {
    t: Translator;
    toast: ReturnType<typeof useToastContext>;
    onResume: () => void;
}) {
    const [cancelling, setCancelling] = useState(false);

    async function handleCancel() {
        setCancelling(true);
        const verdict = await disableTwoFactor();
        setCancelling(false);
        if (verdict !== 'ok') {
            toast.show(t('security.error.generic'), { type: 'danger' });
            return;
        }
        router.reload({ only: ['twoFactor'] });
    }

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
                    className="fa-solid fa-triangle-exclamation mt-0.5 flex-shrink-0"
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
                <Button
                    variant="ghost"
                    onClick={handleCancel}
                    loading={cancelling}
                >
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
                    className="fa-solid fa-shield-halved mt-0.5 flex-shrink-0"
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
