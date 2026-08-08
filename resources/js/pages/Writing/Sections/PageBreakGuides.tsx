import { useEffect, useRef, useState } from 'react';

import useT from '@alexandria/hooks/useT';

import { computePageBreaks, letterPageHeight } from './pageBreakMath';

/**
 * Print-layout pagination preview — dashed page-boundary guides,
 * absolutely positioned over the manuscript. Mount inside a `relative`
 * wrapper that contains the full content height (not the clipped
 * viewport) alongside the editor content; it measures the nearest
 * `.ProseMirror` via ResizeObserver.
 *
 * Page height comes from the sheet's measured WIDTH (Letter
 * proportions), not from a line count: the sheet is a piece of paper, so
 * its height is a geometric fact about it. The line-count model drew a
 * boundary every half sheet or so and hung the number off the right
 * edge, which read as clutter rather than as pagination. Each boundary
 * is now a full-width hairline with a centered `Page N` pill sitting on
 * it, the way a word processor separates sheets.
 *
 * Stage 11 Slice 1; re-proportioned at the 2026-08-08 flow checkpoint.
 */
export default function PageBreakGuides() {
    const t = useT();
    const hostRef = useRef<HTMLDivElement>(null);
    const [breaks, setBreaks] = useState<number[]>([]);

    useEffect(() => {
        const host = hostRef.current;
        const prose = host?.parentElement?.querySelector<HTMLElement>('.ProseMirror');
        if (!host || !prose) return;

        const measure = () => {
            // clientWidth spans the sheet's padding box — the printable
            // page including its margins, which is the 8.5in edge.
            const pageHeight = letterPageHeight(prose.clientWidth);
            // Offset guides by the prose block's position inside the
            // relative wrapper so page 1 starts at the text top.
            const top = prose.offsetTop;
            setBreaks(computePageBreaks(prose.scrollHeight, pageHeight).map((y) => y + top));
        };

        measure();
        // Fires on width changes as well as height, so a resized pane or
        // a re-flowed sheet re-proportions the pages for free.
        const observer = new ResizeObserver(measure);
        observer.observe(prose);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={hostRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
            {breaks.map((y, i) => (
                <div
                    key={y}
                    className="absolute right-0 left-0 border-t border-dashed"
                    data-page-break={i + 2}
                    style={{
                        top: `${y}px`,
                        borderColor: 'color-mix(in srgb, var(--theme-base-content) 28%, transparent)',
                    }}
                >
                    <span
                        className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 font-mono text-[11px]"
                        style={{
                            color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
                            background: 'var(--theme-base-surface)',
                            border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
                            borderRadius: 'var(--theme-radius-badge)',
                        }}
                    >
                        {t('writing.workspace.page_break_label').replace(':page', String(i + 2))}
                    </span>
                </div>
            ))}
        </div>
    );
}
