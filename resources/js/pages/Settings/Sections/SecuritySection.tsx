import { useCallback, useState } from 'react';
import { router } from '@inertiajs/react';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';
import Button from '@alexandria/components/ui/Button';
import Input from '@alexandria/components/form/Input';
import OtpField from '@alexandria/components/form/OtpField';
import { useToastContext } from '@alexandria/components/ui/ToastProvider';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import useT, { type Translator } from '@alexandria/hooks/useT';

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
 * URL so it can render via `<img>`.
 *
 * After a mutation the section calls
 * `router.reload({ only: ['twoFactor'] })` to refresh that prop.
 *
 * Password confirmation: Fortify's `password.confirm` middleware
 * normally guards these endpoints. When a request returns 423, the
 * section opens an inline modal asking for the user's password and
 * POSTs to `/user/confirm-password`. On success, the original action
 * is retried automatically. The user never has to leave the page.
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

/**
 * Action runner contract — each handler returns one of these verdicts
 * so the outer wrapper can decide whether to open the password-confirm
 * modal, retry, or treat as a terminal outcome.
 */
type ActionVerdict = 'ok' | 'needs_password' | 'error';

export default function SecuritySection({ twoFactor }: SecuritySectionProps) {
    const t = useT();
    const toast = useToastContext();

    // Pending-action queue used by the password-confirm modal: when an
    // action returns 423 the runner stows itself here and opens the
    // modal; on successful confirmation the modal calls
    // `pendingRunner` to retry the original request transparently.
    const [pendingRunner, setPendingRunner] = useState<(() => void) | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const requestPasswordConfirm = useCallback((runner: () => void) => {
        setPendingRunner(() => runner);
        setConfirmOpen(true);
    }, []);

    function handleConfirmSuccess() {
        setConfirmOpen(false);
        if (pendingRunner) {
            // Defer the retry by a tick so React unmounts the modal
            // (and removes the scroll lock) before the action fires
            // and potentially triggers a router.reload.
            setTimeout(() => pendingRunner(), 0);
        }
        setPendingRunner(null);
    }

    function handleConfirmClose() {
        setConfirmOpen(false);
        setPendingRunner(null);
    }

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
                <DisabledPanel t={t} toast={toast} requestPasswordConfirm={requestPasswordConfirm} />
            )}

            {phase === 'setup' && (
                <SetupPanel
                    t={t}
                    toast={toast}
                    qrDataUrl={twoFactor.qr_data_url}
                    secret={twoFactor.secret}
                    requestPasswordConfirm={requestPasswordConfirm}
                />
            )}

            {phase === 'enabled' && (
                <EnabledPanel
                    t={t}
                    toast={toast}
                    recoveryCodes={twoFactor.recovery_codes ?? []}
                    requestPasswordConfirm={requestPasswordConfirm}
                />
            )}

            <PasswordConfirmModal
                t={t}
                toast={toast}
                open={confirmOpen}
                onClose={handleConfirmClose}
                onSuccess={handleConfirmSuccess}
            />
        </div>
    );
}

/* ── Inline password-confirmation modal ──
 *
 * Fortify's `password.confirm` middleware blocks 2FA management until
 * the user has reconfirmed their password within `password_timeout`
 * (3 hours by default). Hitting a guarded endpoint without a fresh
 * confirmation returns 423; the section opens this modal, the user
 * enters their password, we POST it to `/user/confirm-password`, and
 * on success the modal closes and the original action retries.
 */
function PasswordConfirmModal({
    t,
    toast,
    open,
    onClose,
    onSuccess,
}: {
    t: Translator;
    toast: ReturnType<typeof useToastContext>;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function reset() {
        setPassword('');
        setError(null);
        setSubmitting(false);
    }

    function handleClose() {
        reset();
        onClose();
    }

    function handleSubmit() {
        if (!password || submitting) return;
        setSubmitting(true);
        setError(null);

        fetch('/user/confirm-password', {
            method: 'POST',
            headers: csrfHeaders(),
            body: JSON.stringify({ password }),
        })
            .then(async (r) => {
                setSubmitting(false);
                if (r.ok) {
                    reset();
                    onSuccess();
                    return;
                }
                if (r.status === 422) {
                    const data = await r.json().catch(() => null);
                    setError(data?.errors?.password?.[0] ?? t('security.password_confirm.invalid'));
                    return;
                }
                setError(t('security.error.generic'));
            })
            .catch(() => {
                setSubmitting(false);
                setError(t('security.error.generic'));
            });
    }

    return (
        <Modal open={open} onClose={handleClose}>
            <ModalHeader title={t('security.password_confirm.title')} onClose={handleClose} />
            <div className="space-y-4 p-6">
                <p
                    className="text-sm"
                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)' }}
                >
                    {t('security.password_confirm.intro')}
                </p>
                <Input
                    size="md"
                    type="password"
                    label={t('security.password_confirm.password_label')}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    autoFocus
                    autoComplete="current-password"
                    error={error ?? undefined}
                />
            </div>
            <ModalFooter>
                <Button variant="ghost" onClick={handleClose}>{t('common.cancel')}</Button>
                <Button
                    variant="primary"
                    onClick={handleSubmit}
                    loading={submitting}
                    disabled={!password}
                >
                    {t('security.password_confirm.submit')}
                </Button>
            </ModalFooter>
        </Modal>
    );
}

/* Helper — classify a fetch response into the verdict the runner contract
 * expects. Network failures count as 'error'. Centralised so each handler
 * doesn't repeat the same status-code check. */
async function classifyResponse(promise: Promise<Response>): Promise<{ verdict: ActionVerdict; response: Response | null }> {
    try {
        const response = await promise;
        if (response.ok) return { verdict: 'ok', response };
        if (response.status === 423) return { verdict: 'needs_password', response };
        return { verdict: 'error', response };
    } catch {
        return { verdict: 'error', response: null };
    }
}

/* ── Phase: Disabled ── */
function DisabledPanel({
    t,
    toast,
    requestPasswordConfirm,
}: {
    t: Translator;
    toast: ReturnType<typeof useToastContext>;
    requestPasswordConfirm: (runner: () => void) => void;
}) {
    const [enabling, setEnabling] = useState(false);

    const handleEnable = useCallback(() => {
        setEnabling(true);
        classifyResponse(
            fetch('/user/two-factor-authentication', {
                method: 'POST',
                headers: csrfHeaders(),
            }),
        ).then(({ verdict }) => {
            setEnabling(false);
            if (verdict === 'ok') {
                toast.show(t('security.toast.enabled'), { type: 'success' });
                router.reload({ only: ['twoFactor'] });
                return;
            }
            if (verdict === 'needs_password') {
                requestPasswordConfirm(handleEnable);
                return;
            }
            toast.show(t('security.error.generic'), { type: 'danger' });
        });
    }, [requestPasswordConfirm, t, toast]);

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
    requestPasswordConfirm,
}: {
    t: Translator;
    toast: ReturnType<typeof useToastContext>;
    qrDataUrl: string | null;
    secret: string | null;
    requestPasswordConfirm: (runner: () => void) => void;
}) {
    const [code, setCode] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [codeError, setCodeError] = useState<string | null>(null);

    const handleConfirm = useCallback(() => {
        if (code.length !== 6) return;
        setConfirming(true);
        setCodeError(null);

        classifyResponse(
            fetch('/user/confirmed-two-factor-authentication', {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify({ code }),
            }),
        ).then(async ({ verdict, response }) => {
            setConfirming(false);
            if (verdict === 'ok') {
                toast.show(t('security.toast.confirmed'), { type: 'success' });
                router.reload({ only: ['twoFactor'] });
                return;
            }
            if (verdict === 'needs_password') {
                requestPasswordConfirm(handleConfirm);
                return;
            }
            if (response?.status === 422) {
                setCodeError(t('security.error.confirm_invalid_code'));
                return;
            }
            toast.show(t('security.error.generic'), { type: 'danger' });
        });
    }, [code, requestPasswordConfirm, t, toast]);

    const handleCancel = useCallback(() => {
        // Cancelling setup = disabling 2FA before confirmation. Same
        // endpoint as the post-enable disable flow.
        setCancelling(true);
        classifyResponse(
            fetch('/user/two-factor-authentication', {
                method: 'DELETE',
                headers: csrfHeaders(),
            }),
        ).then(({ verdict }) => {
            setCancelling(false);
            if (verdict === 'ok') {
                router.reload({ only: ['twoFactor'] });
                return;
            }
            if (verdict === 'needs_password') {
                requestPasswordConfirm(handleCancel);
                return;
            }
            toast.show(t('security.error.generic'), { type: 'danger' });
        });
    }, [requestPasswordConfirm, t, toast]);

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
    requestPasswordConfirm,
}: {
    t: Translator;
    toast: ReturnType<typeof useToastContext>;
    recoveryCodes: string[];
    requestPasswordConfirm: (runner: () => void) => void;
}) {
    const [regenerating, setRegenerating] = useState(false);
    const [disabling, setDisabling] = useState(false);

    const handleRegenerate = useCallback(() => {
        setRegenerating(true);
        classifyResponse(
            fetch('/user/two-factor-recovery-codes', {
                method: 'POST',
                headers: csrfHeaders(),
            }),
        ).then(({ verdict }) => {
            setRegenerating(false);
            if (verdict === 'ok') {
                toast.show(t('security.toast.codes_regenerated'), { type: 'success' });
                router.reload({ only: ['twoFactor'] });
                return;
            }
            if (verdict === 'needs_password') {
                requestPasswordConfirm(handleRegenerate);
                return;
            }
            toast.show(t('security.error.generic'), { type: 'danger' });
        });
    }, [requestPasswordConfirm, t, toast]);

    const handleDisable = useCallback(() => {
        setDisabling(true);
        classifyResponse(
            fetch('/user/two-factor-authentication', {
                method: 'DELETE',
                headers: csrfHeaders(),
            }),
        ).then(({ verdict }) => {
            setDisabling(false);
            if (verdict === 'ok') {
                toast.show(t('security.toast.disabled'), { type: 'success' });
                router.reload({ only: ['twoFactor'] });
                return;
            }
            if (verdict === 'needs_password') {
                requestPasswordConfirm(handleDisable);
                return;
            }
            toast.show(t('security.error.generic'), { type: 'danger' });
        });
    }, [requestPasswordConfirm, t, toast]);

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
