import { useEffect } from 'react';

interface UseCmdKOptions {
    /**
     * Optional global event name. When set, `useCmdK` also listens for
     * `window.dispatchEvent(new CustomEvent(eventName))` calls and fires
     * `onOpen` in response. Useful when the palette trigger lives in a
     * component (e.g. a Navbar button) that cannot share React state with
     * the palette host.
     *
     * Pass `null` to disable the custom-event listener entirely. Defaults
     * to `'alexandria-core:command-palette-toggle'`.
     */
    eventName?: string | null;
}

/**
 * Registers a Cmd+K / Ctrl+K keyboard shortcut that fires `onOpen`. Also
 * listens for an optional global custom event so non-React triggers (or
 * unrelated component subtrees) can open the palette without sharing state.
 *
 * Example — palette host:
 * ```tsx
 * const [open, setOpen] = useState(false);
 * useCmdK(() => setOpen(true));
 * ```
 *
 * Example — remote trigger (e.g. a Navbar search button):
 * ```ts
 * window.dispatchEvent(new CustomEvent('alexandria-core:command-palette-toggle'));
 * ```
 */
export function useCmdK(onOpen: () => void, options: UseCmdKOptions = {}) {
    const eventName = options.eventName === undefined
        ? 'alexandria-core:command-palette-toggle'
        : options.eventName;

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                onOpen();
            }
        }

        function handleCustomEvent() {
            onOpen();
        }

        window.addEventListener('keydown', handleKey);
        if (eventName) {
            window.addEventListener(eventName, handleCustomEvent);
        }

        return () => {
            window.removeEventListener('keydown', handleKey);
            if (eventName) {
                window.removeEventListener(eventName, handleCustomEvent);
            }
        };
    }, [onOpen, eventName]);
}
