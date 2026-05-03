import { useState, useRef, useCallback } from 'react';
import { HOVER_CARD } from '@alexandria/config/hoverCard';

/**
 * Shared hover card trigger logic — handles delayed show, delayed close,
 * and cancel-on-enter for both trigger and card elements.
 */
export function useHoverCard(showDelay = HOVER_CARD.showDelay, closeDelay = HOVER_CARD.closeDelay) {
    const [showCard, setShowCard] = useState(false);
    const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
    const showTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
    const triggerRef = useRef<HTMLAnchorElement>(null);

    const cancelClose = useCallback(() => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);

    const scheduleClose = useCallback(() => {
        if (showTimerRef.current) clearTimeout(showTimerRef.current);
        closeTimerRef.current = setTimeout(() => setShowCard(false), closeDelay);
    }, [closeDelay]);

    const handleMouseEnter = useCallback(() => {
        cancelClose();
        showTimerRef.current = setTimeout(() => {
            if (triggerRef.current) {
                setTriggerRect(triggerRef.current.getBoundingClientRect());
                setShowCard(true);
            }
        }, showDelay);
    }, [cancelClose, showDelay]);

    return {
        showCard,
        triggerRect,
        triggerRef,
        handleMouseEnter,
        scheduleClose,
        cancelClose,
    };
}
