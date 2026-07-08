import type { RibbonGates, RibbonRequires } from './types';

/**
 * Gate resolution for ribbon controls (Stage 11 Slice 4).
 *
 * Rules (evaluated in order):
 *  1. No `requires` (or empty) → `visible` — all controls without requires
 *     are always accessible, including every writing ribbon control.
 *  2. `requires` present but `gates` absent → `hidden` (fail closed).
 *  3. `requires.permission` set → check `gates.can[permission]`; falsy → `hidden`.
 *     Permission is checked BEFORE entitlement.
 *  4. `requires.entitlement` set → check membership in `gates.entitlements`;
 *     missing → `locked` (render disabled + fa-lock corner glyph +
 *     `writing.ribbon.locked_hint` title hint).
 *  5. All checks pass → `visible`.
 */
export type GateVerdict = 'visible' | 'hidden' | 'locked';

export function resolveGate(
    requires: RibbonRequires | undefined,
    gates: RibbonGates | undefined,
): GateVerdict {
    // No gate requirements — always visible (the common case for writing controls).
    if (!requires || (!requires.permission && !requires.entitlement)) {
        return 'visible';
    }

    // Has requirements but host provided no gates → fail closed.
    if (!gates) {
        return 'hidden';
    }

    // Permission check first — a missing/false permission hides the control.
    if (requires.permission !== undefined) {
        if (!gates.can[requires.permission]) {
            return 'hidden';
        }
    }

    // Entitlement check — present but not held → locked (upsell affordance).
    if (requires.entitlement !== undefined) {
        if (!gates.entitlements.includes(requires.entitlement)) {
            return 'locked';
        }
    }

    return 'visible';
}
