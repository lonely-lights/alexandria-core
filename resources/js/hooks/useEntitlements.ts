/**
 * useEntitlements — returns the active entitlement keys for the
 * current user as a plain string[].
 *
 * The host app shares auth.entitlements as a Record<string, unknown>
 * where values are truthy when the entitlement is active (e.g. boolean
 * true, or a quota number > 0). This hook normalises that map down to
 * the string keys whose value is truthy — matching the shape that
 * RibbonGates.entitlements expects.
 *
 *     const entitlements = useEntitlements();
 *     entitlements.includes('craft.enabled')  // → true | false
 *
 * Usage note: `auth` is null when no user is authenticated; the hook
 * returns an empty array in that case.
 */

import { usePage } from '@inertiajs/react';

import type { SharedProps } from '../types/index';

export default function useEntitlements(): string[] {
    const auth = usePage<SharedProps>().props.auth;

    if (!auth?.entitlements) {
        return [];
    }

    return Object.entries(auth.entitlements)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k);
}
