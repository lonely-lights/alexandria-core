import { Head, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import Logo from '@alexandria/components/ui/Logo';
import PasswordRulesPopover, { evaluatePasswordRules } from '@alexandria/components/form/PasswordRulesPopover';
import { ToastProvider, useToastContext } from '@alexandria/components/ui/ToastProvider';
import { ThemeProvider } from '@alexandria/hooks/useTheme';
import ModeToggle from '@alexandria/components/theme/ModeToggle';

interface AvailabilityState {
    status: 'idle' | 'checking' | 'available' | 'taken';
    message: string | null;
}

interface RegisterProps {
    copy: Record<string, string>;
    loginUrl: string;
    termsUrl: string;
    privacyUrl: string;
}

export default function Register(props: RegisterProps) {
    // ToastProvider must wrap RegisterForm so the form body can call
    // useToastContext(). ThemeProvider stays outside so theme tokens
    // resolve before the toast renders into the portal.
    return (
        <ThemeProvider>
            <ToastProvider>
                <RegisterForm {...props} />
            </ToastProvider>
        </ThemeProvider>
    );
}

function RegisterForm({
    copy,
    loginUrl,
    termsUrl,
    privacyUrl,
}: RegisterProps) {
    const { show: showToast } = useToastContext();
    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        terms: false as boolean,
    });

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        form.post('/register');
    };

    // PasswordRulesPopover anchor + focus state for live rule feedback.
    // Callback ref pattern (useState, not useRef) avoids React 19's
    // react-hooks/refs rule against reading .current during render.
    // Tracking focus on both fields so the popover stays open (showing
    // the 'Passwords match' rule) while the user is typing in confirm.
    const [passwordEl, setPasswordEl] = useState<HTMLInputElement | null>(null);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [confirmationFocused, setConfirmationFocused] = useState(false);

    // All-rules-passed flag drives the success border on BOTH password
    // inputs. Same predicate as the popover so the visual-state stays
    // in sync with the rule list the user sees.
    const passwordsValid = evaluatePasswordRules(form.data.password, {
        confirmation: form.data.password_confirmation,
    }).allPassed;

    // ── Live availability checks ─────────────────────────────────────────
    const [usernameStatus, setUsernameStatus] = useState<AvailabilityState>({ status: 'idle', message: null });
    const [emailStatus, setEmailStatus] = useState<AvailabilityState>({ status: 'idle', message: null });
    const usernameTimer = useRef<number | null>(null);
    const emailTimer = useRef<number | null>(null);

    function csrfToken(): string {
        return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    }

    // Debounced availability check for the username field.
    useEffect(() => {
        if (usernameTimer.current) window.clearTimeout(usernameTimer.current);
        const name = form.data.name.trim();
        if (!name) {
            setUsernameStatus({ status: 'idle', message: null });
            return;
        }
        setUsernameStatus({ status: 'checking', message: null });
        usernameTimer.current = window.setTimeout(() => {
            fetch('/register/check-username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ username: name }),
            })
                .then((r) => r.json())
                .then((body: { available: boolean | null; message: string | null }) => {
                    if (body.available === null) {
                        setUsernameStatus({ status: 'idle', message: body.message });
                    } else {
                        setUsernameStatus({
                            status: body.available ? 'available' : 'taken',
                            message: body.message,
                        });
                    }
                })
                .catch(() => setUsernameStatus({ status: 'idle', message: null }));
        }, 400);
    }, [form.data.name]);

    // Debounced availability check for the email field.
    useEffect(() => {
        if (emailTimer.current) window.clearTimeout(emailTimer.current);
        const email = form.data.email.trim();
        if (!email || !email.includes('@') || !email.includes('.')) {
            setEmailStatus({ status: 'idle', message: null });
            return;
        }
        setEmailStatus({ status: 'checking', message: null });
        emailTimer.current = window.setTimeout(() => {
            fetch('/register/check-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ email }),
            })
                .then((r) => r.json())
                .then((body: { available: boolean | null; message: string | null }) => {
                    setEmailStatus({
                        status: body.available ? 'available' : 'taken',
                        message: body.message,
                    });
                })
                .catch(() => setEmailStatus({ status: 'idle', message: null }));
        }, 500);
    }, [form.data.email]);

    // Fire a toast whenever the username availability check resolves to
    // an actionable state (skip 'checking'/'idle' to avoid noise). The
    // input still shows a status icon — the toast just replaces the
    // inline message row that used to live below it (which caused
    // layout shifts as the user typed).
    useEffect(() => {
        if (usernameStatus.status === 'available') {
            showToast(usernameStatus.message ?? 'Username is available.', {
                type: 'success',
            });
        } else if (usernameStatus.status === 'taken') {
            showToast(usernameStatus.message ?? 'Username is already in use.', {
                type: 'warning',
            });
        }
    }, [usernameStatus.status, usernameStatus.message, showToast]);

    useEffect(() => {
        if (emailStatus.status === 'available') {
            showToast(emailStatus.message ?? 'Email is available.', {
                type: 'success',
            });
        } else if (emailStatus.status === 'taken') {
            showToast(emailStatus.message ?? 'Email is already registered.', {
                type: 'warning',
            });
        }
    }, [emailStatus.status, emailStatus.message, showToast]);

    // Build the terms agreement line by replacing :terms_of_service / :privacy_policy placeholders.
    const agreeTemplate = copy['agree_terms_privacy'] ?? 'I agree to the :terms_of_service and :privacy_policy.';
    const termsLabel = copy['terms_of_service'] ?? 'Terms of Service';
    const privacyLabel = copy['privacy_policy'] ?? 'Privacy Policy';
    const termsRegex = /(:terms_of_service|:privacy_policy)/g;
    const agreeParts = agreeTemplate.split(termsRegex);

    return (
        <>
            <Head title={copy['enlist'] ?? 'Register'} />

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

                        {/* Motif cluster — sticky notes + pencil path */}
                        <div className="relative h-[280px] w-full max-w-[440px]">
                            {/* Dashed pencil path connecting sticky notes */}
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

                            {/* Sticky notes */}
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
                                Join the workbench
                            </h2>
                            <p className="text-base-content/60">{copy['registration.intro']}</p>
                        </div>

                        {/* Validation errors */}
                        {Object.keys(form.errors).length > 0 && (
                            <div className="rounded-lg bg-error/10 border border-error/20 p-4 text-error text-sm space-y-1">
                                {Object.values(form.errors).map((err) => (
                                    <p key={err}>{err}</p>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Name */}
                            <div className="space-y-2">
                                <label htmlFor="name" className="block text-sm font-medium text-base-content/80">
                                    {copy['name']}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-base-content/40">
                                        <i className="fa-solid fa-user" aria-hidden="true" />
                                    </div>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        required
                                        autoFocus
                                        autoComplete="username"
                                        placeholder="letters, numbers, dashes, underscores"
                                        className={`input input-bordered w-full pl-12 pr-10 bg-base-200/50 transition-all ${
                                            usernameStatus.status === 'available'
                                                ? 'border-success focus:border-success focus:outline-success'
                                                : usernameStatus.status === 'taken'
                                                    ? 'border-error focus:border-error focus:outline-error'
                                                    : 'border-base-300 focus:border-primary focus:outline-primary'
                                        }`}
                                    />
                                    <AvailabilityIndicator state={usernameStatus} />
                                </div>
                                {/* Static helper — the live availability
                                    state surfaces via toast (no layout
                                    shift) plus the icon inside the input. */}
                                <p className="text-xs text-base-content/60">
                                    3–30 characters. This will be your unique identifier.
                                </p>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-sm font-medium text-base-content/80">
                                    {copy['email']}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-base-content/40">
                                        <i className="fa-solid fa-envelope" aria-hidden="true" />
                                    </div>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={form.data.email}
                                        onChange={(e) => form.setData('email', e.target.value)}
                                        required
                                        autoComplete="username"
                                        placeholder="you@example.com"
                                        className={`input input-bordered w-full pl-12 pr-10 bg-base-200/50 transition-all ${
                                            emailStatus.status === 'available'
                                                ? 'border-success focus:border-success focus:outline-success'
                                                : emailStatus.status === 'taken'
                                                    ? 'border-error focus:border-error focus:outline-error'
                                                    : 'border-base-300 focus:border-primary focus:outline-primary'
                                        }`}
                                    />
                                    <AvailabilityIndicator state={emailStatus} />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-medium text-base-content/80">
                                    {copy['password']}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-base-content/40">
                                        <i className="fa-solid fa-lock" aria-hidden="true" />
                                    </div>
                                    <input
                                        ref={setPasswordEl}
                                        type="password"
                                        id="password"
                                        name="password"
                                        value={form.data.password}
                                        onChange={(e) => form.setData('password', e.target.value)}
                                        onFocus={() => setPasswordFocused(true)}
                                        onBlur={() => setPasswordFocused(false)}
                                        required
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        className={`input input-bordered w-full pl-12 bg-base-200/50 transition-all ${
                                            passwordsValid
                                                ? 'border-success focus:border-success focus:outline-success'
                                                : 'border-base-300 focus:border-primary focus:outline-primary'
                                        }`}
                                    />
                                    <PasswordRulesPopover
                                        value={form.data.password}
                                        confirmation={form.data.password_confirmation}
                                        open={passwordFocused || confirmationFocused}
                                        anchor={passwordEl}
                                    />
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <label htmlFor="password_confirmation" className="block text-sm font-medium text-base-content/80">
                                    {copy['confirm_password']}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-base-content/40">
                                        <i className="fa-solid fa-lock" aria-hidden="true" />
                                    </div>
                                    <input
                                        type="password"
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        value={form.data.password_confirmation}
                                        onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                        onFocus={() => setConfirmationFocused(true)}
                                        onBlur={() => setConfirmationFocused(false)}
                                        required
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        className={`input input-bordered w-full pl-12 bg-base-200/50 transition-all ${
                                            passwordsValid
                                                ? 'border-success focus:border-success focus:outline-success'
                                                : 'border-base-300 focus:border-primary focus:outline-primary'
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Terms */}
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={form.data.terms}
                                    onChange={(e) => form.setData('terms', e.target.checked)}
                                    required
                                    className="checkbox checkbox-primary checkbox-sm mt-0.5"
                                />
                                <label htmlFor="terms" className="text-sm text-base-content/70 cursor-pointer select-none">
                                    {agreeParts.map((part, i) => {
                                        if (part === ':terms_of_service') {
                                            return (
                                                <a
                                                    key={i}
                                                    href={termsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="underline hover:text-base-content transition-colors"
                                                >
                                                    {termsLabel}
                                                </a>
                                            );
                                        }
                                        if (part === ':privacy_policy') {
                                            return (
                                                <a
                                                    key={i}
                                                    href={privacyUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="underline hover:text-base-content transition-colors"
                                                >
                                                    {privacyLabel}
                                                </a>
                                            );
                                        }
                                        return <span key={i}>{part}</span>;
                                    })}
                                </label>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="w-full inline-flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-50"
                            >
                                <span className="btn-offset w-full px-7 py-4 rounded-lg inline-flex items-center justify-center gap-2">
                                    <span>{copy['enlist']}</span>
                                    <span aria-hidden="true">→</span>
                                </span>
                            </button>
                        </form>

                        {/* Sign-in link */}
                        <p className="text-center text-base-content/60">
                            {copy['already_registered']}{' '}
                            <a
                                href={loginUrl}
                                className="font-semibold text-primary hover:text-primary/80 transition-colors"
                            >
                                {copy['login']}
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

function AvailabilityIndicator({ state }: { state: AvailabilityState }) {
    if (state.status === 'idle') return null;
    return (
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            {state.status === 'checking' && (
                <span className="loading loading-spinner loading-xs text-base-content/40" aria-label="Checking availability" />
            )}
            {state.status === 'available' && (
                <i className="fa-solid fa-circle-check text-success" aria-hidden="true" />
            )}
            {state.status === 'taken' && (
                <i className="fa-solid fa-circle-xmark text-error" aria-hidden="true" />
            )}
        </div>
    );
}

