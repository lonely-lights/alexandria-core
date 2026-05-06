import { useForm } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';

import FormGroup from '../../components/form/FormGroup';
import TextField from '../../components/form/TextField';
import AuthLayout from '../../components/layouts/AuthLayout';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';

interface ResetPasswordProps {
    copy: Record<string, string>;
    token: string;
    email: string;
    loginUrl: string;
    termsUrl: string;
    privacyUrl: string;
}

export default function ResetPassword({
    copy,
    token,
    email,
    loginUrl,
    termsUrl,
    privacyUrl,
}: ResetPasswordProps) {
    const form = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        form.post('/reset-password');
    };

    return (
        <AuthLayout
            pageTitle={copy['actions.reset_password']}
            formTitle="Choose a new password"
            formIntro="Enter your email and pick a new password to log back in."
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
                <input type="hidden" name="token" value={form.data.token} />

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
                        icon={<i className="fa-solid fa-envelope" aria-hidden="true" />}
                    />
                </FormGroup>

                <FormGroup label={copy['fields.password']} htmlFor="password">
                    <TextField
                        id="password"
                        name="password"
                        type="password"
                        value={form.data.password}
                        onChange={(e) => form.setData('password', e.target.value)}
                        required
                        autoComplete="new-password"
                        placeholder="••••••••"
                        icon={<i className="fa-solid fa-lock" aria-hidden="true" />}
                    />
                </FormGroup>

                <FormGroup
                    label={copy['actions.confirm_password']}
                    htmlFor="password_confirmation"
                >
                    <TextField
                        id="password_confirmation"
                        name="password_confirmation"
                        type="password"
                        value={form.data.password_confirmation}
                        onChange={(e) =>
                            form.setData('password_confirmation', e.target.value)
                        }
                        required
                        autoComplete="new-password"
                        placeholder="••••••••"
                        icon={<i className="fa-solid fa-lock" aria-hidden="true" />}
                    />
                </FormGroup>

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={form.processing}
                    disabled={form.processing}
                >
                    {copy['actions.reset_password']}
                    <span aria-hidden="true">→</span>
                </Button>
            </form>

            <p
                className="text-center"
                style={{ color: 'var(--theme-surface-on-page)', opacity: 0.6 }}
            >
                Remembered it?{' '}
                <a
                    href={loginUrl}
                    className="font-semibold hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--theme-brand-primary-500)' }}
                >
                    Log in
                </a>
            </p>

            <p
                className="text-center text-xs pt-4"
                style={{ color: 'var(--theme-surface-on-page)', opacity: 0.4 }}
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
