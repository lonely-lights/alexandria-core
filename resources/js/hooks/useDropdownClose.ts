import { useEffect, type RefObject } from 'react';

/**
 * Close-on-outside-click + ref boilerplate shared across menu /
 * dropdown components. Pass the wrapper element ref + a setter
 * for the open state; the hook wires a mousedown listener that
 * closes when the click lands outside the ref's tree.
 *
 * Extracted in Stage 8c.C after UserActionDropdown +
 * ProjectActionDropdown duplicated the same 14-line block.
 */
export function useDropdownClose(
    open: boolean,
    setOpen: (open: boolean) => void,
    ref: RefObject<HTMLElement | null>,
): void {
    useEffect(() => {
        if (!open) return;
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, setOpen, ref]);
}
