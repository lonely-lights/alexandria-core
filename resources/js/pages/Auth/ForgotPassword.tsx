import { useForm } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';

import FormGroup from '../../components/form/FormGroup';
import TextField from '../../components/form/TextField';
import AuthLayout from '../../components/layouts/AuthLayout';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import ButtonLink from '../../components/ui/ButtonLink';
import Divider from '../../components/ui/Divider';

interface ForgotPasswordProps {
    copy: Record<string, string>;
    loginUrl: string;
    termsUrl: string;
    privacyUrl: string;
    status?: string | null;
}

export default function ForgotPassword({
    copy,
    loginUrl,
    termsUrl,
    privacyUrl,
    status,
}: ForgotPasswordProps) {
    const form = useForm({ email: '' });

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        form.post('/forgot-password');
    };

    const canSubmit =
        form.data.email.includes('@') && form.data.email.includes('.');

    return (
        <AuthLayout
            pageTitle="Forgot your password?"
            formTitle="Forgot your password?"
            formIntro={copy['forgot_password.intro']}
        >
            {status && <Alert role="success">{status}</Alert>}

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
                <FormGroup label={copy['fields.email']} htmlFor="email">
                    <TextField
                        id="email"
                        name="email"
                        type="email"
                        value={form.data.email}
                        onChange={(e) => form.setData('email', e.target.value)}
                        required
                        autoFocus
                        autoComplete="username"
                        placeholder="you@example.com"
                        icon={
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                            </svg>
                        }
                    />
                </FormGroup>

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={form.processing}
                    disabled={form.processing || !canSubmit}
                >
                    {copy['actions.email_reset_link']}
                    <span aria-hidden="true">→</span>
                </Button>
            </form>

            <Divider>Remembered it?</Divider>
            <ButtonLink href={loginUrl} variant="outline" size="lg" fullWidth>
                {copy['actions.login']}
                <span aria-hidden="true">→</span>
            </ButtonLink>

            <p
                className="text-center text-xs pt-4"
                style={{ color: 'var(--theme-base-content)', opacity: 0.4 }}
            >
                {copy['login.agree_terms']}{' '}
                <a
                    href={termsUrl}
                    className="underline hover:opacity-80 transition-opacity"
                >
                    {copy['legal.terms_of_service']}
                </a>{' '}
                {copy['login.and']}{' '}
                <a
                    href={privacyUrl}
                    className="underline hover:opacity-80 transition-opacity"
                >
                    {copy['legal.privacy_policy']}
                </a>
                .
            </p>
        </AuthLayout>
    );
}
