import { Head, useForm, usePage } from '@inertiajs/react';

import Button from '../components/ui/Button';
import ButtonLink from '../components/ui/ButtonLink';
import Card from '../components/ui/Card';
import Container from '../components/ui/Container';
import Logo from '../components/ui/Logo';
import ModeToggle from '../components/theme/ModeToggle';

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

    return (
        <>
            <Head title="Welcome" />
            <main
                className="flex min-h-screen items-center justify-center"
                style={{
                    background: 'var(--theme-surface-page)',
                    color: 'var(--theme-surface-on-page)',
                    padding: '2rem',
                }}
            >
                <Container width="narrow" padding="none" className="w-full">
                    <Card>
                        <div className="flex flex-col items-center text-center">
                            <Logo className="size-12" />

                            <h1
                                className="mt-4 text-3xl font-bold"
                                style={{
                                    fontFamily: 'var(--theme-typography-heading-family)',
                                }}
                            >
                                {appName}
                            </h1>

                            <p
                                className="mt-2 text-sm"
                                style={{ opacity: 0.7 }}
                            >
                                An AI-aware EAV worldbuilding framework for Laravel.
                            </p>

                            {user ? (
                                <div className="mt-6 flex flex-col items-center gap-3">
                                    <p className="text-base">
                                        Signed in as{' '}
                                        <span className="font-semibold">{user.name}</span>
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => logoutForm.post('/logout')}
                                        loading={logoutForm.processing}
                                    >
                                        Sign out
                                    </Button>
                                </div>
                            ) : (
                                <div className="mt-6 flex gap-3 flex-wrap justify-center">
                                    {loginUrl && (
                                        <ButtonLink href={loginUrl} variant="primary">
                                            Sign in
                                        </ButtonLink>
                                    )}
                                    {registerUrl && (
                                        <ButtonLink href={registerUrl} variant="ghost">
                                            Create account
                                        </ButtonLink>
                                    )}
                                </div>
                            )}

                            <div className="mt-6">
                                <ModeToggle />
                            </div>
                        </div>
                    </Card>
                </Container>
            </main>
        </>
    );
}
