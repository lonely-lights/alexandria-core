import useT from '@alexandria/hooks/useT';
import DropdownMenu from '@alexandria/components/ui/DropdownMenu';
import Tooltip from '@alexandria/components/ui/Tooltip';

import { formatShortcutLabel } from '../shortcuts';
import type { RibbonControl } from '../types';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

interface Props<Ctx> {
    control: RibbonControl<Ctx>;
    ctx: Ctx;
}

/**
 * Icon trigger (alex-toolbar-btn idiom) opening the shared
 * DropdownMenu, items built from `control.options(ctx)`. Disabled
 * controls render the bare disabled button — no menu to open.
 */
export default function RibbonMenu<Ctx>({ control, ctx }: Props<Ctx>) {
    const t = useT();
    const disabled = control.disabled?.(ctx) ?? false;
    const label = t(control.labelKey);
    const tip = control.shortcut ? `${label} · ${formatShortcutLabel(control.shortcut, isMac)}` : label;

    const triggerButton = (
        <Tooltip content={tip}>
            <button
                type="button"
                className="ribbon-ctl alex-toolbar-btn"
                aria-label={label}
                aria-haspopup="menu"
                disabled={disabled}
            >
                <i className={control.icon} aria-hidden="true" />
            </button>
        </Tooltip>
    );

    if (disabled) {
        return triggerButton;
    }

    const items = (control.options?.(ctx) ?? []).map((option) => ({
        label: t(option.labelKey),
        onClick: () => control.onAction(ctx, option.value),
    }));

    return <DropdownMenu items={items} trigger={triggerButton} align="left" />;
}
