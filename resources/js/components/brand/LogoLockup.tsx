import { type CSSProperties, useEffect, useRef, useState } from 'react';

import LogoMark from './LogoMark';
import { brandWordmark } from './brandStyles';

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
    /**
     * Looping character animation forwarded to the inner LogoMark
     * (early drafts — see logo-mark.css). E.g. `breathing` for the
     * calm auth-page idle.
     */
    animation?: 'breathing' | 'walking' | 'waving' | 'jumping';
    /**
     * Character-interaction triggers (early-draft animations): hover
     * plays the kit-of-blocks wave once per hover (pure CSS via
     * `.alex-logo-lockup--interactive`), click plays one
     * squash-and-stretch jump cycle.
     */
    interactive?: boolean;
    /**
     * Fires on every click while `interactive`. Hook for the host
     * app's planned logo easter egg — each click rolls 1-in-1,000,000
     * odds for a prize-credits drop once the store ships (Stage 8d);
     * see takeout/"The Logo Itself" for the concept note.
     */
    onMarkClick?: () => void;
}

const SIZE_TOKENS: Record<'sm' | 'md' | 'lg', { mark: number; fontSize: string; gap: string }> = {
    sm: { mark: 22, fontSize: '1rem', gap: '0.5rem' },
    md: { mark: 32, fontSize: '1.25rem', gap: '0.625rem' },
    lg: { mark: 52, fontSize: '1.875rem', gap: '0.75rem' },
};

/** One full cycle of the alex-jump-legs/-body keyframes (2s) plus margin. */
const JUMP_ONCE_MS = 2100;

export default function LogoLockup({
    size = 'md',
    showWordmark = true,
    wordmarkText = 'Alexandria',
    className,
    style,
    pose = 'rest',
    animation,
    interactive = false,
    onMarkClick,
}: LogoLockupProps) {
    const tokens = SIZE_TOKENS[size];
    const [jumping, setJumping] = useState(false);
    const jumpTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => clearTimeout(jumpTimer.current), []);

    const handleClick = interactive
        ? () => {
              onMarkClick?.();
              // Restart cleanly if mid-jump: drop the class for a frame so
              // the one-shot animation re-triggers.
              setJumping(false);
              clearTimeout(jumpTimer.current);
              requestAnimationFrame(() => {
                  setJumping(true);
                  jumpTimer.current = setTimeout(() => setJumping(false), JUMP_ONCE_MS);
              });
          }
        : undefined;

    const classes = [
        'alex-logo-lockup inline-flex items-center',
        interactive ? 'alex-logo-lockup--interactive' : '',
        jumping ? 'alex-mark-anim-jump-once' : '',
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <span className={classes} style={{ gap: tokens.gap, ...style }} onClick={handleClick}>
            <LogoMark
                size={tokens.mark}
                ariaLabel={showWordmark ? '' : wordmarkText}
                pose={pose}
                animation={animation}
            />
            {showWordmark && (
                <span
                    className="alex-logo-wordmark"
                    style={{ ...brandWordmark, fontSize: tokens.fontSize }}
                >
                    {wordmarkText}
                </span>
            )}
        </span>
    );
}
