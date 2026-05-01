import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';

import ModeToggle from '../components/theme/ModeToggle';
import Logo from '../components/ui/Logo';

interface WelcomeProps {
    loginUrl: string | null;
    registerUrl: string | null;
}

interface AuthShared {
    user?: {
        name: string;
        email: string;
    } | null;
}

interface SharedProps {
    auth?: AuthShared;
    name?: string;
    [key: string]: unknown;
}

export default function Welcome({ loginUrl, registerUrl }: WelcomeProps) {
    const page = usePage<SharedProps>();
    const user = page.props.auth?.user ?? null;
    const appName = page.props.name ?? 'Alexandria';

    const logoutForm = useForm({});

    const submitLogout = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        logoutForm.post('/logout');
    };

    return (
        <>
            <Head title="Welcome" />
            <main className="flex min-h-screen items-center justify-center bg-base-100 p-8">
                <div className="card w-full max-w-md bg-base-200 shadow-xl">
                    <div className="card-body items-center text-center">
                        <Logo className="size-12" />
                        <h1 className="mt-4 card-title text-3xl">{appName}</h1>
                        <p className="mt-2 text-sm text-base-content/70">
                            An AI-aware EAV worldbuilding framework for Laravel.
                        </p>

                        {user ? (
                            <div className="mt-6 flex flex-col items-center gap-3">
                                <p className="text-base">
                                    Signed in as{' '}
                                    <span className="font-semibold">
                                        {user.name}
                                    </span>
                                </p>
                                <form onSubmit={submitLogout}>
                                    <button
                                        type="submit"
                                        className="btn btn-ghost btn-sm"
                                        disabled={logoutForm.processing}
                                    >
                                        Sign out
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="mt-6 flex gap-3">
                                {loginUrl && (
                                    <Link
                                        href={loginUrl}
                                        className="btn btn-primary"
                                    >
                                        Sign in
                                    </Link>
                                )}
                                {registerUrl && (
                                    <Link
                                        href={registerUrl}
                                        className="btn btn-ghost"
                                    >
                                        Create account
                                    </Link>
                                )}
                            </div>
                        )}

                        <div className="mt-6 card-actions">
                            <ModeToggle />
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
