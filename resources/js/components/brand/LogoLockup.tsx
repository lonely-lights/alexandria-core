import { type CSSProperties } from 'react';

import LogoMark from './LogoMark';

/**
 * Mark + wordmark composite — Stage 8f.
 *
 * The standard horizontal lockup used in navbar / login / admin
 * surfaces. Three preset sizes (`sm` for navbar+sidebar contexts,
 * `md` for card headers, `lg` for auth-page hero treatments). The
 * mark inherits `currentColor` from the parent, so the lockup
 * themes from a single CSS `color` declaration.
 *
 * The mark in the lockup is marked decorative (`ariaLabel=""`)
 * because the wordmark already announces "Alexandria" — without
 * this, screen readers double-announce.
 *
 * Consumers can override the wordmark via the `wordmarkText` prop
 * (e.g., a host app named differently) or hide it entirely with
 * `showWordmark={false}` for mark-only contexts.
 */
interface LogoLockupProps {
    size?: 'sm' | 'md' | 'lg';
    showWordmark?: boolean;
    wordmarkText?: string;
    className?: string;
    style?: CSSProperties;
    /**
     * Static mark pose forwarded to the inner LogoMark. `rest` is the
     * default canonical identity. `extended` shows the golden-ratio
     * stretched-foundation variant (legs height = crossbar × φ).
     */
    pose?: 'rest' | 'extended';
}

const SIZE_TOKENS: Record<'sm' | 'md' | 'lg', { mark: number; fontSize: string; gap: string }> = {
    sm: { mark: 18, fontSize: '0.875rem', gap: '0.4375rem' },
    md: { mark: 24, fontSize: '1.0625rem', gap: '0.5rem' },
    lg: { mark: 40, fontSize: '1.5rem', gap: '0.625rem' },
};

export default function LogoLockup({
    size = 'md',
    showWordmark = true,
    wordmarkText = 'Alexandria',
    className,
    style,
    pose = 'rest',
}: LogoLockupProps) {
    const tokens = SIZE_TOKENS[size];

    return (
        <span
            className={`alex-logo-lockup inline-flex items-center ${className ?? ''}`}
            style={{ gap: tokens.gap, ...style }}
        >
            <LogoMark
                size={tokens.mark}
                ariaLabel={showWordmark ? '' : wordmarkText}
                pose={pose}
            />
            {showWordmark && (
                <span
                    className="alex-logo-wordmark font-semibold tracking-tight"
                    style={{ fontSize: tokens.fontSize, letterSpacing: '-0.01em' }}
                >
                    {wordmarkText}
                </span>
            )}
        </span>
    );
}
