import { useForm } from '@inertiajs/react';
import { useState, type SyntheticEvent } from 'react';

import PasswordRulesPopover, {
    evaluatePasswordRules,
} from '@alexandria/components/form/PasswordRulesPopover';
import FormGroup from '../../components/form/FormGroup';
import TextField from '../../components/form/TextField';
import AuthLayout from '../../components/layouts/AuthLayout';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import ButtonLink from '../../components/ui/ButtonLink';
import Divider from '../../components/ui/Divider';

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

    // Password popover anchoring + focus tracking (mirrors Register).
    const [passwordEl, setPasswordEl] = useState<HTMLInputElement | null>(null);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [confirmationFocused, setConfirmationFocused] = useState(false);

    const passwordsValid = evaluatePasswordRules(form.data.password, {
        confirmation: form.data.password_confirmation,
    }).allPassed;

    const emailValid =
        form.data.email.includes('@') && form.data.email.includes('.');

    const canSubmit = emailValid && passwordsValid;
    const passwordFieldState = passwordsValid ? 'success' : 'idle';

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
                        ref={setPasswordEl}
                        id="password"
                        name="password"
                        type="password"
                        value={form.data.password}
                        onChange={(e) => form.setData('password', e.target.value)}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        required
                        autoComplete="new-password"
                        placeholder="••••••••"
                        state={passwordFieldState}
                        icon={<i className="fa-solid fa-lock" aria-hidden="true" />}
                    />
                    <PasswordRulesPopover
                        value={form.data.password}
                        confirmation={form.data.password_confirmation}
                        open={passwordFocused || confirmationFocused}
                        anchor={passwordEl}
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
                        onFocus={() => setConfirmationFocused(true)}
                        onBlur={() => setConfirmationFocused(false)}
                        required
                        autoComplete="new-password"
                        placeholder="••••••••"
                        state={passwordFieldState}
                        icon={<i className="fa-solid fa-lock" aria-hidden="true" />}
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
                    {copy['actions.reset_password']}
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
