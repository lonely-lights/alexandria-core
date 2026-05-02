import { Head, useForm } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';
import Logo from '@alexandria/components/ui/Logo';
import { ThemeProvider } from '@alexandria/hooks/useTheme';
import ModeToggle from '@alexandria/components/theme/ModeToggle';
import HeroRotator from '@alexandria/components/ui/HeroRotator';

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

    return (
        <ThemeProvider>
            <Head title={copy['login.welcome_back']} />

            <div className="min-h-screen flex bg-base-100 text-base-content font-sans">
                {/* LEFT PANEL — Atmospheric brand side (hidden on mobile) */}
                <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-base-200">
                    {/* Grid paper background */}
                    <div className="absolute inset-0 grid-paper opacity-60" aria-hidden="true" />

                    {/* Ambient amber glow */}
                    <div
                        className="absolute"
                        style={{
                            top: '10%',
                            left: '15%',
                            width: '70%',
                            height: '70%',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle,rgba(251,146,60,.10),transparent 60%)',
                            filter: 'blur(40px)',
                        }}
                        aria-hidden="true"
                    />

                    <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
                        {/* Brand */}
                        <div className="flex items-center gap-4">
                            <Logo size="3em" />
                            <div>
                                <h1 className="font-serif text-3xl font-bold tracking-tight">Alexandria</h1>
                                <p className="text-xs text-base-content/60 tracking-[.3em] uppercase mt-1">A workbench for world makers</p>
                            </div>
                        </div>

                        {/* Motif cluster — rotates between sticky notes + pencil
                            path and a connected-dots graph every 5 seconds. */}
                        <HeroRotator
                            className="h-[280px] w-full max-w-[440px]"
                            interval={5000}
                            panels={[
                                { key: 'papers', ariaLabel: 'Sticky notes cluster', content: <LoginPapersPanel /> },
                                { key: 'dots', ariaLabel: 'Connected ideas graph', content: <LoginDotsPanel /> },
                            ]}
                        />

                        {/* Quote */}
                        <blockquote className="space-y-3 max-w-md">
                            <p className="font-serif text-2xl xl:text-3xl leading-tight italic text-base-content/85">
                                "A story isn't one idea. It's thousands."
                            </p>
                        </blockquote>
                    </div>
                </div>

                {/* RIGHT PANEL — Form */}
                <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12 bg-base-100 relative">
                    {/* Theme toggles, top-right */}
                    <div className="absolute top-4 right-4 hidden sm:flex items-center gap-2">
                        <ModeToggle />
                    </div>

                    <div className="w-full max-w-md space-y-8">
                        {/* Mobile brand */}
                        <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                            <Logo size="2em" />
                            <span className="font-serif text-2xl font-bold">Alexandria</span>
                        </div>

                        <div className="space-y-2">
                            <h2 className="font-serif text-4xl font-bold leading-tight">
                                {copy['login.welcome_back']}
                            </h2>
                            <p className="text-base-content/60">{copy['login.intro']}</p>
                        </div>

                        {/* Status message */}
                        {status && (
                            <div className="rounded-lg bg-success/10 border border-success/20 p-4 text-success text-sm">
                                {status}
                            </div>
                        )}

                        {/* Validation errors */}
                        {Object.keys(form.errors).length > 0 && (
                            <div className="rounded-lg bg-error/10 border border-error/20 p-4 text-error text-sm space-y-1">
                                {Object.values(form.errors).map((err) => (
                                    <p key={err}>{err}</p>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email */}
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-sm font-medium text-base-content/80">
                                    {copy['email']}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-base-content/40">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={form.data.email}
                                        onChange={(e) => form.setData('email', e.target.value)}
                                        required
                                        autoFocus
                                        autoComplete="username"
                                        placeholder="you@example.com"
                                        className="input input-bordered w-full pl-12 bg-base-200/50 border-base-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="block text-sm font-medium text-base-content/80">
                                        {copy['password']}
                                    </label>
                                    {canResetPassword && forgotPasswordUrl && (
                                        <a
                                            href={forgotPasswordUrl}
                                            className="text-sm text-primary hover:text-primary/80 transition-colors"
                                        >
                                            {copy['forgot_password']}
                                        </a>
                                    )}
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-base-content/40">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        value={form.data.password}
                                        onChange={(e) => form.setData('password', e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        className="input input-bordered w-full pl-12 bg-base-200/50 border-base-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Remember */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={form.data.remember}
                                    onChange={(e) => form.setData('remember', e.target.checked)}
                                    className="checkbox checkbox-primary checkbox-sm"
                                />
                                <label htmlFor="remember" className="text-sm text-base-content/70 cursor-pointer select-none">
                                    {copy['remember_me']}
                                </label>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="w-full inline-flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-50"
                            >
                                <span className="btn-offset w-full px-7 py-4 rounded-lg inline-flex items-center justify-center gap-2">
                                    <span>{copy['login']}</span>
                                    <span aria-hidden="true">→</span>
                                </span>
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-base-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-base-100 text-base-content/50">{copy['login.or']}</span>
                            </div>
                        </div>

                        {/* Sign-up link */}
                        {registerUrl && (
                            <p className="text-center text-base-content/60">
                                {copy['have_account']}{' '}
                                <a
                                    href={registerUrl}
                                    className="font-semibold text-primary hover:text-primary/80 transition-colors"
                                >
                                    {copy['signup']}
                                </a>
                            </p>
                        )}

                        {/* Terms footer */}
                        <p className="text-center text-xs text-base-content/40 pt-4">
                            {copy['login.agree_terms']}{' '}
                            <a href={termsUrl} className="underline hover:text-base-content/60 transition-colors">
                                {copy['terms_of_service']}
                            </a>{' '}
                            {copy['login.and']}{' '}
                            <a href={privacyUrl} className="underline hover:text-base-content/60 transition-colors">
                                {copy['privacy_policy']}
                            </a>
                            .
                        </p>
                    </div>
                </div>
            </div>
        </ThemeProvider>
    );
}

/* ── Hero rotator panels ─────────────────────────────────────────── */

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

            <div className="sticky-note sticky-note--yellow absolute text-[15px]" style={{ top: 30, left: 60, width: 170, transform: 'rotate(-4deg)' }}>
                every idea gets a home
            </div>
            <div className="sticky-note sticky-note--sage absolute text-[15px]" style={{ top: 40, right: 40, width: 180, transform: 'rotate(3deg)' }}>
                worlds grow, one note at a time
            </div>
            <div className="sticky-note sticky-note--coral absolute text-[15px]" style={{ top: 160, left: 80, width: 160, transform: 'rotate(-2deg)' }}>
                characters remember
            </div>
            <div className="sticky-note sticky-note--lavender absolute text-[15px]" style={{ top: 200, right: 80, width: 170, transform: 'rotate(2deg)' }}>
                nothing gets lost
            </div>
        </div>
    );
}

/**
 * Connected-dots graph — the Paper re-interpretation of the retired
 * Studio node-graph. Dashed tape-shadow edges, paper-palette nodes,
 * larger nodes pulse via the shared .node-graph CSS. Nodes mirror a
 * tiny slice of a sample worldbuilder dataset so the graph feels like a
 * believable worldbuilding snapshot.
 */
function LoginDotsPanel() {
    const nodes: Array<{ key: string; x: number; y: number; r: number; pulse?: boolean; fill: string; label: string; labelOffsetX: number; labelOffsetY: number }> = [
        { key: 'aurora',    x: 105, y:  60, r: 12, pulse: true,  fill: 'var(--tf-paper-yellow)',   label: 'Aurora',    labelOffsetX:  16, labelOffsetY:   4 },
        { key: 'luna',      x: 325, y:  55, r: 11, pulse: true,  fill: 'var(--tf-paper-coral)',    label: 'Luna',      labelOffsetX: -50, labelOffsetY:   4 },
        { key: 'pricipium', x: 230, y: 150, r: 13, pulse: true,  fill: 'var(--tf-paper-lavender)', label: 'Pricipium', labelOffsetX:  18, labelOffsetY:   4 },
        { key: 'lex',       x: 140, y: 225, r: 10, pulse: true,  fill: 'var(--tf-paper-sage)',     label: 'Lex',       labelOffsetX:  15, labelOffsetY:   4 },
        { key: 'beyond',    x: 370, y: 210, r:  8, pulse: false, fill: 'var(--tf-paper-yellow)',   label: 'Beyond',    labelOffsetX: -60, labelOffsetY:   4 },
    ];

    const edges: Array<[string, string, number]> = [
        ['aurora',    'luna',      0.7],
        ['aurora',    'pricipium', 0.7],
        ['luna',      'pricipium', 0.7],
        ['aurora',    'lex',       0.55],
        ['lex',       'beyond',    0.6],
        ['pricipium', 'beyond',    0.4],
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
                <g stroke="var(--tf-tape-shadow)" strokeWidth="1.5" strokeDasharray="5 6" strokeLinecap="round" fill="none">
                    {edges.map(([a, b, opacity], i) => (
                        <line
                            key={`${a}-${b}-${i}`}
                            x1={byKey[a].x} y1={byKey[a].y}
                            x2={byKey[b].x} y2={byKey[b].y}
                            opacity={opacity}
                        />
                    ))}
                </g>
                {nodes.map((n) => (
                    <circle
                        key={n.key}
                        className={n.pulse ? 'pulse' : undefined}
                        cx={n.x} cy={n.y} r={n.r}
                        fill={n.fill}
                    />
                ))}
            </svg>

            {nodes.map((n) => (
                <div
                    key={`${n.key}-label`}
                    className="absolute text-[11px] font-semibold uppercase tracking-wider text-base-content/80"
                    style={{ top: n.y + n.labelOffsetY, left: n.x + n.labelOffsetX }}
                >
                    {n.label}
                </div>
            ))}
        </div>
    );
}
