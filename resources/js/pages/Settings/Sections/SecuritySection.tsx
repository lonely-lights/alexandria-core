import { useState } from 'react';
import { router } from '@inertiajs/react';
import Button from '@alexandria/components/ui/Button';
import OtpField from '@alexandria/components/form/OtpField';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import useT from '@alexandria/hooks/useT';

/**
 * Security tab — drives Fortify's standard two-factor-authentication
 * endpoints from a single React surface. Three states:
 *
 *   - **disabled**  : no secret set. Show explainer + Enable button.
 *   - **setup**     : secret set, not confirmed. Show QR + manual key +
 *                     6-digit confirmation field + Confirm/Cancel.
 *   - **enabled**   : secret set + confirmed. Show recovery codes,
 *                     Regenerate, and Disable.
 *
 * Endpoints (Fortify defaults — the consumer app routes them):
 *
 *   - `POST   /user/two-factor-authentication`            enable
 *   - `POST   /user/confirmed-two-factor-authentication`  confirm enrollment
 *   - `DELETE /user/two-factor-authentication`            disable
 *   - `POST   /user/two-factor-recovery-codes`            regenerate
 *
 * The consumer-side controller resolves `qr_data_url`, `secret`, and
 * `recovery_codes` from the user model and ships them in the
 * `twoFactor` prop. The QR ships as a `data:image/svg+xml;base64,…`
 * URL so it can render via `<img>` (avoids dangerouslySetInnerHTML).
 *
 * After a mutation the section calls
 * `router.reload({ only: ['twoFactor'] })` to refresh that prop.
 *
 * Password confirmation: Fortify's `password.confirm` middleware
 * normally guards these endpoints. If the consumer wires that,
 * unconfirmed users get a 423; we surface a toast pointing them at
 * `/user/confirm-password`. Apps that don't enforce confirmation
 * (config: `fortify.features.passwordConfirmation`) bypass that path.
 */
interface SecuritySectionProps {
    twoFactor: {
        enabled: boolean;
        confirmed: boolean;
        qr_data_url: string | null;
        secret: string | null;
        recovery_codes: string[] | null;
    };
}

export default function SecuritySection({ twoFactor }: SecuritySectionProps) {
    const t = useT();
    const toast = useToastContext();

    // State machine: derive once per render so the JSX stays a flat
    // ternary cascade rather than nested conditional expressions.
    const phase: 'disabled' | 'setup' | 'enabled' =
        !twoFactor.enabled
            ? 'disabled'
            : twoFactor.confirmed
                ? 'enabled'
                : 'setup';

    return (
        <div className="space-y-6">
            <h3 className="font-serif text-2xl font-bold leading-tight">
                {t('security.two_factor.heading')}
            </h3>

            {phase === 'disabled' && (
                <DisabledPanel t={t} toast={toast} />
            )}

            {phase === 'setup' && (
                <SetupPanel
                    t={t}
                    toast={toast}
                    qrDataUrl={twoFactor.qr_data_url}
                    secret={twoFactor.secret}
                />
            )}

            {phase === 'enabled' && (
                <EnabledPanel
                    t={t}
                    toast={toast}
                    recoveryCodes={twoFactor.recovery_codes ?? []}
                />
            )}
        </div>
    );
}

/* ── Phase: Disabled ── */
function DisabledPanel({ t, toast }: { t: ReturnType<typeof useT>; toast: ReturnType<typeof useToastContext> }) {
    const [enabling, setEnabling] = useState(false);

    function handleEnable() {
        setEnabling(true);
        fetch('/user/two-factor-authentication', {
            method: 'POST',
            headers: csrfHeaders(),
        })
            .then((r) => {
                setEnabling(false);
                if (r.ok) {
                    toast.show(t('security.toast.enabled'), { type: 'success' });
                    router.reload({ only: ['twoFactor'] });
                } else if (r.status === 423) {
                    toast.show(t('security.error.password_confirmation_required'), { type: 'warning' });
                } else {
                    toast.show(t('security.error.generic'), { type: 'danger' });
                }
            })
            .catch(() => {
                setEnabling(false);
                toast.show(t('security.error.generic'), { type: 'danger' });
            });
    }

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
                    onClick={handleEnable}
                    loading={enabling}
                    icon="fa-solid fa-shield-halved"
                    iconPosition="before"
                >
                    {t('security.two_factor.enable_button')}
                </Button>
            </div>
        </div>
    );
}

/* ── Phase: Setup (secret created, awaiting 6-digit confirm) ── */
function SetupPanel({
    t,
    toast,
    qrDataUrl,
    secret,
}: {
    t: ReturnType<typeof useT>;
    toast: ReturnType<typeof useToastContext>;
    qrDataUrl: string | null;
    secret: string | null;
}) {
    const [code, setCode] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [codeError, setCodeError] = useState<string | null>(null);

    function handleConfirm() {
        if (code.length !== 6) return;
        setConfirming(true);
        setCodeError(null);

        fetch('/user/confirmed-two-factor-authentication', {
            method: 'POST',
            headers: csrfHeaders(),
            body: JSON.stringify({ code }),
        })
            .then((r) => {
                setConfirming(false);
                if (r.ok) {
                    toast.show(t('security.toast.confirmed'), { type: 'success' });
                    router.reload({ only: ['twoFactor'] });
                    return;
                }
                if (r.status === 422) {
                    setCodeError(t('security.error.confirm_invalid_code'));
                    return;
                }
                if (r.status === 423) {
                    toast.show(t('security.error.password_confirmation_required'), { type: 'warning' });
                    return;
                }
                toast.show(t('security.error.generic'), { type: 'danger' });
            })
            .catch(() => {
                setConfirming(false);
                toast.show(t('security.error.generic'), { type: 'danger' });
            });
    }

    function handleCancel() {
        // Cancelling setup = disabling 2FA before confirmation. Same
        // endpoint as the post-enable disable flow.
        setCancelling(true);
        fetch('/user/two-factor-authentication', {
            method: 'DELETE',
            headers: csrfHeaders(),
        })
            .then(() => {
                setCancelling(false);
                router.reload({ only: ['twoFactor'] });
            })
            .catch(() => {
                setCancelling(false);
                toast.show(t('security.error.generic'), { type: 'danger' });
            });
    }

    const cardStyle = {
        background: 'var(--theme-base-page)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
    };
    const fadedTextStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    };
    const labelStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    };

    return (
        <div className="space-y-5">
            <div>
                <h4 className="font-serif text-lg font-semibold leading-tight">
                    {t('security.two_factor.setup_heading')}
                </h4>
                <p className="mt-1 text-sm" style={fadedTextStyle}>
                    {t('security.two_factor.setup_explanation')}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr]">
                {qrDataUrl && (
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs" style={labelStyle}>
                            {t('security.two_factor.scan_qr_label')}
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
                                alt={t('security.two_factor.scan_qr_label')}
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
                                {t('security.two_factor.manual_entry_label')}
                            </span>
                            <code
                                className="block break-all px-3 py-2 font-mono text-sm"
                                style={cardStyle}
                            >
                                {secret}
                            </code>
                        </div>
                    )}

                    <div className="space-y-1">
                        <span className="text-xs" style={labelStyle}>
                            {t('security.two_factor.confirmation_code_label')}
                        </span>
                        <OtpField
                            id="two-factor-confirm-code"
                            name="code"
                            length={6}
                            numeric
                            value={code}
                            onChange={(v) => { setCode(v); setCodeError(null); }}
                            autoFocus
                        />
                        {codeError && (
                            <p className="mt-1 text-xs" style={{ color: 'var(--theme-status-error-stroke)' }}>
                                {codeError}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={handleCancel} loading={cancelling}>
                    {t('security.two_factor.cancel_setup_button')}
                </Button>
                <Button
                    variant="primary"
                    onClick={handleConfirm}
                    loading={confirming}
                    disabled={code.length !== 6}
                >
                    {t('security.two_factor.confirm_button')}
                </Button>
            </div>
        </div>
    );
}

/* ── Phase: Enabled (secret + confirmed) ── */
function EnabledPanel({
    t,
    toast,
    recoveryCodes,
}: {
    t: ReturnType<typeof useT>;
    toast: ReturnType<typeof useToastContext>;
    recoveryCodes: string[];
}) {
    const [regenerating, setRegenerating] = useState(false);
    const [disabling, setDisabling] = useState(false);

    function handleRegenerate() {
        setRegenerating(true);
        fetch('/user/two-factor-recovery-codes', {
            method: 'POST',
            headers: csrfHeaders(),
        })
            .then((r) => {
                setRegenerating(false);
                if (r.ok) {
                    toast.show(t('security.toast.codes_regenerated'), { type: 'success' });
                    router.reload({ only: ['twoFactor'] });
                } else if (r.status === 423) {
                    toast.show(t('security.error.password_confirmation_required'), { type: 'warning' });
                } else {
                    toast.show(t('security.error.generic'), { type: 'danger' });
                }
            })
            .catch(() => {
                setRegenerating(false);
                toast.show(t('security.error.generic'), { type: 'danger' });
            });
    }

    function handleDisable() {
        setDisabling(true);
        fetch('/user/two-factor-authentication', {
            method: 'DELETE',
            headers: csrfHeaders(),
        })
            .then((r) => {
                setDisabling(false);
                if (r.ok) {
                    toast.show(t('security.toast.disabled'), { type: 'success' });
                    router.reload({ only: ['twoFactor'] });
                } else if (r.status === 423) {
                    toast.show(t('security.error.password_confirmation_required'), { type: 'warning' });
                } else {
                    toast.show(t('security.error.generic'), { type: 'danger' });
                }
            })
            .catch(() => {
                setDisabling(false);
                toast.show(t('security.error.generic'), { type: 'danger' });
            });
    }

    const successBannerStyle = {
        background: 'var(--theme-status-success-subtle)',
        border: '1px solid color-mix(in srgb, var(--theme-status-success-fill) 35%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
        color: 'var(--theme-base-content)',
    };
    const codeChipStyle = {
        background: 'color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
        borderRadius: 'var(--theme-radius-input)',
    };
    const fadedTextStyle = {
        color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)',
    };

    return (
        <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 text-sm" style={successBannerStyle}>
                <i
                    className="fa-solid fa-shield-halved mt-0.5"
                    style={{ color: 'var(--theme-status-success-fill)' }}
                    aria-hidden="true"
                />
                <div className="space-y-1">
                    <p className="font-medium">{t('security.two_factor.enabled_summary')}</p>
                    <p style={fadedTextStyle}>{t('security.two_factor.enabled_explanation')}</p>
                </div>
            </div>

            <div>
                <h4 className="font-serif text-lg font-semibold leading-tight">
                    {t('security.two_factor.recovery_codes_heading')}
                </h4>
                <p className="mt-1 text-sm" style={fadedTextStyle}>
                    {t('security.two_factor.recovery_codes_explanation')}
                </p>
                {recoveryCodes.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {recoveryCodes.map((c) => (
                            <code
                                key={c}
                                className="px-3 py-2 font-mono text-sm tracking-wide"
                                style={codeChipStyle}
                            >
                                {c}
                            </code>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
                <Button
                    variant="ghost"
                    onClick={handleRegenerate}
                    loading={regenerating}
                    icon="fa-solid fa-rotate"
                    iconPosition="before"
                >
                    {t('security.two_factor.regenerate_codes_button')}
                </Button>
                <Button
                    variant="danger"
                    onClick={handleDisable}
                    loading={disabling}
                    icon="fa-solid fa-shield-slash"
                    iconPosition="before"
                >
                    {t('security.two_factor.disable_button')}
                </Button>
            </div>
        </div>
    );
}
