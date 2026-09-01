import { usePage } from '@inertiajs/react';

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
    let props: MenuDismissPreferenceProps | null = null;

    try {
        // rules-of-hooks reads a try block as conditional; the call is
        // unconditional (every render reaches it), only its throw is
        // caught. Inertia does not export PageContext, so this is the
        // only provider-safe way to read shared props.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        props = usePage().props as MenuDismissPreferenceProps;
    } catch {
        return null;
    }

    const value = props?.auth?.preferences?.menu_dismiss_delay_ms;

    return typeof value === 'number' && value > 0 ? value : null;
}
