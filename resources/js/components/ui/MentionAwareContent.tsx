import { useRef, useLayoutEffect, useState, useCallback, type ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import UserLink from '@alexandria/components/ui/UserHoverCard';
import EntryLink from '@alexandria/components/entries/EntryLink';

interface MentionSlot {
    type: 'user';
    userId: number;
    href: string;
    text: string;
    className: string;
    container: HTMLElement;
}

interface EntrySlot {
    type: 'entry';
    entryId: number;
    href: string;
    text: string;
    className: string;
    container: HTMLElement;
}

type Slot = MentionSlot | EntrySlot;

/**
 * Renders server-sanitized HTML and replaces interactive links with React components:
 * - @user mentions (data-type="mention") → UserLink with hover cards
 * - [[entry]] links (data-type="entry") → EntryLink with hover cards
 *
 * Uses a callback ref to set innerHTML once (outside React's control), then
 * replaces matched <a> tags with inline <span> containers and portals React
 * components into them — preserving the original inline text flow.
 *
 * The `html` prop must be sanitized server-side (via ContentRendererService + MentionRenderer).
 */
export default function MentionAwareContent({ html, ...divProps }: { html: string } & Omit<ComponentProps<'div'>, 'dangerouslySetInnerHTML' | 'children'>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [slots, setSlots] = useState<Slot[]>([]);
    const htmlRef = useRef(html);
    htmlRef.current = html;

    const mountRef = useCallback((node: HTMLDivElement | null) => {
        containerRef.current = node;
        if (!node) return;

        // Set innerHTML directly — React won't manage this content
        node.innerHTML = htmlRef.current;

        const newSlots: Slot[] = [];

        // User mentions
        node.querySelectorAll<HTMLAnchorElement>('a[data-type="mention"]').forEach((link) => {
            const userId = parseInt(link.getAttribute('data-id') ?? '0', 10);
            if (!userId) return;

            const wrapper = document.createElement('span');
            wrapper.style.display = 'inline';
            link.replaceWith(wrapper);

            newSlots.push({
                type: 'user',
                userId,
                href: link.getAttribute('href') ?? `/u/${userId}`,
                text: link.textContent ?? '',
                className: link.getAttribute('class') ?? 'mention text-primary hover:underline',
                container: wrapper,
            });
        });

        // Entry links
        node.querySelectorAll<HTMLAnchorElement>('a[data-type="entry"]').forEach((link) => {
            const entryId = parseInt(link.getAttribute('data-entry-id') ?? '0', 10);
            if (!entryId) return;

            const wrapper = document.createElement('span');
            wrapper.style.display = 'inline';
            link.replaceWith(wrapper);

            newSlots.push({
                type: 'entry',
                entryId,
                href: link.getAttribute('href') ?? '#',
                text: link.textContent ?? '',
                className: link.getAttribute('class') ?? 'link link-hover',
                container: wrapper,
            });
        });

        setSlots(newSlots);
    }, []);

    // Re-process if html prop changes
    useLayoutEffect(() => {
        if (containerRef.current) {
            mountRef(containerRef.current);
        }
    }, [html]);

    return (
        <>
            <div ref={mountRef} {...divProps} />
            {slots.map((slot, i) => {
                if (slot.type === 'user') {
                    return createPortal(
                        <UserLink
                            userId={slot.userId}
                            href={slot.href}
                            className={slot.className}
                        >
                            {slot.text}
                        </UserLink>,
                        slot.container,
                        `mention-${slot.userId}-${i}`,
                    );
                }

                return createPortal(
                    <EntryLink
                        entryId={slot.entryId}
                        href={slot.href}
                        className={slot.className}
                    >
                        {slot.text}
                    </EntryLink>,
                    slot.container,
                    `entry-${slot.entryId}-${i}`,
                );
            })}
        </>
    );
}
