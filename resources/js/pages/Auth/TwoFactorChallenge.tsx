import { useForm } from '@inertiajs/react';
import {
    useRef,
    useState,
    type ChangeEvent,
    type ClipboardEvent,
    type SyntheticEvent,
} from 'react';

import FormGroup from '../../components/form/FormGroup';
import OtpField from '../../components/form/OtpField';
import TextField from '../../components/form/TextField';
import useT from '../../hooks/useT';
import AuthLayout from '../../components/layouts/AuthLayout';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Divider from '../../components/ui/Divider';

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
    const t = useT();
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

    // Recovery codes ship as `xxxxxxxxxx-xxxxxxxxxx` (Fortify default).
    // The submit gate accepts anything resembling that shape; server
    // validation handles the actual lookup against the user's codes.
    const recoveryShapeOk =
        form.data.recovery_code.includes('-') &&
        form.data.recovery_code.split('-').every((seg) => seg.length > 0);

    const canSubmit = usingRecovery
        ? recoveryShapeOk
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
                        hideLabel
                    >
                        <RecoveryCodeField
                            value={form.data.recovery_code}
                            onChange={(v) => form.setData('recovery_code', v)}
                            autoFocus
                        />
                    </FormGroup>
                ) : (
                    <FormGroup
                        label={copy['two_factor.challenge.code_label']}
                        htmlFor="code"
                        hideLabel
                    >
                        <OtpField
                            id="code"
                            name="code"
                            length={6}
                            numeric
                            value={form.data.code}
                            onChange={(v) => form.setData('code', v)}
                            autoFocus
                            required
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
            </form>

            <Divider>{t('common.or')}</Divider>

            <Button
                type="button"
                variant="outline"
                size="lg"
                fullWidth
                onClick={toggleMode}
            >
                {usingRecovery
                    ? copy['two_factor.challenge.use_authentication']
                    : copy['two_factor.challenge.use_recovery']}
            </Button>

            <p
                className="text-center text-xs pt-4"
                style={{ color: 'var(--theme-base-content)', opacity: 0.4 }}
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

/**
 * Two segments × 10 characters each, joined by a hyphen — matches the
 * Fortify default recovery-code format `xxxxxxxxxx-xxxxxxxxxx`.
 *
 * Smart paste on either field: pasting `abc-def` distributes across
 * both segments; pasting just `abc` lands in whichever field is
 * focused. Auto-advances from segment 1 → 2 once segment 1 hits 10
 * chars. The combined value (with the hyphen) is stored in form.data
 * since that's the format Fortify validates against.
 */
function RecoveryCodeField({
    value,
    onChange,
    autoFocus = false,
}: {
    value: string;
    onChange: (value: string) => void;
    autoFocus?: boolean;
}) {
    const secondRef = useRef<HTMLInputElement>(null);
    const [rawFirst = '', rawSecond = ''] = value.split('-');

    function rebuild(first: string, second: string): void {
        const cleanFirst = first.slice(0, 10);
        const cleanSecond = second.slice(0, 10);
        onChange(
            cleanSecond.length > 0 || value.includes('-')
                ? `${cleanFirst}-${cleanSecond}`
                : cleanFirst,
        );
    }

    function handleFirstChange(e: ChangeEvent<HTMLInputElement>): void {
        const incoming = e.target.value;

        // Distribute a hyphenated value across both segments. (Real full-
        // code pastes are intercepted by handleFirstPaste below — by the
        // time onChange fires, maxLength would already have truncated the
        // hyphen away. This branch covers programmatic value sets.)
        if (incoming.includes('-')) {
            const [a = '', b = ''] = incoming.split('-');
            rebuild(a, b);
            secondRef.current?.focus();

            return;
        }

        rebuild(incoming, rawSecond);

        // Auto-advance when segment 1 fills.
        if (incoming.length === 10) {
            secondRef.current?.focus();
        }
    }

    function handleFirstPaste(e: ClipboardEvent<HTMLInputElement>): void {
        const raw = e.clipboardData.getData('text').trim();

        // Findings #23: smart paste must run on the paste event itself —
        // maxLength=10 truncates the inserted text before onChange ever
        // sees the hyphen, so the onChange branch alone is unreachable
        // for real pastes. Short pastes fall through to default insert.
        if (!raw.includes('-')) {
            return;
        }

        e.preventDefault();
        const [a = '', b = ''] = raw.split('-');
        rebuild(a, b);
        secondRef.current?.focus();
    }

    function handleSecondChange(e: ChangeEvent<HTMLInputElement>): void {
        rebuild(rawFirst, e.target.value);
    }

    const monoStyle = {
        fontFamily: 'var(--theme-typography-mono-family)',
        textAlign: 'center' as const,
        letterSpacing: '0.1em',
    };

    return (
        <div className="flex items-center gap-2">
            <TextField
                id="recovery_code"
                name="recovery_code"
                value={rawFirst}
                onChange={handleFirstChange}
                onPaste={handleFirstPaste}
                maxLength={10}
                autoFocus={autoFocus}
                autoComplete="one-time-code"
                placeholder="xxxxxxxxxx"
                style={monoStyle}
            />
            <span
                aria-hidden="true"
                style={{
                    color: 'var(--theme-base-content)',
                    opacity: 0.4,
                    fontFamily: 'var(--theme-typography-mono-family)',
                    fontSize: '1.25rem',
                }}
            >
                –
            </span>
            <TextField
                ref={secondRef}
                value={rawSecond}
                onChange={handleSecondChange}
                maxLength={10}
                autoComplete="one-time-code"
                placeholder="xxxxxxxxxx"
                style={monoStyle}
            />
        </div>
    );
}
