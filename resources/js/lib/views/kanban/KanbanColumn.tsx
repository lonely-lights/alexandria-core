import { useDroppable } from '@dnd-kit/core';
import type { KanbanColumnData } from './types';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
    column: KanbanColumnData;
    entryHrefFor: (cardId: number, slug: string) => string;
}

export default function KanbanColumn({ column, entryHrefFor }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: `column-${column.key ?? '__unassigned__'}`,
        data: { columnKey: column.key },
    });

    return (
        <div className="flex w-72 flex-shrink-0 flex-col">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between px-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/70">
                    {column.label}
                </h3>
                <span className="rounded-full bg-base-content/10 px-2 py-0.5 text-[10px] font-semibold text-base-content/60">
                    {column.entries.length}
                </span>
            </div>

            {/* Body: scrollable card list + drop zone */}
            <div
                ref={setNodeRef}
                className={`flex-1 space-y-2 rounded-xl border p-2 transition-colors ${
                    isOver ? 'border-primary/40 bg-primary/5' : 'border-base-content/10 bg-base-200/30'
                }`}
            >
                {column.entries.length === 0 ? (
                    <div className="rounded-md border border-dashed border-base-content/10 px-3 py-6 text-center text-xs text-base-content/30">
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
