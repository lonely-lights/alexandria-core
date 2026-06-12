import { useEffect, useRef } from 'react';

import { collectShortcuts, findConflicts, matchesEvent, type BoundShortcut } from './shortcuts';
import type { RibbonTab } from './types';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * Binds every mounted, visible control's declared shortcut to one
 * window keydown listener. All ribbon shortcuts require Mod, so they
 * fire safely while typing (no plain-character stealing). Dev builds
 * warn once per bind about duplicate or browser-reserved combos.
 *
 * Context flows through a ref so the listener binds once per tab-set
 * change instead of churning on every host render. KNOWN TRADEOFF:
 * `visible` predicates are evaluated at bind time against the
 * then-current context — a control whose visibility flips on a ctx
 * change keeps/loses its binding only when `tabs` changes identity.
 * Acceptable for format-level visibility (prose vs screenplay swaps
 * remount the editor anyway); revisit if a consumer needs per-render
 * visibility rebinds.
 */
export default function useRibbonShortcuts<Ctx>(tabs: RibbonTab<Ctx>[], ctx: Ctx): void {
    const ctxRef = useRef(ctx);
    ctxRef.current = ctx;

    useEffect(() => {
        const bound: BoundShortcut<Ctx>[] = collectShortcuts(tabs, ctxRef.current);

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
            const currentCtx = ctxRef.current;

            for (const b of bound) {
                if (!b.parsed.mod) continue;
                if (!matchesEvent(b.parsed, event, isMac)) continue;
                if (b.control.disabled?.(currentCtx)) continue;

                event.preventDefault();
                b.control.onAction(currentCtx);

                return;
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [tabs]);
}
