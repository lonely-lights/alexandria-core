import { useEffect, useRef, type RefObject } from 'react';

/**
 * Active-scene tracking for the continuous manuscript flow — spec
 * 2026-08-08.
 *
 * The flow is one scrollport holding the whole work, so "which section
 * am I in" stops being a routing question and becomes a geometry one.
 * This hook answers it off the DOM contract the stack renders
 * (`[data-flow-section]` wrappers, `p[data-element="slugline"]` inside
 * hydrated screenplay rows) and reports through a callback — it owns no
 * state and renders nothing, so the workspace chrome can subscribe
 * without the flow re-rendering on every scroll tick.
 *
 * Two mechanisms, deliberately split:
 *
 *  - an **IntersectionObserver** pinned to the scrollport's center band
 *    (30% inset top and bottom) decides which rows are in play. Only
 *    the band matters: a section the reader has scrolled past is still
 *    on screen, and picking by raw visibility would keep it active
 *    halfway into the next chapter,
 *  - a **600 ms settle timer**, reset by both observer callbacks and
 *    raw scroll events, decides when to report. Flinging through twenty
 *    chapters should update the chrome once, at the landing, not
 *    twenty times on the way. The scroll listener matters because
 *    scrolling *within* one long section fires no observer callback at
 *    all, yet can still move the center line onto a different scene.
 *
 * Screenplay refinement: a section with two or more sluglines is a
 * multi-scene block, so the reported position carries the 1-based index
 * of the scene under the center line. Everything else reports `null` —
 * prose has no scenes to index, and a single-slugline section is fully
 * described by its id.
 */

/** What the workspace tracks: where the reader is, in the flow. */
export interface ActiveSceneRef {
    sectionId: number;
    slug: string;
    /** One-based scene index within the section, or null for "no scene". */
    sceneIndex: number | null;
}

export interface UseActiveSceneOptions {
    containerRef: RefObject<HTMLElement | null>;
    /** False in focus mode — observers are torn down, not just ignored. */
    enabled: boolean;
    /** Bump to re-scan children after hydration or a tree change. */
    version: number;
    /** Fires ≥600 ms after the scroll rests, only on an actual change. */
    onChange: (active: ActiveSceneRef) => void;
}

const SECTION_SELECTOR = '[data-flow-section]';

const SLUGLINE_SELECTOR = 'p[data-element="slugline"]';

/** Inset that narrows the observer root to the scrollport's center band. */
const BAND_ROOT_MARGIN = '-30% 0px -30% 0px';

/** Fraction of the scrollport above the band — matches BAND_ROOT_MARGIN. */
const BAND_INSET = 0.3;

/** How long the scroll must rest before the position is reported. */
const SETTLE_MS = 600;

/**
 * Which scene of `section` sits under `centerLine`.
 *
 * Null unless the section holds at least two sluglines: one slugline
 * (or none) means the section *is* the unit, and emitting `1` forever
 * would just be noise on the wire. Above the first slugline the answer
 * is scene 1 — the reader is in the section's opening scene even if its
 * heading has scrolled off the top.
 */
function resolveSceneIndex(section: Element, centerLine: number): number | null {
    const sluglines = section.querySelectorAll(SLUGLINE_SELECTOR);

    if (sluglines.length < 2) {
        return null;
    }

    let index = 1;

    sluglines.forEach((slugline, position) => {
        if (slugline.getBoundingClientRect().top <= centerLine) {
            index = position + 1;
        }
    });

    return index;
}

export function useActiveScene({
    containerRef,
    enabled,
    version,
    onChange,
}: UseActiveSceneOptions): void {
    // Read through a ref so a fresh callback identity on every parent
    // render doesn't tear down and rebuild the observer — and so the
    // debounce, which outlives the render that scheduled it, always
    // calls the current one rather than the closure it was born with.
    const onChangeRef = useRef(onChange);

    // Survives re-scans on purpose: a hydration bump re-reads the DOM but
    // does not move the reader, so the same position must stay silent.
    const lastEmittedRef = useRef<string | null>(null);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        const container = containerRef.current;

        if (!enabled || container === null) {
            return;
        }

        const intersecting = new Set<Element>();
        let timer: ReturnType<typeof setTimeout> | null = null;

        const resolve = () => {
            const containerRect = container.getBoundingClientRect();
            const bandTop = containerRect.top + containerRect.height * BAND_INSET;

            let candidate: Element | null = null;
            let candidateTop = Number.NEGATIVE_INFINITY;
            let firstIntersecting: Element | null = null;

            /* Walk the live DOM rather than the set: document order is what
               makes "the first intersecting row" a stable fallback, and a
               row detached since the last callback drops out for free. */
            for (const section of container.querySelectorAll(SECTION_SELECTOR)) {
                if (!intersecting.has(section)) {
                    continue;
                }

                firstIntersecting ??= section;

                const top = section.getBoundingClientRect().top;

                // The lowest row that still starts at or above the band
                // opening — i.e. the one the band is currently sitting in.
                if (top <= bandTop && top > candidateTop) {
                    candidate = section;
                    candidateTop = top;
                }
            }

            /* Nothing reaches the band when the reader is at the very top of
               the work, or mid-jump between hydrated windows: take the
               topmost row that is in play at all. */
            const active = candidate ?? firstIntersecting;

            if (active === null) {
                return;
            }

            const sectionId = Number(active.getAttribute('data-flow-section-id'));

            if (!Number.isInteger(sectionId)) {
                return;
            }

            const sceneIndex = resolveSceneIndex(
                active,
                containerRect.top + containerRect.height / 2,
            );

            const emitted = `${sectionId}:${sceneIndex}`;

            if (emitted === lastEmittedRef.current) {
                return;
            }

            lastEmittedRef.current = emitted;

            onChangeRef.current({
                sectionId,
                slug: active.getAttribute('data-flow-section-slug') ?? '',
                sceneIndex,
            });
        };

        const settle = () => {
            if (timer !== null) {
                clearTimeout(timer);
            }

            timer = setTimeout(() => {
                timer = null;
                resolve();
            }, SETTLE_MS);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        intersecting.add(entry.target);
                    } else {
                        intersecting.delete(entry.target);
                    }
                }

                settle();
            },
            { root: container, rootMargin: BAND_ROOT_MARGIN, threshold: 0 },
        );

        for (const section of container.querySelectorAll(SECTION_SELECTOR)) {
            observer.observe(section);
        }

        container.addEventListener('scroll', settle, { passive: true });

        return () => {
            observer.disconnect();
            container.removeEventListener('scroll', settle);

            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }

            intersecting.clear();
        };
    }, [containerRef, enabled, version]);
}
