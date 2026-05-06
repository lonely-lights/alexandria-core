/**
 * useT — translation accessor for the shared `t` Inertia prop.
 *
 * Mirrors Laravel's __('group.key') ergonomics. Reads from the
 * `t` shared prop populated by HandleInertiaRequests:
 *
 *     const t = useT();
 *     t('common.or')          → 'or'
 *     t('common.cancel')      → 'Cancel'
 *     t('nav.dashboard')      → 'Dashboard'         (when nav.* added)
 *
 * Returns the key itself when the lookup misses — so a missing
 * translation surfaces visibly instead of silently rendering empty
 * text. Pass `fallback` to override that.
 *
 *     t('common.or', 'or')    → 'or' even if common.or is missing
 */

import { usePage } from '@inertiajs/react';

interface SharedWithT {
    t?: Record<string, Record<string, string>>;
    [key: string]: unknown;
}

export type Translator = (key: string, fallback?: string) => string;

export default function useT(): Translator {
    const props = usePage<SharedWithT>().props;
    const bag = props.t ?? {};

    return (key: string, fallback?: string): string => {
        const dotIndex = key.indexOf('.');

        if (dotIndex === -1) {
            return fallback ?? key;
        }

        const group = key.slice(0, dotIndex);
        const subKey = key.slice(dotIndex + 1);
        const groupBag = bag[group];

        if (!groupBag) {
            return fallback ?? key;
        }

        return groupBag[subKey] ?? fallback ?? key;
    };
}
