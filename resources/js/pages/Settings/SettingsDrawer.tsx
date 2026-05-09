import Drawer, { DrawerHeader } from '@alexandria/components/ui/Drawer';
import useT from '@alexandria/hooks/useT';
import SettingsBody, { type SettingsBodyProps } from './SettingsBody';

interface SettingsDrawerProps extends SettingsBodyProps {
    open: boolean;
    onClose: () => void;
}

/**
 * Slide-over shell that hosts the same `<SettingsBody>` the /settings
 * and /profile pages render inside their own `AppLayout`. Lets a
 * consumer surface the full settings UI from a button anywhere in the
 * app without forcing a route change — the user opens, edits, closes,
 * and lands back where they were.
 *
 * The drawer panel is wider than the default Modal/Sheet (max-w-5xl
 * on sm+) so the body's two-column layout (avatar/nav rail + content)
 * still reads. On mobile it goes edge-to-edge, same as a full-page
 * /settings render.
 *
 * Data contract: identical to `<SettingsBody>`. Consumers wire profile
 * / links / privacy / ai / preferences props from wherever they have
 * them (an Inertia page, a fetched API response, a context, etc.) and
 * the drawer just hands them through. See SettingsBody's PHPDoc for
 * the endpoint surface area the body expects.
 */
export default function SettingsDrawer({
    open,
    onClose,
    ...bodyProps
}: SettingsDrawerProps) {
    const t = useT();

    return (
        <Drawer open={open} onClose={onClose} side="right" maxWidth="sm:max-w-5xl" ariaLabel={t('settings.drawer.aria_label', 'Settings')}>
            <DrawerHeader title={t('settings.drawer.title', 'Settings')} onClose={onClose} />
            <div className="flex-1 overflow-y-auto">
                <SettingsBody {...bodyProps} />
            </div>
        </Drawer>
    );
}
