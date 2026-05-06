import { useForm } from '@inertiajs/react';
import type { MouseEvent, SyntheticEvent } from 'react';

import FormGroup from '../../components/form/FormGroup';
import TextField from '../../components/form/TextField';
import AuthLayout from '../../components/layouts/AuthLayout';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';

interface ConfirmPasswordProps {
    copy: Record<string, string>;
    termsUrl: string;
    privacyUrl: string;
}

export default function ConfirmPassword({
    copy,
    termsUrl,
    privacyUrl,
}: ConfirmPasswordProps) {
    const form = useForm({ password: '' });

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        form.post('/user/confirm-password');
    };

    const handleCancel = (e: MouseEvent<HTMLAnchorElement>) => {
        if (window.history.length > 1) {
            e.preventDefault();
            window.history.back();
        }
    };

    return (
        <AuthLayout
            pageTitle="Confirm your password"
            formTitle="Confirm your password"
            formIntro={copy['confirm_password.intro']}
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
                <FormGroup label={copy['fields.password']} htmlFor="password">
                    <TextField
                        id="password"
                        name="password"
                        type="password"
                        value={form.data.password}
                        onChange={(e) => form.setData('password', e.target.value)}
                        required
                        autoFocus
                        autoComplete="current-password"
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
                    Confirm
                    <span aria-hidden="true">→</span>
                </Button>

                <div className="text-center">
                    <a
                        href="/"
                        onClick={handleCancel}
                        className="text-sm hover:opacity-100 transition-opacity"
                        style={{
                            color: 'var(--theme-surface-on-page)',
                            opacity: 0.6,
                        }}
                    >
                        Cancel
                    </a>
                </div>
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
