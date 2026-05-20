/**
 * AuthLayout — shared two-panel chrome for the 7 Fortify auth pages.
 *
 * Left panel (hidden on mobile): atmospheric brand surface — paper-grid
 * background, amber radial glow, brand block, decorative motif slot, and
 * a closing blockquote. Right panel: form-side content with optional
 * page header (title + intro), max-w-md container, ModeToggle in the
 * top-right, mobile brand collapse.
 *
 * Decorative motif is intentionally a slot (`motif`) rather than a fixed
 * cluster so each page can show what fits — Login uses an animated
 * HeroRotator (sticky-notes ↔ dot-graph), Register uses static
 * sticky-notes, simpler pages may pass null.
 *
 * Carries forward the legacy "paper-tape" identity verbatim — `--tf-*`
 * decorative-motif tokens stay; only DaisyUI tokens (bg-base-100,
 * text-base-content) are swapped to --theme-* equivalents.
 */

import { Head } from '@inertiajs/react';
import type { CSSProperties, ReactNode } from 'react';

import { brandWordmark } from '../brand/brandStyles';
import ModeToggle from '../theme/ModeToggle';
import Logo from '../ui/Logo';
import QuoteRotator from '../ui/QuoteRotator';

const headingFont: CSSProperties = {
    fontFamily: 'var(--theme-typography-heading-family)',
};

export interface AuthLayoutProps {
    /** <Head> page title. */
    pageTitle: string;

    /** Form-side big heading (h2). */
    formTitle?: string;

    /** Form-side intro paragraph beneath the heading. */
    formIntro?: ReactNode;

    /**
     * Decorative motif rendered between the brand block and the closing
     * blockquote. Pass `null` to skip the cluster entirely (simpler auth
     * pages with less visual real estate).
     */
    motif?: ReactNode;

    /**
     * Closing blockquote slot.
     *   - undefined  → renders the rotating <QuoteRotator /> (default)
     *   - string     → wrapped in the standard blockquote shell
     *   - ReactNode  → rendered as-is (caller controls structure)
     *   - null       → blockquote area dropped entirely
     */
    quote?: ReactNode | null;

    /** Form content. Wrapped in the right-panel max-w-md container. */
    children: ReactNode;
}

export default function AuthLayout({
    pageTitle,
    formTitle,
    formIntro,
    motif,
    quote,
    children,
}: AuthLayoutProps) {
    const quoteContent =
        quote === undefined ? <QuoteRotator /> : quote;
    return (
        <>
            <Head title={pageTitle} />

            <div
                className="min-h-screen flex font-sans"
                style={{
                    background: 'var(--theme-base-page)',
                    color: 'var(--theme-base-content)',
                }}
            >
                {/* LEFT PANEL — atmospheric brand side (hidden on mobile) */}
                <div
                    className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden"
                    style={{ background: 'var(--theme-base-200)' }}
                >
                    {/* Paper-grid background — the "tf-paper" decorative motif */}
                    <div className="grid-paper absolute inset-0 opacity-60" aria-hidden="true" />

                    {/* Ambient amber glow — preserved from legacy auth */}
                    <div
                        className="absolute"
                        style={{
                            top: '10%',
                            left: '15%',
                            width: '70%',
                            height: '70%',
                            borderRadius: '50%',
                            background:
                                'radial-gradient(circle, rgba(251, 146, 60, 0.10), transparent 60%)',
                            filter: 'blur(40px)',
                        }}
                        aria-hidden="true"
                    />

                    <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
                        {/* Brand block */}
                        <div className="flex items-center gap-4">
                            <Logo size="4em" />
                            <div>
                                <h1
                                    className="text-3xl"
                                    style={brandWordmark}
                                >
                                    Alexandria
                                </h1>
                                <p
                                    className="text-xs tracking-[.3em] uppercase mt-1"
                                    style={{
                                        color: 'var(--theme-base-content)',
                                        opacity: 0.6,
                                    }}
                                >
                                    A wordbench for writers
                                </p>
                            </div>
                        </div>

                        {/* Decorative motif slot */}
                        {motif !== null && motif !== undefined && (
                            <div className="h-[280px] w-full max-w-[440px]">{motif}</div>
                        )}

                        {/* Closing blockquote — string content gets wrapped
                            in the default shell; ReactNode content (e.g.
                            QuoteRotator) renders as-is so it can manage its
                            own attribution layout. */}
                        {quoteContent &&
                            (typeof quoteContent === 'string' ? (
                                <blockquote className="space-y-3 max-w-md">
                                    <p
                                        className="text-2xl xl:text-3xl leading-tight italic"
                                        style={{
                                            ...headingFont,
                                            color: 'var(--theme-base-content)',
                                            opacity: 0.85,
                                        }}
                                    >
                                        {quoteContent}
                                    </p>
                                </blockquote>
                            ) : (
                                quoteContent
                            ))}
                    </div>
                </div>

                {/* RIGHT PANEL — form */}
                <div
                    className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12 relative"
                    style={{ background: 'var(--theme-base-page)' }}
                >
                    {/* Theme toggle, top-right */}
                    <div className="absolute top-4 right-4 hidden sm:flex items-center gap-2">
                        <ModeToggle />
                    </div>

                    <div className="w-full max-w-md space-y-8">
                        {/* Mobile brand collapse */}
                        <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                            <Logo size="2.5em" />
                            <span className="text-2xl" style={brandWordmark}>
                                Alexandria
                            </span>
                        </div>

                        {/* Optional form-side header */}
                        {(formTitle || formIntro) && (
                            <div className="space-y-2">
                                {formTitle && (
                                    <h2
                                        className="text-4xl font-bold leading-tight"
                                        style={headingFont}
                                    >
                                        {formTitle}
                                    </h2>
                                )}
                                {formIntro && (
                                    <p
                                        style={{
                                            color: 'var(--theme-base-content)',
                                            opacity: 0.6,
                                        }}
                                    >
                                        {formIntro}
                                    </p>
                                )}
                            </div>
                        )}

                        {children}
                    </div>
                </div>
            </div>
        </>
    );
}
