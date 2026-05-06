import { useForm } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';

import HeroRotator from '@alexandria/components/ui/HeroRotator';
import CheckboxField from '../../components/form/CheckboxField';
import FormGroup from '../../components/form/FormGroup';
import TextField from '../../components/form/TextField';
import AuthLayout from '../../components/layouts/AuthLayout';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import ButtonLink from '../../components/ui/ButtonLink';
import Divider from '../../components/ui/Divider';

interface LoginProps {
    copy: Record<string, string>;
    registerUrl: string | null;
    forgotPasswordUrl: string | null;
    termsUrl: string;
    privacyUrl: string;
    canResetPassword: boolean;
    status?: string | null;
}

export default function Login({
    copy,
    registerUrl,
    forgotPasswordUrl,
    termsUrl,
    privacyUrl,
    canResetPassword,
    status,
}: LoginProps) {
    const form = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        form.post('/login');
    };

    // Submit gate — server still re-validates, this is a UX gate.
    // Email needs an @ and a dot; password needs any non-empty value.
    // We don't enforce a length floor on login because legacy accounts
    // may have shorter passwords than the current registration rules.
    const canSubmit =
        form.data.email.includes('@') &&
        form.data.email.includes('.') &&
        form.data.password.length > 0;

    return (
        <AuthLayout
            pageTitle={copy['login.welcome_back']}
            formTitle={copy['login.welcome_back']}
            formIntro={copy['login.intro']}
            motif={
                <HeroRotator
                    className="h-full w-full"
                    interval={5000}
                    panels={[
                        {
                            key: 'papers',
                            ariaLabel: 'Sticky notes cluster',
                            content: <LoginPapersPanel />,
                        },
                        {
                            key: 'dots',
                            ariaLabel: 'Connected ideas graph',
                            content: <LoginDotsPanel />,
                        },
                    ]}
                />
            }
        >
            {status && (
                <Alert role="success">{status}</Alert>
            )}

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

                <FormGroup
                    label={copy['fields.password']}
                    htmlFor="password"
                    action={
                        canResetPassword && forgotPasswordUrl ? (
                            <a
                                href={forgotPasswordUrl}
                                style={{ color: 'var(--theme-brand-primary-500)' }}
                                className="hover:opacity-80 transition-opacity"
                            >
                                {copy['actions.forgot_password']}
                            </a>
                        ) : null
                    }
                >
                    <TextField
                        id="password"
                        name="password"
                        type="password"
                        value={form.data.password}
                        onChange={(e) => form.setData('password', e.target.value)}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
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
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                        }
                    />
                </FormGroup>

                <CheckboxField
                    id="remember"
                    name="remember"
                    checked={form.data.remember}
                    onChange={(e) =>
                        form.setData('remember', e.target.checked)
                    }
                    label={copy['fields.remember_me']}
                />

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={form.processing}
                    disabled={form.processing || !canSubmit}
                >
                    {copy['actions.login']}
                    <span aria-hidden="true">→</span>
                </Button>
            </form>

            {registerUrl && (
                <>
                    <Divider>{copy['actions.have_account']}</Divider>
                    <ButtonLink
                        href={registerUrl}
                        variant="secondary"
                        size="lg"
                        fullWidth
                    >
                        {copy['actions.signup']}
                        <span aria-hidden="true">→</span>
                    </ButtonLink>
                </>
            )}

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

/* ── Hero rotator panels — preserved verbatim from legacy auth ────── */

/**
 * Sticky-notes + pencil-path cluster. Paper motif rendered at the
 * login hero scale (440 × 280).
 */
function LoginPapersPanel() {
    return (
        <div className="relative h-full w-full">
            <svg
                width="440"
                height="280"
                viewBox="0 0 440 280"
                className="absolute top-0 left-0 pointer-events-none"
                aria-hidden="true"
            >
                <path
                    d="M 145 50 Q 220 5 310 60 Q 340 140 160 180 Q 225 210 275 220"
                    stroke="#d4a017"
                    strokeWidth="1.8"
                    strokeDasharray="5 6"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.7"
                />
            </svg>

            <div
                className="sticky-note sticky-note--yellow absolute text-[15px]"
                style={{ top: 30, left: 60, width: 170, transform: 'rotate(-4deg)' }}
            >
                every idea gets a home
            </div>
            <div
                className="sticky-note sticky-note--sage absolute text-[15px]"
                style={{ top: 40, right: 40, width: 180, transform: 'rotate(3deg)' }}
            >
                worlds grow, one note at a time
            </div>
            <div
                className="sticky-note sticky-note--coral absolute text-[15px]"
                style={{ top: 160, left: 80, width: 160, transform: 'rotate(-2deg)' }}
            >
                characters remember
            </div>
            <div
                className="sticky-note sticky-note--lavender absolute text-[15px]"
                style={{ top: 200, right: 80, width: 170, transform: 'rotate(2deg)' }}
            >
                nothing gets lost
            </div>
        </div>
    );
}

/**
 * Connected-dots graph — the Paper re-interpretation of the retired
 * Studio node-graph.
 */
function LoginDotsPanel() {
    const nodes: Array<{
        key: string;
        x: number;
        y: number;
        r: number;
        pulse?: boolean;
        fill: string;
        label: string;
        labelOffsetX: number;
        labelOffsetY: number;
    }> = [
        {
            key: 'aurora',
            x: 105,
            y: 60,
            r: 12,
            pulse: true,
            fill: 'var(--tf-paper-yellow)',
            label: 'Aurora',
            labelOffsetX: 16,
            labelOffsetY: 4,
        },
        {
            key: 'luna',
            x: 325,
            y: 55,
            r: 11,
            pulse: true,
            fill: 'var(--tf-paper-coral)',
            label: 'Luna',
            labelOffsetX: -50,
            labelOffsetY: 4,
        },
        {
            key: 'pricipium',
            x: 230,
            y: 150,
            r: 13,
            pulse: true,
            fill: 'var(--tf-paper-lavender)',
            label: 'Pricipium',
            labelOffsetX: 18,
            labelOffsetY: 4,
        },
        {
            key: 'lex',
            x: 140,
            y: 225,
            r: 10,
            pulse: true,
            fill: 'var(--tf-paper-sage)',
            label: 'Lex',
            labelOffsetX: 15,
            labelOffsetY: 4,
        },
        {
            key: 'beyond',
            x: 370,
            y: 210,
            r: 8,
            pulse: false,
            fill: 'var(--tf-paper-yellow)',
            label: 'Beyond',
            labelOffsetX: -60,
            labelOffsetY: 4,
        },
    ];

    const edges: Array<[string, string, number]> = [
        ['aurora', 'luna', 0.7],
        ['aurora', 'pricipium', 0.7],
        ['luna', 'pricipium', 0.7],
        ['aurora', 'lex', 0.55],
        ['lex', 'beyond', 0.6],
        ['pricipium', 'beyond', 0.4],
    ];

    const byKey = Object.fromEntries(nodes.map((n) => [n.key, n]));

    return (
        <div className="relative h-full w-full">
            <svg
                width="440"
                height="280"
                viewBox="0 0 440 280"
                className="node-graph absolute top-0 left-0 pointer-events-none"
                aria-hidden="true"
            >
                <g
                    stroke="var(--tf-tape-shadow)"
                    strokeWidth="1.5"
                    strokeDasharray="5 6"
                    strokeLinecap="round"
                    fill="none"
                >
                    {edges.map(([a, b, opacity], i) => (
                        <line
                            key={`${a}-${b}-${i}`}
                            x1={byKey[a].x}
                            y1={byKey[a].y}
                            x2={byKey[b].x}
                            y2={byKey[b].y}
                            opacity={opacity}
                        />
                    ))}
                </g>
                {nodes.map((n) => (
                    <circle
                        key={n.key}
                        className={n.pulse ? 'pulse' : undefined}
                        cx={n.x}
                        cy={n.y}
                        r={n.r}
                        fill={n.fill}
                    />
                ))}
            </svg>

            {nodes.map((n) => (
                <div
                    key={`${n.key}-label`}
                    className="absolute text-[11px] font-semibold uppercase tracking-wider"
                    style={{
                        top: n.y + n.labelOffsetY,
                        left: n.x + n.labelOffsetX,
                        color: 'var(--theme-surface-on-page)',
                        opacity: 0.8,
                    }}
                >
                    {n.label}
                </div>
            ))}
        </div>
    );
}
