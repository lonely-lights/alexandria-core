/**
 * Kanban board (né Beat Board) mood palette — spec 2026-08-28 Kanban board (né Beat Board) Task 2.
 *
 * Maps a scene's free-text `mood` field onto a small, fixed set of
 * accent colors for the board's card borders/washes. Matching is
 * fuzzy (case-insensitive substring) against a curated keyword list
 * per swatch, so authors can write natural mood words ("tense",
 * "quietly hopeful") without picking from a closed vocabulary.
 *
 * Colors are built entirely from `color-mix()` over theme tokens —
 * never raw hex constants — so the palette follows whatever theme
 * (including dark mode) is active. Where a theme status/brand token
 * already carries the right hue (error red, info blue, warning
 * amber, accent orange, success green) we mix from that; the
 * remaining hues (violet, teal, slate) mix a plain CSS named color
 * with the theme's content color instead.
 */

export interface MoodAccent {
    border: string;
    wash: string;
}

/** One fuzzy-match keyword group and the swatch it resolves to. */
interface MoodGroup {
    key: string;
    keywords: string[];
    accent: MoodAccent;
}

function fromToken(token: string): MoodAccent {
    return {
        border: `color-mix(in srgb, var(${token}) 70%, var(--theme-base-content))`,
        wash: `color-mix(in srgb, var(${token}) 12%, transparent)`,
    };
}

function fromNamedHue(hue: string): MoodAccent {
    return {
        border: `color-mix(in srgb, ${hue} 70%, var(--theme-base-content))`,
        wash: `color-mix(in srgb, ${hue} 12%, transparent)`,
    };
}

const MOOD_GROUPS: MoodGroup[] = [
    {
        key: 'red',
        keywords: ['tense', 'anxious', 'dread'],
        accent: fromToken('--theme-status-error-fill'),
    },
    {
        key: 'blue',
        keywords: ['sad', 'somber', 'grief'],
        accent: fromToken('--theme-status-info-fill'),
    },
    {
        key: 'amber',
        keywords: ['hopeful', 'warm', 'tender'],
        accent: fromToken('--theme-status-warning-fill'),
    },
    {
        key: 'violet',
        keywords: ['eerie', 'mysterious', 'uncanny'],
        accent: fromNamedHue('blueviolet'),
    },
    {
        key: 'orange',
        keywords: ['action', 'urgent', 'chase'],
        accent: fromToken('--theme-brand-accent-500'),
    },
    {
        key: 'teal',
        keywords: ['calm', 'quiet', 'still'],
        accent: fromNamedHue('teal'),
    },
    {
        key: 'green',
        keywords: ['joyful', 'light', 'comic'],
        accent: fromToken('--theme-status-success-fill'),
    },
    {
        key: 'slate',
        keywords: ['cold', 'clinical', 'detached'],
        accent: fromNamedHue('slategray'),
    },
];

/** The 8 fixed mood swatches, keyed by color-group name. */
export const moodPalette: Record<string, MoodAccent> = Object.fromEntries(
    MOOD_GROUPS.map((group) => [group.key, group.accent]),
);

/** Fallback swatch for a mood that matches no known group. */
const NEUTRAL_ACCENT: MoodAccent = fromToken('--theme-base-400');

/**
 * Resolve a scene's `mood` text to a board accent. Matching is a
 * case-insensitive substring test against each group's keyword list;
 * the first matching group wins. Unknown, `null`, or empty moods
 * fall back to the neutral swatch.
 */
export function moodAccent(mood: string | null | undefined): MoodAccent {
    if (!mood) {
        return NEUTRAL_ACCENT;
    }

    const normalized = mood.toLowerCase();

    for (const group of MOOD_GROUPS) {
        if (group.keywords.some((keyword) => normalized.includes(keyword))) {
            return group.accent;
        }
    }

    return NEUTRAL_ACCENT;
}
