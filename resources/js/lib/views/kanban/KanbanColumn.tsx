import { useDroppable } from '@dnd-kit/core';
import type { CSSProperties } from 'react';
import type { KanbanColumnData } from './types';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
    column: KanbanColumnData;
    entryHrefFor: (cardId: number, slug: string) => string;
}

const headerLabelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

const countBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

const bodyBaseStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-card)',
    borderWidth: '1px',
    borderStyle: 'solid',
    transition: 'background-color var(--theme-motion-duration-fast, 150ms) ease, border-color var(--theme-motion-duration-fast, 150ms) ease',
};

const bodyIdleStyle: CSSProperties = {
    ...bodyBaseStyle,
    background: 'color-mix(in srgb, var(--theme-base-200) 30%, transparent)',
    borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const bodyOverStyle: CSSProperties = {
    ...bodyBaseStyle,
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)',
    borderColor: 'color-mix(in srgb, var(--theme-brand-primary-500) 40%, transparent)',
};

const dropZonePlaceholderStyle: CSSProperties = {
    border: '1px dashed color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

export default function KanbanColumn({ column, entryHrefFor }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: `column-${column.key ?? '__unassigned__'}`,
        data: { columnKey: column.key },
    });

    return (
        <div className="flex w-72 flex-shrink-0 flex-col">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between px-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={headerLabelStyle}>
                    {column.label}
                </h3>
                <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={countBadgeStyle}
                >
                    {column.entries.length}
                </span>
            </div>

            {/* Body: scrollable card list + drop zone */}
            <div
                ref={setNodeRef}
                className="flex-1 space-y-2 p-2"
                style={isOver ? bodyOverStyle : bodyIdleStyle}
            >
                {column.entries.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs" style={dropZonePlaceholderStyle}>
                        Drop here
                    </div>
                ) : (
                    column.entries.map((card) => (
                        <KanbanCard
                            key={card.id}
                            card={card}
                            entryHref={entryHrefFor(card.id, card.slug)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
