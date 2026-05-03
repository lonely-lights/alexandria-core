import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import MentionAwareContent from '@alexandria/components/ui/MentionAwareContent';
import type { KanbanCardData } from './types';

interface KanbanCardProps {
    card: KanbanCardData;
    entryHref: string;
}

export default function KanbanCard({ card, entryHref }: KanbanCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `card-${card.id}`,
        data: { cardId: card.id },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    };

    const iconClass = card.icon
        ? (card.icon.includes(' ') ? card.icon : `fa-solid ${card.icon}`)
        : 'fa-solid fa-file';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="group cursor-grab rounded-lg border border-base-content/10 bg-base-100 p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
        >
            <div className="flex items-start gap-2">
                {card.thumbnail_url ? (
                    <img
                        src={card.thumbnail_url}
                        alt=""
                        className="h-8 w-8 flex-shrink-0 rounded object-cover"
                    />
                ) : (
                    <i className={`${iconClass} mt-0.5 w-4 flex-shrink-0 text-center text-sm text-base-content/50`} />
                )}
                <div className="min-w-0 flex-1">
                    <a
                        href={entryHref}
                        onClick={(e) => e.stopPropagation()}
                        className="block text-sm font-medium text-base-content hover:underline"
                    >
                        {card.name}
                    </a>
                    {card.summary_html ? (
                        <MentionAwareContent
                            html={card.summary_html}
                            className="mt-1 line-clamp-2 text-xs text-base-content/60"
                        />
                    ) : card.summary ? (
                        <p className="mt-1 line-clamp-2 text-xs text-base-content/60">{card.summary}</p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
