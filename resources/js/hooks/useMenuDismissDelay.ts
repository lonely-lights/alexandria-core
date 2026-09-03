import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ACCOUNT_PREFERENCES_CHANGED_EVENT } from '../pages/Settings/settingsCache';

interface MenuDismissPreferenceProps {
    auth?: {
        preferences?: {
            menu_dismiss_delay_ms?: number | null;
        } | null;
    } | null;
}

/**
 * The user's `menu_dismiss_delay_ms` preference (hover-off auto-dismiss
 * for click-opened menus), read from Inertia shared props. This is the
 * single source of truth for the delay: `DropdownMenu`, `PickerDropdown`
 * and the bespoke menus all read it here instead of threading it down
 * through props.
 *
 * Returns `null` when the feature is off (preference unset, 0, or
 * negative) and when rendered outside an Inertia page context. Many
 * component tests mount core components bare, and `usePage()` throws
 * without a provider, so the call is guarded. The guard does not affect
 * hook ordering: `usePage()` reads context without registering hook
 * state, and it is always invoked.
 */
export function useMenuDismissDelay(): number | null {
    const [liveValue, setLiveValue] = useState<number | null | undefined>(
        undefined,
    );
    let props: MenuDismissPreferenceProps | null;

    try {
        // rules-of-hooks reads a try block as conditional; the call is
        // unconditional (every render reaches it), only its throw is
        // caught. Inertia does not export PageContext, so this is the
        // only provider-safe way to read shared props.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        props = usePage().props as MenuDismissPreferenceProps;
    } catch {
        props = null;
    }

    useEffect(() => {
        function handlePreferenceChange(event: Event) {
            const patch =
                (event as CustomEvent<Record<string, unknown>>).detail ?? {};

            if (
                !Object.prototype.hasOwnProperty.call(
                    patch,
                    'menu_dismiss_delay_ms',
                )
            ) {
                return;
            }

            const next = patch.menu_dismiss_delay_ms;
            setLiveValue(typeof next === 'number' ? next : null);
        }

        window.addEventListener(
            ACCOUNT_PREFERENCES_CHANGED_EVENT,
            handlePreferenceChange,
        );

        return () =>
            window.removeEventListener(
                ACCOUNT_PREFERENCES_CHANGED_EVENT,
                handlePreferenceChange,
            );
    }, []);

    const value =
        liveValue !== undefined
            ? liveValue
            : props?.auth?.preferences?.menu_dismiss_delay_ms;

    return typeof value === 'number' && value > 0 ? value : null;
}
