import { Head, usePage } from '@inertiajs/react';

import AppLayout from '../../layouts/AppLayout';

interface SharedProps {
    name?: string;
    [key: string]: unknown;
}

interface PrivacyProps {
    /** Translated copy keys (Arr::dot of lang/en/app/legal.php) */
    copy?: Record<string, string>;
}

export default function Privacy({ copy = {} }: PrivacyProps) {
    const page = usePage<SharedProps>();
    const appName = page.props.name ?? 'Alexandria';
    const title = copy['privacy.title'] ?? 'Privacy Policy';
    const lastUpdated = copy['privacy.last_updated'] ?? '';
    const placeholderTitle = copy['placeholder.title'] ?? 'Placeholder content';
    const placeholderDescription =
        copy['placeholder.description'] ??
        'The Privacy Policy text has not been provided yet. Replace this placeholder with your real privacy policy — see docs/integration/frontend-setup.md for the override-via-pull-up pattern.';
    const back = copy['back'] ?? 'Go back';

    return (
        <AppLayout title={title}>
            <Head title={title} />
            <main className="container mx-auto max-w-3xl px-4 py-12">
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="link link-primary text-sm"
                >
                    ← {back}
                </button>

                <h1 className="font-serif mt-6 text-4xl font-bold">{title}</h1>
                {lastUpdated && (
                    <p className="text-base-content/60 mt-2 text-sm">
                        {lastUpdated}
                    </p>
                )}

                <div className="prose prose-base mt-8 max-w-none">
                    <h2>{placeholderTitle}</h2>
                    <p>{placeholderDescription}</p>
                </div>

                <p className="text-base-content/40 mt-12 text-xs">
                    {appName}
                </p>
            </main>
        </AppLayout>
    );
}
