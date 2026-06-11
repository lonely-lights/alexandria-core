import type { CSSProperties, ReactNode } from 'react';

/**
 * Shared card shell for the work-reports page — Stage 8g.1 (Plan 4
 * Task 4). Heading band + body on the standard card surface so the
 * three reports read as one family.
 */

const cardStyle: CSSProperties = {
    background: 'var(--theme-surface-card)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

export default function ReportCard({
    heading,
    controls,
    children,
}: {
    heading: string;
    /** Optional right-aligned controls row content (filters, search). */
    controls?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section style={cardStyle}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
                <h2 className="font-serif text-lg font-bold leading-tight">{heading}</h2>
                {controls}
            </div>
            <div className="px-5 pb-5">{children}</div>
        </section>
    );
}
