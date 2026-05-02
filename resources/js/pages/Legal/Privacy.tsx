import { Head, usePage } from '@inertiajs/react';

import AppLayout from '../../layouts/AppLayout';

interface PrivacyProps {
    copy: Record<string, string>;
}

export default function Privacy() {
    const { copy } = usePage<{ props: PrivacyProps }>().props as unknown as PrivacyProps;

    const title = copy['privacy.title'] ?? 'Privacy Policy';
    const lastUpdatedTemplate = copy['privacy.last_updated'] ?? 'Last updated: :date';
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
                    <LegalSection n="1" heading="Information We Collect">
                        <p>We collect information you provide directly to us, such as when you create an account, create content, or contact us for support.</p>

                        <SubHeading>Personal Information</SubHeading>
                        <BulletList
                            items={[
                                'Account information (username, email, password)',
                                'Profile information (display name, avatar, bio)',
                                'Content you create (projects, entries, notes)',
                            ]}
                        />

                        <SubHeading>Automatically Collected Information</SubHeading>
                        <BulletList
                            items={[
                                'Log data (IP address, browser type, pages visited)',
                                'Device information',
                                'Usage patterns',
                            ]}
                        />
                    </LegalSection>

                    <LegalSection n="2" heading="How We Use Your Information">
                        <p>We use the information we collect to:</p>
                        <BulletList
                            items={[
                                'Provide, maintain, and improve our services',
                                'Process transactions and send related information',
                                'Send technical notices, updates, and support messages',
                                'Respond to your comments, questions, and requests',
                            ]}
                        />
                    </LegalSection>

                    <LegalSection n="3" heading="Information Sharing">
                        <p>We do not sell, trade, or otherwise transfer your personal information to outside parties except as described in this policy.</p>
                    </LegalSection>

                    <LegalSection n="4" heading="Data Security">
                        <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
                    </LegalSection>

                    <LegalSection n="5" heading="Your Rights">
                        <p>You have the right to access, update, or delete your personal information at any time through your account settings.</p>
                    </LegalSection>

                    <LegalSection n="6" heading="Contact Us">
                        <p>If you have questions about this Privacy Policy, please contact us.</p>
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

function SubHeading({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="mb-2 mt-6 font-serif text-lg font-semibold tracking-tight text-base-content">
            {children}
        </h3>
    );
}

function BulletList({ items }: { items: string[] }) {
    return (
        <ul className="list-disc space-y-1.5 pl-6 marker:text-base-content/40">
            {items.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    );
}
