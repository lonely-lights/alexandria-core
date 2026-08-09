import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type MutableRefObject,
} from 'react';

import type { ScreenplaySceneLink } from '@alexandria/editor/screenplay/sceneLinks';

import type { PageDisplayMode } from '../pageDisplay';
import type { SectionOutlineItem } from '../Sections/sectionOutline';
import type { SectionCountsCallback } from '../Sections/useSectionAutosave';
import type { CurrentSection, SectionNode } from '../Workspace';
import type { WritingEditorBridge } from '../ribbon/writingRibbonContext';
import FlowSection from './FlowSection';
import { flattenTree } from './flowModel';
import { parseSceneFragment } from './flowUrl';
import { useActiveScene, type ActiveSceneRef } from './useActiveScene';

/**
 * The continuous manuscript view — spec 2026-08-08.
 *
 * One scrollport for the whole work: every section in the tree renders
 * as a row (see FlowSection), but only a window of them holds real
 * content. Unhydrated rows reserve an estimated height, so the
 * scrollbar reflects the book rather than the fetched slice, and rows
 * hydrate as they approach the viewport via the batch endpoint.
 *
 * The component owns the scrollport ref and a `hydrationVersion`
 * counter that bumps whenever the set of live rows changes — the
 * active-scene observer (useActiveScene) re-reads the DOM off that
 * signal. The observer answers in DOM terms (a section id and a scene
 * index); this component turns that into the workspace's ActiveScene by
 * looking the row up in the hydrated map, and stays quiet until the
 * centered row actually holds content.
 */

/** Slice of `work` the flow needs — the workspace's work prop is wider. */
export interface FlowWork {
    id: number;
    title: string;
    slug: string;
    format: string;
}

/** What the workspace's chrome (status bar, panels, URL) tracks. */
export interface ActiveScene {
    section: CurrentSection;
    /** One-based scene index inside the section, or null for "no scene". */
    sceneIndex: number | null;
}

export interface ContinuousFlowProps {
    project: { id: number; name: string; slug: string };
    work: FlowWork;
    sections: SectionNode[];
    /** The server-rendered section — the first block that arrives hydrated. */
    initialSection: CurrentSection | null;
    canUpdate: boolean;
    printLayout: boolean;
    pageDisplay: PageDisplayMode;
    onCounts: SectionCountsCallback;
    onActiveSceneChange: (active: ActiveScene) => void;
    onBridgeChange: (sectionId: number, bridge: WritingEditorBridge | null) => void;
    onEditorStateChange: () => void;
    /** Forwarded from the ACTIVE section only. */
    onOutlineChange: (outline: SectionOutlineItem[]) => void;
    /** Forwarded from the ACTIVE section only. */
    onSceneLinksChange: (links: ScreenplaySceneLink[]) => void;
    onEntryLinkSelect: () => void;
    onAddComment: (anchor: { from: number; to: number; text: string }) => void;
    /** Imperative scroll-to-section, filled in for the Navigator. */
    scrollToSlugRef: MutableRefObject<((slug: string) => void) | null>;
}

/** Sections either side of the landing section fetched on mount. */
const AROUND_RADIUS = 3;

/** Server-side cap on one batch — matches WorkSectionContentController. */
const BATCH_CAP = 20;

/** How far outside the viewport a placeholder starts loading, in px. */
const HYDRATION_BAND_PX = 1500;

/**
 * Reserved-space markers. Matched directly rather than through
 * `[data-flow-section]:has(…)` — `:has()` is unevenly implemented in
 * test DOMs, and the wrapper is one `closest()` hop away regardless.
 */
const PLACEHOLDER_SELECTOR = '[data-flow-placeholder]';

/** Scene heads inside a hydrated screenplay row — the deep-link targets. */
const SLUGLINE_SELECTOR = 'p[data-element="slugline"]';

/**
 * Frames a `#scene-n` landing waits for its sluglines to exist.
 *
 * The landing section arrives hydrated, but its editor parses the
 * content on mount, so the scene heads appear a frame or three after
 * the wrapper does. Roughly a third of a second of retries, then the
 * section head is a good enough answer.
 */
const SCENE_LANDING_FRAMES = 20;

/** Read the scene the URL is pointing at, if any. Safe under SSR. */
function initialSceneFragment(): number | null {
    return typeof window === 'undefined'
        ? null
        : parseSceneFragment(window.location.hash);
}

export default function ContinuousFlow({
    project,
    work,
    sections,
    initialSection,
    canUpdate,
    printLayout,
    pageDisplay,
    onCounts,
    onActiveSceneChange,
    onBridgeChange,
    onEditorStateChange,
    onOutlineChange,
    onSceneLinksChange,
    onEntryLinkSelect,
    onAddComment,
    scrollToSlugRef,
}: ContinuousFlowProps) {
    const flat = useMemo(() => flattenTree(sections), [sections]);

    const [hydrated, setHydrated] = useState<Record<number, CurrentSection>>(() =>
        initialSection !== null ? { [initialSection.id]: initialSection } : {},
    );

    // Bumped after every hydration merge and on a `sections` identity
    // change — the seam the active-scene observer (Task 5) re-scans on.
    const [hydrationVersion, setHydrationVersion] = useState(0);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const inFlightRef = useRef<Set<number>>(new Set());
    const rafRef = useRef<number | null>(null);
    const aroundDoneRef = useRef<string | null>(null);

    // Landing state. The scene comes off the URL at mount and is read
    // once — the workspace rewrites the fragment as the reader scrolls,
    // so re-reading it later would chase a moving target.
    const landedRef = useRef(false);
    const landingSceneRef = useRef<number | null>(initialSceneFragment());

    /**
     * Fetch a window of section content and merge it in.
     *
     * Failures deliberately leave the placeholders standing: the ids
     * drop out of the in-flight set, so the next scroll that brings
     * them near the viewport retries.
     */
    const fetchWindow = useCallback(
        (params: { around?: string; ids?: number[] }) => {
            const ids = params.ids ?? [];

            if (params.around === undefined && ids.length === 0) {
                return;
            }

            const query = new URLSearchParams();

            if (params.around !== undefined) {
                query.set('around', params.around);
                query.set('radius', String(AROUND_RADIUS));
            }

            for (const id of ids) {
                query.append('ids[]', String(id));
                inFlightRef.current.add(id);
            }

            const settle = () => {
                for (const id of ids) {
                    inFlightRef.current.delete(id);
                }
            };

            fetch(
                `/works/${project.slug}/${work.slug}/sections/content?${query.toString()}`,
                {
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                },
            )
                .then((response) =>
                    response.ok
                        ? (response.json() as Promise<{ sections: CurrentSection[] }>)
                        : Promise.reject(new Error(`HTTP ${response.status}`)),
                )
                .then((payload) => {
                    settle();

                    if (payload.sections.length === 0) {
                        return;
                    }

                    setHydrated((prev) => {
                        const next = { ...prev };

                        for (const section of payload.sections) {
                            // Never clobber a live row: its editor holds
                            // unsaved keystrokes the server hasn't seen.
                            next[section.id] ??= section;
                        }

                        return next;
                    });
                    setHydrationVersion((version) => version + 1);
                })
                .catch(settle);
        },
        [project.slug, work.slug],
    );

    /** Hydrate every placeholder currently within the load band. */
    const scanViewport = useCallback(() => {
        const container = containerRef.current;

        if (container === null) {
            return;
        }

        const viewportHeight = window.innerHeight;
        const ids: number[] = [];

        for (const marker of container.querySelectorAll(PLACEHOLDER_SELECTOR)) {
            const element = marker.closest('[data-flow-section]');

            if (element === null) {
                continue;
            }

            const id = Number(element.getAttribute('data-flow-section-id'));

            if (!Number.isInteger(id) || inFlightRef.current.has(id)) {
                continue;
            }

            const rect = element.getBoundingClientRect();

            if (
                rect.bottom >= -HYDRATION_BAND_PX &&
                rect.top <= viewportHeight + HYDRATION_BAND_PX
            ) {
                ids.push(id);
            }

            if (ids.length === BATCH_CAP) {
                break;
            }
        }

        if (ids.length > 0) {
            fetchWindow({ ids });
        }
    }, [fetchWindow]);

    /* Landing window: the section the server rendered, ± AROUND_RADIUS.
       With no landing section there is nothing to center on, so fall
       back to whatever the first paint puts near the viewport. */
    useEffect(() => {
        const slug = initialSection?.slug ?? null;

        if (slug === null) {
            const handle = requestAnimationFrame(scanViewport);

            return () => cancelAnimationFrame(handle);
        }

        if (aroundDoneRef.current === slug) {
            return;
        }

        aroundDoneRef.current = slug;
        fetchWindow({ around: slug });
    }, [initialSection?.slug, fetchWindow, scanViewport]);

    /* A navigation that swaps the server-rendered section brings its
       content with it — merge it rather than re-fetching. */
    useEffect(() => {
        if (initialSection === null) {
            return;
        }

        setHydrated((prev) =>
            prev[initialSection.id] !== undefined
                ? prev
                : { ...prev, [initialSection.id]: initialSection },
        );
        setHydrationVersion((version) => version + 1);
    }, [initialSection]);

    /* A restructured tree invalidates every cached row position. */
    useEffect(() => {
        setHydrationVersion((version) => version + 1);
    }, [sections]);

    /* Scroll-driven hydration, gated to one pass per animation frame. */
    useEffect(() => {
        const container = containerRef.current;

        if (container === null) {
            return;
        }

        const handleScroll = () => {
            if (rafRef.current !== null) {
                return;
            }

            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                scanViewport();
            });
        };

        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', handleScroll);

            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [scanViewport]);

    /* Navigator clicks scroll here instead of navigating away. A target
       that hasn't hydrated gets its window requested on the way. */
    useEffect(() => {
        const ref = scrollToSlugRef;

        ref.current = (slug: string) => {
            const escaped = slug.replace(/["\\]/g, '\\$&');
            const target = containerRef.current?.querySelector(
                `[data-flow-section-slug="${escaped}"]`,
            );

            if (target === null || target === undefined) {
                return;
            }

            if (target.querySelector('[data-flow-placeholder]') !== null) {
                fetchWindow({ around: slug });
            }

            target.scrollIntoView({ block: 'start', behavior: 'smooth' });
        };

        return () => {
            ref.current = null;
        };
    }, [scrollToSlugRef, fetchWindow]);

    /* Landing scroll — first mount only.

       The flow renders the whole book, so without this the reader opens
       a deep link and finds themselves at chapter one. The wrapper is
       already in the DOM (placeholder or not), so one frame after the
       first paint is enough to put it under the caret; a `#scene-n`
       fragment then refines the target to the nth scene head, retrying
       until the editor has parsed them into existence. */
    useEffect(() => {
        const container = containerRef.current;

        if (landedRef.current || container === null || initialSection === null) {
            return;
        }

        landedRef.current = true;

        const row = container.querySelector(
            `[data-flow-section-id="${initialSection.id}"]`,
        );

        if (row === null) {
            return;
        }

        const scene = landingSceneRef.current;
        let frame: number | null = null;
        let attempts = 0;

        const land = () => {
            frame = null;

            if (attempts === 0) {
                row.scrollIntoView({ block: 'start', behavior: 'auto' });
            }

            if (scene !== null && scene >= 2) {
                const target = row.querySelectorAll(SLUGLINE_SELECTOR)[scene - 1];

                if (target !== undefined) {
                    target.scrollIntoView({ block: 'start', behavior: 'auto' });
                } else if (attempts < SCENE_LANDING_FRAMES) {
                    attempts += 1;
                    frame = requestAnimationFrame(land);

                    return;
                }
            }

            // The landing moved the scrollport without firing a scroll
            // event, so nothing else will notice the placeholders it
            // just pulled into the load band.
            scanViewport();
        };

        frame = requestAnimationFrame(land);

        return () => {
            if (frame !== null) {
                cancelAnimationFrame(frame);
            }
        };
    }, [initialSection, scanViewport]);

    /* Where the reader is, in DOM terms. Seeded from the landing
       section (and the URL's scene fragment) so the workspace chrome is
       correct from the first paint rather than 600 ms into it. */
    const [activeRef, setActiveRef] = useState<ActiveSceneRef | null>(() =>
        initialSection === null
            ? null
            : {
                  sectionId: initialSection.id,
                  slug: initialSection.slug,
                  sceneIndex: initialSceneFragment(),
              },
    );

    // Always on: focus mode unmounts this component rather than
    // disabling it, so there is no "mounted but idle" state to model.
    useActiveScene({
        containerRef,
        enabled: true,
        version: hydrationVersion,
        onChange: setActiveRef,
    });

    const activeId = activeRef?.sectionId ?? null;

    /* Promote the observer's DOM answer to the workspace's ActiveScene.
       A row the reader has scrolled to but that hasn't hydrated yet has
       no CurrentSection to hand over, so the chrome keeps pointing at
       the last real one — and this effect re-runs when the content
       lands, which is why it can't live inside the hook. */
    const emittedRef = useRef<string | null>(null);

    useEffect(() => {
        if (activeRef === null) {
            return;
        }

        const section = hydrated[activeRef.sectionId];

        if (section === undefined) {
            return;
        }

        const signature = `${activeRef.sectionId}:${activeRef.sceneIndex}`;

        if (emittedRef.current === signature) {
            return;
        }

        emittedRef.current = signature;
        onActiveSceneChange({ section, sceneIndex: activeRef.sceneIndex });
    }, [activeRef, hydrated, onActiveSceneChange]);

    return (
        <div
            ref={containerRef}
            data-flow-container=""
            data-flow-version={hydrationVersion}
            className="writing-workspace-scroll min-h-0 flex-1 overflow-y-auto"
        >
            {/* No width cap here — each sheet (and the begin-writing CTA)
                self-limits via .alex-sheet-footprint, the SAME footprint
                focus mode uses, so the page is one size in both views
                (owner ruling 2026-08-09). */}
            <div className="w-full pb-[40vh]">
                {flat.map((row, index) => (
                    <FlowSection
                        key={row.node.id}
                        row={row}
                        section={hydrated[row.node.id] ?? null}
                        showOrnament={index > 0}
                        isActive={row.node.id === activeId}
                        projectId={project.id}
                        projectSlug={project.slug}
                        workSlug={work.slug}
                        workFormat={work.format}
                        canUpdate={canUpdate}
                        printLayout={printLayout}
                        pageDisplay={pageDisplay}
                        onCounts={onCounts}
                        onBridgeChange={onBridgeChange}
                        onEditorStateChange={onEditorStateChange}
                        onOutlineChange={onOutlineChange}
                        onSceneLinksChange={onSceneLinksChange}
                        onEntryLinkSelect={onEntryLinkSelect}
                        onAddComment={onAddComment}
                    />
                ))}
            </div>
        </div>
    );
}
