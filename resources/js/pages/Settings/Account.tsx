import { router, usePage } from '@inertiajs/react';
import { useEffect, type ReactNode } from 'react';
import AppLayout from '@alexandria/layouts/AppLayout';
import useMediaQuery from '@alexandria/hooks/useMediaQuery';
import useT from '@alexandria/hooks/useT';
import SettingsBody, { type SettingsBodyProps } from './SettingsBody';
import { getSettingsSlots, seedSettings } from './settingsCache';
import {
    SETTINGS_DRAWER_TOGGLE_EVENT,
    SETTINGS_DRAWER_CLOSED_EVENT,
    type SettingsDrawerToggleDetail,
} from '@alexandria/layouts/AppLayout';
import { type ViewPreferences } from './Sections/PreferencesSection';
import { ALL_NAV } from './nav-config';
import { settingsSectionFromUrl } from './paletteSearch';

/**
 * /settings + /profile page shell.
 *
 * Both routes resolve to this component. The consumer-app controller
 * picks the starting section per route via `initialActiveSection` —
 * `identity` for /profile, `pref-appearance` for /settings.
 *
 * Desktop (`lg+`): renders the two-column `<SettingsBody>` inline.
 *
 * Mobile (`lg-`): the global `<SettingsDrawer>` mounted in `<AppLayout>`
 * is the settings UI. This page's job on mobile is to:
 *   1. Seed the settings cache with the Inertia-shipped props so the
 *      drawer renders without a fetch.
 *   2. Dispatch the drawer-open event so the drawer slides up
 *      automatically (handles direct URL visits to `/settings`).
 *   3. Render nothing visible — the drawer covers the viewport. We
 *      route back to `/dashboard` once the drawer closes via the
 *      drawer's own `onClose` handler in AppLayout's mount.
 *
 * Backend route contract lives on `<SettingsBody>` — see that file's
 * docblock for the full endpoint surface the consumer app must expose.
 */

type AccountInertiaProps = Omit<
    SettingsBodyProps,
    'accountManagementSlot' | 'applyViewPreferences'
> & { [key: string]: unknown };

interface AccountSlotProps {
    /** App-supplied AccountManagementSection (email/password/danger zone). */
    accountManagementSlot?: (ctx: { email: string; emailVerified: boolean }) => ReactNode;
    /** Mirror view preferences onto `<html>` for optimistic updates. */
    applyViewPreferences?: (prefs: ViewPreferences) => void;
}

export default function Account({
    accountManagementSlot,
    applyViewPreferences,
}: AccountSlotProps = {}) {
    const t = useT();
    const page = usePage<AccountInertiaProps>();
    const inertiaProps = page.props;
    const isMobile = useMediaQuery('(max-width: 1023px)');
    const requestedSection = settingsSectionFromUrl(page.url, [
        ...ALL_NAV,
        ...(getSettingsSlots().extraNav ?? []),
    ]);
    const initialActiveSection =
        requestedSection ?? inertiaProps.initialActiveSection;

    // Mobile-only: seed the drawer cache from this page's Inertia
    // props so the drawer's first render skips the fetch. Then fire
    // the open event so the sheet rises immediately. Once the user
    // closes the drawer, we land them on /dashboard so they're not
    // staring at the empty /settings shell.
    useEffect(() => {
        if (!isMobile) return;
        seedSettings(inertiaProps as unknown as SettingsBodyProps);
        window.dispatchEvent(
            new CustomEvent<SettingsDrawerToggleDetail>(
                SETTINGS_DRAWER_TOGGLE_EVENT,
                {
                    detail: {
                        section: requestedSection ?? undefined,
                    },
                },
            ),
        );

        function onClose() {
            // Match the global drawer's close behavior — history.back
            // when there's somewhere to go, else /dashboard.
            if (window.history.length > 1) {
                window.history.back();
            } else {
                router.visit('/dashboard');
            }
        }
        window.addEventListener(SETTINGS_DRAWER_CLOSED_EVENT, onClose);
        return () => window.removeEventListener(SETTINGS_DRAWER_CLOSED_EVENT, onClose);
    }, [isMobile, inertiaProps, requestedSection]);

    return (
        <AppLayout title={t('settings.drawer.title')} immersive>
            {isMobile ? (
                // Empty under the drawer. We render *something* (rather
                // than null) so Inertia's page key has a stable target
                // and the underlying page doesn't briefly flash to a
                // previously-rendered tree.
                <div aria-hidden="true" className="min-h-screen" />
            ) : (
                <SettingsBody
                    {...inertiaProps}
                    initialActiveSection={initialActiveSection}
                    accountManagementSlot={accountManagementSlot}
                    applyViewPreferences={applyViewPreferences}
                />
            )}
        </AppLayout>
    );
}
