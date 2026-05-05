import { Head, useForm } from '@inertiajs/react';
import { useState, type SyntheticEvent } from 'react';
import Logo from '@alexandria/components/ui/Logo';
import { ThemeProvider } from '@alexandria/hooks/useTheme';
import ModeToggle from '@alexandria/components/theme/ModeToggle';

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

    return (
        <ThemeProvider>
            <Head title={copy['two_factor.challenge.title']} />

            <div className="min-h-screen flex bg-base-100 text-base-content font-sans">
                {/* LEFT PANEL — Atmospheric brand side (hidden on mobile) */}
                <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-base-200">
                    <div className="absolute inset-0 grid-paper opacity-60" aria-hidden="true" />

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
                        <div className="flex items-center gap-4">
                            <Logo size="3em" />
                            <div>
                                <h1 className="font-serif text-3xl font-bold tracking-tight">Alexandria</h1>
                                <p className="text-xs text-base-content/60 tracking-[.3em] uppercase mt-1">A workbench for world makers</p>
                            </div>
                        </div>

                        <blockquote className="space-y-3 max-w-md">
                            <p className="font-serif text-2xl xl:text-3xl leading-tight italic text-base-content/85">
                                "A second key for the second lock."
                            </p>
                            <footer className="flex items-center gap-3 text-base-content/50">
                                <div className="w-10 h-px bg-primary/50" />
                                <span className="text-sm tracking-wide">stay safe</span>
                            </footer>
                        </blockquote>
                    </div>
                </div>

                {/* RIGHT PANEL — Form */}
                <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12 bg-base-100 relative">
                    <div className="absolute top-4 right-4 hidden sm:flex items-center gap-2">
                        <ModeToggle />
                    </div>

                    <div className="w-full max-w-md space-y-8">
                        <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                            <Logo size="2em" />
                            <span className="font-serif text-2xl font-bold">Alexandria</span>
                        </div>

                        <div className="space-y-2">
                            <h2 className="font-serif text-4xl font-bold leading-tight">
                                {copy['two_factor.challenge.title']}
                            </h2>
                            <p className="text-base-content/60">{copy['two_factor.challenge.intro']}</p>
                        </div>

                        {Object.keys(form.errors).length > 0 && (
                            <div className="rounded-lg bg-error/10 border border-error/20 p-4 text-error text-sm space-y-1">
                                {Object.values(form.errors).map((err) => (
                                    <p key={err}>{err}</p>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {usingRecovery ? (
                                <div className="space-y-2">
                                    <label htmlFor="recovery_code" className="block text-sm font-medium text-base-content/80">
                                        {copy['two_factor.challenge.recovery_label']}
                                    </label>
                                    <input
                                        type="text"
                                        id="recovery_code"
                                        name="recovery_code"
                                        value={form.data.recovery_code}
                                        onChange={(e) => form.setData('recovery_code', e.target.value)}
                                        required
                                        autoFocus
                                        autoComplete="one-time-code"
                                        className="input input-bordered w-full bg-base-200/50 border-base-300 focus:border-primary focus:outline-primary transition-all font-mono"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label htmlFor="code" className="block text-sm font-medium text-base-content/80">
                                        {copy['two_factor.challenge.code_label']}
                                    </label>
                                    <input
                                        type="text"
                                        id="code"
                                        name="code"
                                        value={form.data.code}
                                        onChange={(e) => form.setData('code', e.target.value)}
                                        required
                                        autoFocus
                                        autoComplete="one-time-code"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        className="input input-bordered w-full bg-base-200/50 border-base-300 focus:border-primary focus:outline-primary transition-all font-mono tracking-widest text-center text-lg"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={form.processing}
                                className="w-full inline-flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-50"
                            >
                                <span className="btn-offset w-full px-7 py-4 rounded-lg inline-flex items-center justify-center gap-2">
                                    <span>{copy['two_factor.challenge.submit']}</span>
                                    <span aria-hidden="true">→</span>
                                </span>
                            </button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={toggleMode}
                                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                                >
                                    {usingRecovery ? copy['two_factor.challenge.use_authentication'] : copy['two_factor.challenge.use_recovery']}
                                </button>
                            </div>
                        </form>

                        <p className="text-center text-xs text-base-content/40 pt-4">
                            <a href={termsUrl} className="underline hover:text-base-content/60 transition-colors">
                                {copy['legal.terms_of_service']}
                            </a>
                            {' · '}
                            <a href={privacyUrl} className="underline hover:text-base-content/60 transition-colors">
                                {copy['legal.privacy_policy']}
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </ThemeProvider>
    );
}
