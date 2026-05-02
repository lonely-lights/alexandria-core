import { Head, usePage } from '@inertiajs/react';

import AppLayout from '../../layouts/AppLayout';

interface TermsProps {
    copy: Record<string, string>;
}

export default function Terms() {
    const { copy } = usePage<{ props: TermsProps }>().props as unknown as TermsProps;

    const title = copy['terms.title'] ?? 'Terms of Service';
    const lastUpdatedTemplate = copy['terms.last_updated'] ?? 'Last updated: :date';
    const lastUpdated = lastUpdatedTemplate.replace(':date', 'December 2025');
    const placeholderTitle = copy['placeholder.title'] ?? 'Placeholder Content';
    const placeholderDescription = copy['placeholder.description'] ?? '';
    const backLabel = copy['back'] ?? 'Go back';

    function handleBack(e: React.MouseEvent<HTMLAnchorElement>) {
        e.preventDefault();
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/';
        }
    }

    return (
        <AppLayout title={title}>
            <Head title={title} />

            <div className="container mx-auto max-w-4xl px-6 py-16">
                {/* Header */}
                <div className="mb-12">
                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[.25em] text-primary/80">
                        Legal
                    </div>
                    <h1 className="mb-4 font-serif text-4xl font-bold leading-tight tracking-tight text-base-content md:text-5xl">
                        {title}
                    </h1>
                    <p className="text-base-content/60">{lastUpdated}</p>
                </div>

                {/* Placeholder Callout */}
                {placeholderDescription && (
                    <div className="mb-10 rounded-2xl border border-warning/20 bg-warning/10 p-6">
                        <div className="flex gap-3">
                            <svg
                                className="mt-0.5 h-6 w-6 flex-shrink-0 text-warning"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                            <div>
                                <h3 className="mb-1 font-semibold text-warning">{placeholderTitle}</h3>
                                <p className="text-sm text-base-content/70">{placeholderDescription}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="max-w-none text-base-content/80 leading-relaxed">
                    <LegalSection n="1" heading="Acceptance of Terms">
                        <p>By accessing and using Alexandria, you accept and agree to be bound by the terms and provisions of this agreement.</p>
                    </LegalSection>

                    <LegalSection n="2" heading="Use License">
                        <p>Permission is granted to temporarily use Alexandria for personal, non-commercial transitory viewing only.</p>
                    </LegalSection>

                    <LegalSection n="3" heading="User Content">
                        <p>You retain ownership of any content you create using Alexandria. By using our service, you grant us a license to host and display your content as necessary to provide the service.</p>
                    </LegalSection>

                    <LegalSection n="4" heading="Disclaimer">
                        <p>The materials on Alexandria are provided on an &apos;as is&apos; basis. Alexandria makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties.</p>
                    </LegalSection>

                    <LegalSection n="5" heading="Limitations">
                        <p>In no event shall Alexandria or its suppliers be liable for any damages arising out of the use or inability to use the materials on Alexandria.</p>
                    </LegalSection>

                    <LegalSection n="6" heading="Revisions">
                        <p>Alexandria may revise these terms of service at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.</p>
                    </LegalSection>
                </div>

                {/* Back Link */}
                <div className="mt-12 border-t border-base-300 pt-8">
                    <a
                        href="/"
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 text-primary transition-colors hover:text-primary/80"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        {backLabel}
                    </a>
                </div>
            </div>
        </AppLayout>
    );
}

function LegalSection({ n, heading, children }: { n: string; heading: string; children: React.ReactNode }) {
    return (
        <section className="mt-10 first:mt-0">
            <h2 className="mb-4 font-serif text-2xl font-bold tracking-tight text-base-content">
                {n}. {heading}
            </h2>
            <div className="space-y-3 text-base-content/80">{children}</div>
        </section>
    );
}
