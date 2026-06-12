import { useEffect } from 'react';

import { collectShortcuts, findConflicts, matchesEvent, type BoundShortcut } from './shortcuts';
import type { RibbonTab } from './types';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * Binds every mounted, visible control's declared shortcut to one
 * window keydown listener. All ribbon shortcuts require Mod, so they
 * fire safely while typing (no plain-character stealing). Dev builds
 * warn once per mount about duplicate or browser-reserved combos.
 */
export default function useRibbonShortcuts<Ctx>(tabs: RibbonTab<Ctx>[], ctx: Ctx): void {
    useEffect(() => {
        const bound: BoundShortcut<Ctx>[] = collectShortcuts(tabs, ctx);

        if (bound.length === 0) {
            return;
        }

        if (import.meta.env.DEV) {
            for (const conflict of findConflicts(bound)) {
                console.warn(
                    `[ribbon] shortcut ${conflict.shortcut} (${conflict.kind}) bound by: ${conflict.controlIds.join(', ')}`,
                );
            }
        }

        function onKeyDown(event: KeyboardEvent): void {
            for (const b of bound) {
                if (!b.parsed.mod) continue; // ribbon shortcuts must carry Mod
                if (!matchesEvent(b.parsed, event, isMac)) continue;
                if (b.control.disabled?.(ctx)) return;

                event.preventDefault();
                b.control.onAction(ctx);

                return;
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [tabs, ctx]);
}
