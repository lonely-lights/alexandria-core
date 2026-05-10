import { type CSSProperties, type ReactNode } from 'react';
import { useHoverCard } from '@alexandria/hooks/useHoverCard';
import EntryHoverCard from './EntryHoverCard';

interface EntryLinkProps {
    entryId: number;
    href: string;
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
}

export default function EntryLink({ entryId, href, children, className, style }: EntryLinkProps) {
    const { showCard, triggerRect, triggerRef, handleMouseEnter, scheduleClose, cancelClose } = useHoverCard();

    return (
        <>
            <a
                ref={triggerRef}
                href={href}
                className={className}
                style={style}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={scheduleClose}
            >
                {children}
            </a>
            {showCard && triggerRect && (
                <EntryHoverCard
                    entryId={entryId}
                    triggerRect={triggerRect}
                    onEnter={cancelClose}
                    onClose={scheduleClose}
                />
            )}
        </>
    );
}
