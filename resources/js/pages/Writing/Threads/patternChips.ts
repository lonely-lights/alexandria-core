/**
 * Pure helpers for Devices & Tropes chip rendering + age formatting —
 * Task 6 (design doc 2026-08-29-devices-tropes-design.md Surfaces #3/#4/#6).
 * No React, no fetch — safe for Vitest without a DOM (mirrors the
 * moodPalette.ts / kanbanModel.ts split between pure helpers and the
 * components that render them).
 *
 * Judgment call (documented per the task-6 brief): `threads.index`
 * only serializes a thread's `marks` when the request is filtered to a
 * single `section_id` (see PatternThreadController::threadRow) — there
 * is no endpoint that returns marks-per-section in bulk across a whole
 * work. KanbanView fetches once via the `work_id` filter (no per-card
 * chattiness), so its chips can't carry real mark ROLE data; instead
 * they key off each thread's own SCOPE (`scope_type === 'section'`)
 * matching the card's section — the common case in practice, since
 * MarkThreadModal defaults a brand-new thread's scope to the section
 * it was marked from. Chips there show a stance-colored token labelled
 * with the stance's own initial rather than a mark role. ThreadsPanel's
 * "In this scene" list, by contrast, DOES fetch with a `section_id`
 * filter and therefore has real per-mark roles — `roleChips` serves
 * that real case.
 */

import type { PatternMarkRole, PatternStance } from './threadApi';

/** Border/wash pair for a small accent token — same shape as Kanban's
 *  MoodAccent (moodPalette.ts), duplicated rather than imported since
 *  that module's helper functions are private to it and stances are a
 *  distinct palette, not a mood one. */
export interface StanceAccent {
    border: string;
    wash: string;
}

function fromToken(token: string): StanceAccent {
    return {
        border: `color-mix(in srgb, var(${token}) 70%, var(--theme-base-content))`,
        wash: `color-mix(in srgb, var(${token}) 12%, transparent)`,
    };
}

function fromNamedHue(hue: string): StanceAccent {
    return {
        border: `color-mix(in srgb, ${hue} 70%, var(--theme-base-content))`,
        wash: `color-mix(in srgb, ${hue} 12%, transparent)`,
    };
}

/** Fallback swatch for a thread with no stance set yet. */
const NEUTRAL_ACCENT: StanceAccent = fromToken('--theme-base-400');

const STANCE_ACCENTS: Record<PatternStance, StanceAccent> = {
    straight: fromToken('--theme-status-info-fill'),
    subverted: fromToken('--theme-brand-accent-500'),
    lampshaded: fromNamedHue('blueviolet'),
    inverted: fromToken('--theme-status-warning-fill'),
    averted: fromToken('--theme-status-error-fill'),
    played_with: fromNamedHue('teal'),
};

const STANCE_INITIALS: Record<PatternStance, string> = {
    straight: 'S',
    subverted: 'U',
    lampshaded: 'L',
    inverted: 'I',
    averted: 'A',
    played_with: 'P',
};

/** Accent token for a thread's stance; `null` (no stance yet) is the neutral swatch. */
export function stanceAccent(stance: PatternStance | null): StanceAccent {
    return stance === null ? NEUTRAL_ACCENT : STANCE_ACCENTS[stance];
}

/** One-letter label for a stance chip; `null` renders a plain dot. */
export function stanceInitial(stance: PatternStance | null): string {
    return stance === null ? '•' : STANCE_INITIALS[stance];
}

const ROLE_INITIALS: Record<PatternMarkRole, string> = {
    setup: 'S',
    develop: 'D',
    payoff: 'P',
};

/** One-letter label for a mark role chip. */
export function roleInitial(role: PatternMarkRole): string {
    return ROLE_INITIALS[role];
}

const ROLE_ORDER: PatternMarkRole[] = ['setup', 'develop', 'payoff'];

/**
 * The distinct role initials present among a set of marks, always in
 * setup → develop → payoff order regardless of the marks' own array
 * order (the API returns them in creation order, not narrative-role
 * order). Used by ThreadsPanel's "In this scene" rows, where marks are
 * real (fetched with a `section_id` filter).
 */
export function roleChips(roles: PatternMarkRole[]): string[] {
    const present = new Set(roles);

    return ROLE_ORDER.filter((role) => present.has(role)).map(roleInitial);
}

/** A single small chip descriptor — Kanban's stance-token shape. */
export interface PatternChip {
    id: number;
    label: string;
    accent: StanceAccent;
    title: string;
}

/** Whole days between `createdAt` and `now` (defaults to the current
 *  moment) — floored, never negative (a thread created seconds ago
 *  reads as 0 days old, never -0 or NaN on a clock skew). */
export function ageDays(createdAt: string, now: Date = new Date()): number {
    const created = new Date(createdAt).getTime();

    if (Number.isNaN(created)) {
        return 0;
    }

    const diffMs = now.getTime() - created;

    return Math.max(0, Math.floor(diffMs / 86_400_000));
}
