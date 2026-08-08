import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type MutableRefObject,
} from 'react';

import type { ScreenplaySceneLink } from '@alexandria/editor/screenplay/sceneLinks';

import type { SectionOutlineItem } from '../Sections/sectionOutline';
import type { SectionCountsCallback } from '../Sections/useSectionAutosave';
import type { CurrentSection, SectionNode } from '../Workspace';
import type { WritingEditorBridge } from '../ribbon/writingRibbonContext';
import FlowSection from './FlowSection';
import { flattenTree } from './flowModel';

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
 * active-scene observer (Task 5) re-reads the DOM off that signal and
 * gets wired in at Task 6. Until then the initial section is treated
 * as the active one.
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

export default function ContinuousFlow({
    project,
    work,
    sections,
    initialSection,
    canUpdate,
    printLayout,
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

    /* Active scene — Task 5's observer replaces this seam. Until then
       the landing section is active, emitted once it holds content. */
    const activeId = initialSection?.id ?? null;
    const emittedRef = useRef<CurrentSection | null>(null);

    useEffect(() => {
        const active = activeId !== null ? hydrated[activeId] : undefined;

        if (active === undefined || emittedRef.current === active) {
            return;
        }

        emittedRef.current = active;
        onActiveSceneChange({ section: active, sceneIndex: null });
    }, [activeId, hydrated, onActiveSceneChange]);

    return (
        <div
            ref={containerRef}
            data-flow-container=""
            data-flow-version={hydrationVersion}
            className="writing-workspace-scroll min-h-0 flex-1 overflow-y-auto"
        >
            <div className="mx-auto w-full max-w-[52rem] pb-[40vh]">
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
