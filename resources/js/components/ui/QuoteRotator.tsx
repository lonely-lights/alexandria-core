/**
 * QuoteRotator — slowly rotates through a curated set of attributed
 * quotes about writing, poetry, oratory, and the act of authorship.
 *
 * Picks a random starting quote on mount so users don't always see the
 * same one first; rotates every `interval` milliseconds (default 12s,
 * leaving plenty of reading time for the longer entries). Smooth fade
 * via CSS keyframe + React `key` reset on each rotation.
 *
 * Default set is intentionally globally-inclusive — Sappho, Du Fu,
 * Bashō alongside Lorde, Morrison, Douglass — so the brand surface
 * doesn't read as monocultural. Override via the `quotes` prop when a
 * page wants its own curation (writing-craft tools, calendar package,
 * etc.).
 */

import { useEffect, useState } from 'react';

/**
 * Verified-location pin (Font Awesome Pro). Inherits color via
 * currentColor so the era text and icon dim together via the parent's
 * opacity.
 */
function LocationPinIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 384 512"
            width="0.85em"
            height="0.85em"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M192 0C298 0 384 84.4 384 188.6 384 307.9 263.8 450.9 213.6 505.4 201.8 518.2 182.2 518.2 170.4 505.4 120.2 450.9 0 307.9 0 188.6 0 84.4 86 0 192 0zm90.9 132.6c-10.7-7.8-25.7-5.4-33.5 5.3l-85.6 117.7-26.5-27.4c-9.2-9.5-24.4-9.8-33.9-.6-9.5 9.2-9.8 24.4-.6 33.9l46.4 48c4.9 5.1 11.8 7.8 18.9 7.3s13.6-4.1 17.8-9.8L288.2 166.1c7.8-10.7 5.4-25.7-5.3-33.5z" />
        </svg>
    );
}

export interface BrandQuote {
    /** Quote text (English). */
    text: string;

    /** Author name as commonly cited. */
    author: string;

    /** Era + place context (e.g. "Tang Dynasty China, c. 757 CE"). */
    era: string;
}

export const DEFAULT_QUOTES: BrandQuote[] = [
    {
        text: 'Someone, I tell you, in another time, will remember us.',
        author: 'Sappho',
        era: 'Ancient Greece, c. 600 BCE',
    },
    {
        text: 'Though a country be sundered, hills and rivers endure.',
        author: 'Du Fu',
        era: 'Tang Dynasty China, c. 757 CE',
    },
    {
        text: 'There is no greater agony than bearing an untold story inside you.',
        author: 'Maya Angelou',
        era: 'United States, 1969',
    },
    {
        text: "If there's a book that you want to read, but it hasn't been written yet, then you must write it.",
        author: 'Toni Morrison',
        era: 'United States, 1981',
    },
    {
        text: 'Once you learn to read, you will be forever free.',
        author: 'Frederick Douglass',
        era: 'United States, 1845',
    },
    {
        text: 'Poetry is not a luxury. It is a vital necessity of our existence.',
        author: 'Audre Lorde',
        era: 'United States, 1977',
    },
    {
        text: 'I have always imagined that paradise will be a kind of library.',
        author: 'Jorge Luis Borges',
        era: 'Argentina, 1960',
    },
    {
        text: 'Every day is a journey, and the journey itself is home.',
        author: 'Matsuo Bashō',
        era: 'Edo Japan, c. 1690',
    },
];

export interface QuoteRotatorProps {
    /** Rotation interval in milliseconds. Default 12000 (12s). */
    interval?: number;

    /** Override the default curated set. */
    quotes?: BrandQuote[];
}

export default function QuoteRotator({
    interval = 12000,
    quotes = DEFAULT_QUOTES,
}: QuoteRotatorProps) {
    // Random start so the same quote doesn't always appear first
    const [index, setIndex] = useState(() =>
        Math.floor(Math.random() * quotes.length),
    );

    useEffect(() => {
        if (quotes.length <= 1) {
            return;
        }

        const id = window.setInterval(() => {
            setIndex((i) => (i + 1) % quotes.length);
        }, interval);

        return () => window.clearInterval(id);
    }, [interval, quotes.length]);

    const quote = quotes[index];

    return (
        <blockquote
            key={index}
            className="alex-quote-rotator space-y-3 max-w-md"
        >
            <p
                className="text-2xl xl:text-3xl leading-tight italic"
                style={{
                    fontFamily: 'var(--theme-typography-heading-family)',
                    color: 'var(--theme-surface-on-page)',
                    opacity: 0.85,
                }}
            >
                &ldquo;{quote.text}&rdquo;
            </p>
            <footer
                className="flex items-center gap-3 text-sm flex-wrap"
                style={{
                    color: 'var(--theme-surface-on-page)',
                    opacity: 0.6,
                }}
            >
                <span
                    className="inline-block"
                    style={{
                        width: '2.5rem',
                        height: '1px',
                        background: 'var(--theme-brand-primary-500)',
                        opacity: 0.6,
                    }}
                    aria-hidden="true"
                />
                <span className="font-semibold">{quote.author}</span>
                <span
                    className="inline-flex items-center gap-1.5"
                    style={{ opacity: 0.7 }}
                >
                    <LocationPinIcon />
                    {quote.era}
                </span>
            </footer>
        </blockquote>
    );
}
