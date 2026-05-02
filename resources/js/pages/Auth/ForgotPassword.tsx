import { Head, useForm } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';
import Logo from '@alexandria/components/ui/Logo';
import { ThemeProvider } from '@alexandria/hooks/useTheme';
import ModeToggle from '@alexandria/components/theme/ModeToggle';

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
    const form = useForm({
        email: '',
    });

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        form.post('/forgot-password');
    };

    return (
        <ThemeProvider>
            <Head title="Forgot your password?" />

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
                                    d="M 100 40 Q 200 0 300 50 Q 380 110 240 140 Q 150 175 130 240"
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
                            <footer className="flex items-center gap-3 text-base-content/50">
                                <div className="w-10 h-px bg-primary/50" />
                                <span className="text-sm tracking-wide">one note away</span>
                            </footer>
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
                                Forgot your password?
                            </h2>
                            <p className="text-base-content/60">{copy['forgot_password.intro']}</p>
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
                                        className="input input-bordered w-full pl-12 bg-base-200/50 border-base-300 focus:border-primary focus:outline-primary transition-all"
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="w-full inline-flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-50"
                            >
                                <span className="btn-offset w-full px-7 py-4 rounded-lg inline-flex items-center justify-center gap-2">
                                    <span>{copy['email_reset_link']}</span>
                                    <span aria-hidden="true">→</span>
                                </span>
                            </button>
                        </form>

                        {/* Back to login link */}
                        <p className="text-center text-base-content/60">
                            Remembered it?{' '}
                            <a
                                href={loginUrl}
                                className="font-semibold text-primary hover:text-primary/80 transition-colors"
                            >
                                {copy['login']}
                            </a>
                        </p>

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
