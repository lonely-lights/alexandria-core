import { Link, usePage } from '@inertiajs/react';

import AppLayout from '../layouts/AppLayout';

interface AuthShared {
    user?: {
        name?: string | null;
        email?: string | null;
    } | null;
}

interface SharedProps {
    auth?: AuthShared;
    name?: string;
    [key: string]: unknown;
}

export default function Dashboard() {
    const page = usePage<SharedProps>();
    const user = page.props.auth?.user ?? null;

    return (
        <AppLayout
            title="Dashboard"
            sidebarBody={
                <nav className="flex flex-col gap-1">
                    <Link
                        href="/dashboard"
                        className="btn btn-ghost btn-sm justify-start"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/account"
                        className="btn btn-ghost btn-sm justify-start"
                    >
                        Account
                    </Link>
                </nav>
            }
        >
            <main className="container mx-auto px-4 py-8">
                <div className="card bg-base-200 shadow">
                    <div className="card-body">
                        <h1 className="card-title text-2xl">
                            Welcome, {user?.name ?? 'friend'}.
                        </h1>
                        <p className="text-base-content/70">
                            You're signed in. This is your dashboard — content
                            slices land here as the framework's stages
                            progress.
                        </p>
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}
