/**
 * Module-level cache for the global settings payload.
 *
 * The bottom-nav Settings tab opens a `<SettingsDrawer>` overlay
 * instead of routing to `/settings`, so the drawer needs its data
 * available without a server round-trip when the user taps it. This
 * file owns the cache and the fetch logic.
 *
 * Lifecycle:
 *
 *  1. AppLayout calls `preloadSettings()` on mount (gated to authed
 *     users + `requestIdleCallback`). The fetch fires in the
 *     background and the result is stored here.
 *
 *  2. The drawer subscribes via `useSettingsData()` — if data is
 *     already in the cache, the hook returns it synchronously and the
 *     drawer renders the panes in the same frame. If the fetch is
 *     still in flight, the hook returns `null` and re-renders once it
 *     resolves.
 *
 *  3. `seedSettings()` lets the /settings Inertia page pre-warm the
 *     cache from its own props on direct URL visits — the user lands
 *     on /settings, AppLayout dispatches the open event, and the
 *     drawer reads cached data with zero network cost.
 *
 *  4. `invalidateSettings()` lets a settings save invalidate the cache
 *     so the next open re-fetches. (Hook will be wired up once the
 *     save-without-reload refactor lands; for now this is exposed for
 *     manual callers.)
 *
 * Endpoint contract: `GET /api/v1/account/settings` — JSON shape
 * matches `SettingsBodyProps` (see SettingsBody.tsx).
 */

import { useEffect, useState } from 'react';
import { type SettingsBodyProps } from './SettingsBody';

type CacheState = SettingsBodyProps | null;

const SETTINGS_ENDPOINT = '/api/v1/account/settings';

/**
 * Consumer-app slot registration. The global `<SettingsDrawer>` mounted
 * in `<AppLayout>` can't import SaaS-specific code (AccountManagement
 * section, applyViewPreferences) without breaking core's "no consumer
 * concerns" boundary. The consumer app registers these once at boot
 * (see alexandria-app/resources/js/app.tsx); AppLayout reads them from
 * the registry and threads them into the drawer.
 */
export interface SettingsSlotRegistry {
    accountManagementSlot?: SettingsBodyProps['accountManagementSlot'];
    applyViewPreferences?: SettingsBodyProps['applyViewPreferences'];
}

let registeredSlots: SettingsSlotRegistry = {};

export function registerSettingsSlots(slots: SettingsSlotRegistry): void {
    registeredSlots = { ...registeredSlots, ...slots };
}

export function getSettingsSlots(): SettingsSlotRegistry {
    return registeredSlots;
}

let cached: CacheState = null;
let inflight: Promise<SettingsBodyProps> | null = null;
const listeners = new Set<(data: CacheState) => void>();

function notify(): void {
    for (const listener of listeners) {
        listener(cached);
    }
}

async function fetchSettings(): Promise<SettingsBodyProps> {
    const response = await fetch(SETTINGS_ENDPOINT, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
    });
    if (!response.ok) {
        throw new Error(`Settings fetch failed: ${response.status}`);
    }
    return (await response.json()) as SettingsBodyProps;
}

/**
 * Kick off the settings fetch in the background. Idempotent — repeat
 * calls while a fetch is in flight return the same promise; once
 * cached, subsequent calls resolve immediately.
 */
export function preloadSettings(): Promise<SettingsBodyProps> {
    if (cached) return Promise.resolve(cached);
    if (inflight) return inflight;

    inflight = fetchSettings()
        .then((data) => {
            cached = data;
            inflight = null;
            notify();
            return data;
        })
        .catch((err) => {
            inflight = null;
            throw err;
        });

    return inflight;
}

/**
 * Pre-warm the cache with data the caller already has (e.g., the
 * `/settings` Inertia page on mobile dispatches the drawer-open event
 * and seeds its own props so the drawer renders without a fetch).
 */
export function seedSettings(data: SettingsBodyProps): void {
    cached = data;
    inflight = null;
    notify();
}

/**
 * Wipe the cache. Call after a save action that mutates a field the
 * drawer surfaces so the next open re-fetches fresh data. No-arg, no
 * partial-key invalidation for now — the payload is small enough that
 * full-refetch is cheaper than tracking dirty fields.
 */
export function invalidateSettings(): void {
    cached = null;
    inflight = null;
    notify();
}

/**
 * React hook — returns the cached settings payload (or null if not
 * yet loaded), and triggers a fetch on mount if the cache is cold.
 * Re-renders consumers automatically when the cache fills.
 */
export function useSettingsData(): CacheState {
    const [data, setData] = useState<CacheState>(cached);

    useEffect(() => {
        function onChange(next: CacheState) {
            setData(next);
        }
        listeners.add(onChange);

        // Kick off a fetch if nothing is cached or already in flight.
        if (!cached && !inflight) {
            void preloadSettings().catch(() => {
                // Errors surface via a `null` cache + a console message;
                // the drawer renders a "Couldn't load settings" state.
                // We don't throw — uncaught promise rejections at module
                // scope would propagate to window.onerror.
                // eslint-disable-next-line no-console
                console.error('[settingsCache] preload failed; drawer will retry on next open.');
            });
        }

        return () => {
            listeners.delete(onChange);
        };
    }, []);

    return data;
}
