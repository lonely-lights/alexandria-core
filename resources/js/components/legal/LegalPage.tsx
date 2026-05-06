import { Head } from '@inertiajs/react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';

import AppLayout from '../../layouts/AppLayout';
import Container from '../ui/Container';

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

const headingFont: CSSProperties = {
    fontFamily: 'var(--theme-typography-heading-family)',
};

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

            <Container width="standard" padding="generous">
                {/* Header */}
                <div className="mb-12">
                    <div
                        className="mb-3 text-[11px] font-semibold uppercase tracking-[.25em]"
                        style={{ color: 'var(--theme-brand-primary-500)', opacity: 0.8 }}
                    >
                        Legal
                    </div>
                    <h1
                        className="mb-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl"
                        style={{
                            ...headingFont,
                            color: 'var(--theme-surface-on-page)',
                        }}
                    >
                        {title}
                    </h1>
                    <p style={{ color: 'var(--theme-surface-on-page)', opacity: 0.6 }}>
                        {lastUpdated}
                    </p>
                </div>

                {/* Placeholder Callout */}
                {placeholderDescription && (
                    <div
                        role="note"
                        className="mb-10 p-6 flex gap-3"
                        style={{
                            border: '1px solid var(--theme-status-warning-stroke)',
                            background: 'var(--theme-status-warning-subtle)',
                            borderRadius: 'var(--theme-radius-card)',
                        }}
                    >
                        <svg
                            className="mt-0.5 h-6 w-6 flex-shrink-0"
                            style={{ color: 'var(--theme-status-warning-stroke)' }}
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
                            <h3
                                className="mb-1 font-semibold"
                                style={{ color: 'var(--theme-status-warning-stroke)' }}
                            >
                                {placeholderTitle}
                            </h3>
                            <p
                                className="text-sm"
                                style={{
                                    color: 'var(--theme-surface-on-page)',
                                    opacity: 0.7,
                                }}
                            >
                                {placeholderDescription}
                            </p>
                        </div>
                    </div>
                )}

                {/* Body */}
                <div
                    className="max-w-none leading-relaxed"
                    style={{ color: 'var(--theme-surface-on-page)', opacity: 0.85 }}
                >
                    {children}
                </div>

                {/* Back Link */}
                <div
                    className="mt-12 pt-8"
                    style={{ borderTop: '1px solid var(--theme-neutral-300)' }}
                >
                    <a
                        href="/"
                        onClick={handleBack}
                        className="inline-flex items-center gap-2"
                        style={{
                            color: 'var(--theme-brand-primary-500)',
                            transition:
                                'opacity var(--theme-motion-duration-fast) var(--theme-motion-easing-standard)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.8';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                        }}
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
            </Container>
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
            <h2
                className="mb-4 text-2xl font-bold tracking-tight"
                style={{
                    ...headingFont,
                    color: 'var(--theme-surface-on-page)',
                }}
            >
                {n}. {heading}
            </h2>
            <div
                className="space-y-3"
                style={{ color: 'var(--theme-surface-on-page)', opacity: 0.85 }}
            >
                {children}
            </div>
        </section>
    );
}

/**
 * Sub-heading inside a LegalSection (used by Privacy's nested
 * "Personal Information" / "Automatically Collected" structure).
 */
export function SubHeading({ children }: { children: ReactNode }) {
    return (
        <h3
            className="mb-2 mt-6 text-lg font-semibold tracking-tight"
            style={{
                ...headingFont,
                color: 'var(--theme-surface-on-page)',
            }}
        >
            {children}
        </h3>
    );
}

/**
 * Bulleted list (used by Privacy for the data-collection enumerations).
 */
export function BulletList({ items }: { items: string[] }) {
    return (
        <ul className="list-disc space-y-1.5 pl-6">
            {items.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    );
}
