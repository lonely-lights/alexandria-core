import type { CSSProperties } from 'react';

/**
 * Brand wordmark — the canonical "Alexandria" rendering.
 *
 * Soft-locked to Cinzel (2026-05-19). Cinzel is a Trajan-inspired
 * inscription serif — caps-led, monumental, evokes the Library of
 * Alexandria. Lowercase glyphs render as small caps, so combined
 * with `textTransform: uppercase` the wordmark reads as a single
 * uppercase line.
 *
 * To revisit: change BRAND_WORDMARK_FAMILY here and the matching
 * Google Fonts <link> in alexandria-app/resources/views/app.blade.php.
 * No other touch points — every "Alexandria" wordmark instance
 * (LogoLockup, AuthLayout hero, mobile collapse) imports this style.
 */
export const BRAND_WORDMARK_FAMILY = "'Cinzel', 'Georgia', serif";

export const brandWordmark: CSSProperties = {
    fontFamily: BRAND_WORDMARK_FAMILY,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
};
