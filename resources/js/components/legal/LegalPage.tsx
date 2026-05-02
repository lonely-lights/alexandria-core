import { Head } from '@inertiajs/react';
import type { MouseEvent, ReactNode } from 'react';

import AppLayout from '../../layouts/AppLayout';

interface LegalPageProps {
    /** Copy bag from the consumer's controller (Arr::dot of lang/en/app/legal). */
    copy: Record<string, string>;

    /** Copy key for the page title (e.g. 'terms.title' or 'privacy.title'). */
    titleKey: string;

    /** Copy key for the last-updated template (e.g. 'terms.last_updated'). */
    lastUpdatedKey: string;

    /** Default title rendered when the copy key is missing. */
    defaultTitle: string;

    /** Default body rendered when the copy['placeholder.description'] is missing. */
    children: ReactNode;
}

/**
 * Shared scaffold for /terms + /privacy. Owns the page chrome
 * (kicker label, serif title, last-updated stamp, optional warning
 * callout when the consumer ships placeholder content, body, back
 * link). Each Legal page just supplies its sections via children.
 */
export default function LegalPage({
    copy,
    titleKey,
    lastUpdatedKey,
    defaultTitle,
    children,
}: LegalPageProps) {
    const title = copy[titleKey] ?? defaultTitle;
    const lastUpdatedTemplate =
        copy[lastUpdatedKey] ?? 'Last updated: :date';
    const lastUpdated = lastUpdatedTemplate.replace(':date', 'December 2025');
    const placeholderTitle = copy['placeholder.title'] ?? 'Placeholder Content';
    const placeholderDescription = copy['placeholder.description'] ?? '';
    const backLabel = copy['back'] ?? 'Go back';

    function handleBack(e: MouseEvent<HTMLAnchorElement>) {
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
                                <h3 className="mb-1 font-semibold text-warning">
                                    {placeholderTitle}
                                </h3>
                                <p className="text-sm text-base-content/70">
                                    {placeholderDescription}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="max-w-none text-base-content/80 leading-relaxed">
                    {children}
                </div>

                {/* Back Link */}
                <div className="mt-12 border-t border-base-300 pt-8">
                    <a
                        href="/"
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 text-primary transition-colors hover:text-primary/80"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                        {backLabel}
                    </a>
                </div>
            </div>
        </AppLayout>
    );
}

/**
 * Numbered section heading + body. Used for top-level sections
 * inside a LegalPage's children.
 */
export function LegalSection({
    n,
    heading,
    children,
}: {
    n: string;
    heading: string;
    children: ReactNode;
}) {
    return (
        <section className="mt-10 first:mt-0">
            <h2 className="mb-4 font-serif text-2xl font-bold tracking-tight text-base-content">
                {n}. {heading}
            </h2>
            <div className="space-y-3 text-base-content/80">{children}</div>
        </section>
    );
}

/**
 * Sub-heading inside a LegalSection (used by Privacy's nested
 * "Personal Information" / "Automatically Collected" structure).
 */
export function SubHeading({ children }: { children: ReactNode }) {
    return (
        <h3 className="mb-2 mt-6 font-serif text-lg font-semibold tracking-tight text-base-content">
            {children}
        </h3>
    );
}

/**
 * Bulleted list (used by Privacy for the data-collection enumerations).
 */
export function BulletList({ items }: { items: string[] }) {
    return (
        <ul className="list-disc space-y-1.5 pl-6 marker:text-base-content/40">
            {items.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    );
}
