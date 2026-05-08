import { usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';
import AppLayout from '@alexandria/layouts/AppLayout';
import SettingsBody, { type SettingsBodyProps } from './SettingsBody';
import { type ViewPreferences } from './Sections/PreferencesSection';

/**
 * /settings + /profile page shell.
 *
 * Reads Inertia page props and renders `<SettingsBody>` inside an
 * immersive `<AppLayout>`. The body itself owns all UI state and is
 * shared with the future `<SettingsDrawer>` overlay so logic stays DRY
 * across both presentations.
 *
 * Both /profile (identity-themed) and /settings (clinical) routes
 * resolve to this component. The consumer app's controller picks the
 * starting section per route by passing `initialActiveSection` in the
 * Inertia props — `identity` for /profile, `pref-appearance` for
 * /settings. Visual specialisation between the two surfaces will land
 * in a later step; for now they share the same body.
 *
 * Backend route contract lives on `<SettingsBody>` — see that file's
 * docblock for the full endpoint surface the consumer app must expose.
 */

type AccountInertiaProps = Omit<
    SettingsBodyProps,
    'accountManagementSlot' | 'applyViewPreferences'
>;

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
    const inertiaProps = usePage<{ props: AccountInertiaProps }>()
        .props as unknown as AccountInertiaProps;

    return (
        <AppLayout title="Settings" immersive>
            <SettingsBody
                {...inertiaProps}
                accountManagementSlot={accountManagementSlot}
                applyViewPreferences={applyViewPreferences}
            />
        </AppLayout>
    );
}
