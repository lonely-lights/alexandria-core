import { Head, useForm } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';
import Logo from '@alexandria/components/ui/Logo';
import { ThemeProvider } from '@alexandria/hooks/useTheme';
import ModeToggle from '@alexandria/components/theme/ModeToggle';

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
        <ThemeProvider>
            <Head title="Verify Email" />

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
                                <span className="text-sm tracking-wide">almost there</span>
                            </footer>
                        </blockquote>
                    </div>
                </div>

                {/* RIGHT PANEL — Action */}
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
                                Check your email
                            </h2>
                            <p className="text-base-content/60">{copy['verification.intro']}</p>
                        </div>

                        {/* Status message */}
                        {status === 'verification-link-sent' && (
                            <div className="rounded-lg bg-success/10 border border-success/20 p-4 text-success text-sm">
                                {copy['verification_sent']}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row items-stretch gap-3">
                            <form onSubmit={handleResend} className="flex-1">
                                <button
                                    type="submit"
                                    disabled={resendForm.processing}
                                    className="w-full inline-flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-50"
                                >
                                    <span className="btn-offset w-full px-7 py-4 rounded-lg inline-flex items-center justify-center gap-2">
                                        <span>{copy['resend_verification']}</span>
                                        <span aria-hidden="true">→</span>
                                    </span>
                                </button>
                            </form>

                            <form onSubmit={handleLogout} className="flex-1">
                                <button
                                    type="submit"
                                    disabled={logoutForm.processing}
                                    className="btn btn-ghost w-full font-medium text-base-content/70 hover:text-base-content disabled:opacity-50"
                                >
                                    Log out
                                </button>
                            </form>
                        </div>

                        {/* Terms footer */}
                        <p className="text-center text-xs text-base-content/40 pt-4">
                            <a href={termsUrl} className="underline hover:text-base-content/60 transition-colors">
                                {copy['terms_of_service']}
                            </a>
                            {' · '}
                            <a href={privacyUrl} className="underline hover:text-base-content/60 transition-colors">
                                {copy['privacy_policy']}
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </ThemeProvider>
    );
}
