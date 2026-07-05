import { useEffect, useRef, useState } from 'react';

import useT from '@alexandria/hooks/useT';

import { computePageBreaks } from './pageBreakMath';

/**
 * Print-layout pagination preview — dashed page-boundary guides with
 * page-number chips, absolutely positioned over the manuscript. Mount
 * inside a `relative` wrapper that contains the full content height
 * (not the clipped viewport) alongside the editor content; it measures
 * the nearest `.ProseMirror` via ResizeObserver.
 *
 * Stage 11 Slice 1.
 */
export default function PageBreakGuides({ linesPerPage }: { linesPerPage: number }) {
    const t = useT();
    const hostRef = useRef<HTMLDivElement>(null);
    const [breaks, setBreaks] = useState<number[]>([]);

    useEffect(() => {
        const host = hostRef.current;
        const prose = host?.parentElement?.querySelector<HTMLElement>('.ProseMirror');
        if (!host || !prose) return;

        const measure = () => {
            const lineHeight = parseFloat(getComputedStyle(prose).lineHeight) || 0;
            const pageHeight = lineHeight * linesPerPage;
            // Offset guides by the prose block's position inside the
            // relative wrapper so page 1 starts at the text top.
            const top = prose.offsetTop;
            setBreaks(computePageBreaks(prose.scrollHeight, pageHeight).map((y) => y + top));
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(prose);
        return () => observer.disconnect();
    }, [linesPerPage]);

    return (
        <div ref={hostRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
            {breaks.map((y, i) => (
                <div
                    key={y}
                    className="absolute right-0 left-0 border-t border-dashed"
                    data-page-break={i + 2}
                    style={{
                        top: `${y}px`,
                        borderColor: 'color-mix(in srgb, var(--theme-base-content) 22%, transparent)',
                    }}
                >
                    <span
                        className="absolute -top-2.5 right-2 px-1.5 font-mono text-[10px]"
                        style={{
                            color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
                            background: 'var(--theme-base-surface)',
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
