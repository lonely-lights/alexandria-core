/**
 * Flow deep-link helpers — spec 2026-08-08
 * continuous-manuscript-scene-flow.
 *
 * The continuous view keeps the address bar in step with the section the
 * reader is scrolled to, and can point at a scene inside it via a
 * `#scene-<n>` fragment. Scene indices are one-based, matching what the
 * scene chips display, so `#scene-0` is never a valid target.
 *
 * Pure string work — no router, no window — so Vitest covers it directly.
 */

import { workUrl } from '@alexandria/lib/urls';

/** Matches a one-based scene fragment and nothing else. */
const SCENE_FRAGMENT = /^#scene-(\d+)$/;

/**
 * Build the canonical URL for a section, optionally anchored to a scene.
 *
 * The fragment is appended only for a real one-based index; null,
 * undefined, zero, negatives, and NaN all yield the bare section path.
 */
export function flowUrl(
    projectSlug: string,
    workSlug: string,
    sectionSlug: string,
    sceneIndex?: number | null,
): string {
    const path = workUrl(projectSlug, workSlug, sectionSlug);

    if (
        typeof sceneIndex === 'number' &&
        Number.isFinite(sceneIndex) &&
        sceneIndex >= 1
    ) {
        return `${path}#scene-${sceneIndex}`;
    }

    return path;
}

/**
 * Read the scene index out of a location hash.
 *
 * Returns null for anything that is not a `#scene-<n>` fragment with a
 * one-based index — including `#scene-0`, which callers must not treat
 * as "the first scene".
 */
export function parseSceneFragment(hash: string): number | null {
    const match = SCENE_FRAGMENT.exec(hash);

    if (match === null) {
        return null;
    }

    const index = Number.parseInt(match[1], 10);

    return index >= 1 ? index : null;
}
