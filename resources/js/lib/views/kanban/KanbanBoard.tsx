import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import KanbanColumn from './KanbanColumn';
import type { KanbanColumnData } from './types';

interface KanbanBoardProps {
    columns: KanbanColumnData[];
    entryHrefFor: (cardId: number, slug: string) => string;
    /** Called when a card is dropped into a different column. Parent
        is responsible for the optimistic local update + server PATCH. */
    onCardMove: (cardId: number, toKey: string | null) => void;
}

export default function KanbanBoard({ columns, entryHrefFor, onCardMove }: KanbanBoardProps) {
    // 8px activation distance prevents clicks from registering as drags.
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over) return;

        const cardId = active.data.current?.cardId as number | undefined;
        const toKey = (over.data.current?.columnKey ?? null) as string | null;
        if (cardId == null) return;

        // Skip no-op drops (card stayed in its origin column).
        const origin = columns.find((col) => col.entries.some((e) => e.id === cardId));
        if (origin && origin.key === toKey) return;

        onCardMove(cardId, toKey);
    }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
                {columns.map((column) => (
                    <KanbanColumn
                        key={column.key ?? '__unassigned__'}
                        column={column}
                        entryHrefFor={entryHrefFor}
                    />
                ))}
            </div>
        </DndContext>
    );
}
