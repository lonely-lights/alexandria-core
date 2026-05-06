import { useForm } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';

import AuthLayout from '../../components/layouts/AuthLayout';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';

interface VerifyEmailProps {
    copy: Record<string, string>;
    loginUrl: string;
    termsUrl: string;
    privacyUrl: string;
    status?: string | null;
}

export default function VerifyEmail({
    copy,
    termsUrl,
    privacyUrl,
    status,
}: VerifyEmailProps) {
    const resendForm = useForm({});
    const logoutForm = useForm({});

    const handleResend = (e: SyntheticEvent) => {
        e.preventDefault();
        resendForm.post('/email/verification-notification');
    };

    const handleLogout = (e: SyntheticEvent) => {
        e.preventDefault();
        logoutForm.post('/logout');
    };

    return (
        <AuthLayout
            pageTitle="Verify Email"
            formTitle="Check your email"
            formIntro={copy['verification.intro']}
        >
            {status === 'verification-link-sent' && (
                <Alert role="success">{copy['actions.verification_sent']}</Alert>
            )}

            <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <form onSubmit={handleResend} className="flex-1">
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={resendForm.processing}
                        disabled={resendForm.processing}
                    >
                        {copy['actions.resend_verification']}
                        <span aria-hidden="true">→</span>
                    </Button>
                </form>

                <form onSubmit={handleLogout} className="flex-1">
                    <Button
                        type="submit"
                        variant="ghost"
                        size="lg"
                        fullWidth
                        loading={logoutForm.processing}
                        disabled={logoutForm.processing}
                    >
                        Log out
                    </Button>
                </form>
            </div>

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
