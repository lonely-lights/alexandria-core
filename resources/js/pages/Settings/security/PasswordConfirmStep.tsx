import { useState } from 'react';
import Input from '@alexandria/components/form/Input';
import Button from '@alexandria/components/ui/Button';
import type { Translator } from '@alexandria/hooks/useT';
import { confirmPassword } from './twoFactorApi';

interface PasswordConfirmStepProps {
    t: Translator;
    /** Contextual intro copy — varies between enable / regenerate / disable. */
    intro: string;
    /** Submit-button label — same parameter shape as the intro. */
    submitLabel: string;
    onSuccess: () => void;
    onCancel: () => void;
}

/**
 * Step 1 of every 2FA wizard — POSTs to `/user/confirm-password` so
 * Fortify's `password.confirm` middleware lets the next request through.
 *
 * On 422 (wrong password) the field shows an inline error and stays
 * focused; on success the parent advances to the next step.
 */
export default function PasswordConfirmStep({
    t,
    intro,
    submitLabel,
    onSuccess,
    onCancel,
}: PasswordConfirmStepProps) {
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit() {
        if (!password || submitting) return;
        setSubmitting(true);
        setError(null);

        const verdict = await confirmPassword(password);
        setSubmitting(false);

        if (verdict === 'ok') {
            onSuccess();
            return;
        }
        if (verdict === 'invalid_password') {
            setError(t('security.password_confirm.invalid'));
            return;
        }
        setError(t('security.error.generic'));
    }

    return (
        <div className="space-y-4 p-6">
            <p
                className="text-sm"
                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 65%, transparent)' }}
            >
                {intro}
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
            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
                <Button
                    variant="primary"
                    onClick={handleSubmit}
                    loading={submitting}
                    disabled={!password}
                >
                    {submitLabel}
                </Button>
            </div>
        </div>
    );
}
