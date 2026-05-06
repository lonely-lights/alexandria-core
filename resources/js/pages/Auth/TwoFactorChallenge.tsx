import { useForm } from '@inertiajs/react';
import { useState, type SyntheticEvent } from 'react';

import FormGroup from '../../components/form/FormGroup';
import TextField from '../../components/form/TextField';
import AuthLayout from '../../components/layouts/AuthLayout';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';

interface TwoFactorChallengeProps {
    copy: Record<string, string>;
    termsUrl: string;
    privacyUrl: string;
}

export default function TwoFactorChallenge({
    copy,
    termsUrl,
    privacyUrl,
}: TwoFactorChallengeProps) {
    const [usingRecovery, setUsingRecovery] = useState(false);

    const form = useForm({
        code: '',
        recovery_code: '',
    });

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        form.post('/two-factor-challenge');
    };

    const toggleMode = () => {
        form.reset('code', 'recovery_code');
        setUsingRecovery((prev) => !prev);
    };

    const canSubmit = usingRecovery
        ? form.data.recovery_code.trim().length > 0
        : form.data.code.length === 6;

    return (
        <AuthLayout
            pageTitle={copy['two_factor.challenge.title']}
            formTitle={copy['two_factor.challenge.title']}
            formIntro={copy['two_factor.challenge.intro']}
            quote={'"A second key for the second lock."'}
            motif={null}
        >
            {Object.keys(form.errors).length > 0 && (
                <Alert role="error">
                    <div className="space-y-1">
                        {Object.values(form.errors).map((err) => (
                            <p key={err}>{err}</p>
                        ))}
                    </div>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {usingRecovery ? (
                    <FormGroup
                        label={copy['two_factor.challenge.recovery_label']}
                        htmlFor="recovery_code"
                    >
                        <TextField
                            id="recovery_code"
                            name="recovery_code"
                            type="text"
                            value={form.data.recovery_code}
                            onChange={(e) =>
                                form.setData('recovery_code', e.target.value)
                            }
                            required
                            autoFocus
                            autoComplete="one-time-code"
                            style={{
                                fontFamily: 'var(--theme-typography-mono-family)',
                            }}
                        />
                    </FormGroup>
                ) : (
                    <FormGroup
                        label={copy['two_factor.challenge.code_label']}
                        htmlFor="code"
                    >
                        <TextField
                            id="code"
                            name="code"
                            type="text"
                            value={form.data.code}
                            onChange={(e) => form.setData('code', e.target.value)}
                            required
                            autoFocus
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            style={{
                                fontFamily: 'var(--theme-typography-mono-family)',
                                letterSpacing: '0.25em',
                                textAlign: 'center',
                                fontSize: '1.125rem',
                            }}
                        />
                    </FormGroup>
                )}

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={form.processing}
                    disabled={form.processing || !canSubmit}
                >
                    {copy['two_factor.challenge.submit']}
                    <span aria-hidden="true">→</span>
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    fullWidth
                    onClick={toggleMode}
                >
                    {usingRecovery
                        ? copy['two_factor.challenge.use_authentication']
                        : copy['two_factor.challenge.use_recovery']}
                </Button>
            </form>

            <p
                className="text-center text-xs pt-4"
                style={{ color: 'var(--theme-surface-on-page)', opacity: 0.4 }}
            >
                <a
                    href={termsUrl}
                    className="underline hover:opacity-80 transition-opacity"
                >
                    {copy['legal.terms_of_service']}
                </a>
                {' · '}
                <a
                    href={privacyUrl}
                    className="underline hover:opacity-80 transition-opacity"
                >
                    {copy['legal.privacy_policy']}
                </a>
            </p>
        </AuthLayout>
    );
}
