import useT from '@alexandria/hooks/useT';
import Tooltip from '@alexandria/components/ui/Tooltip';

import { formatShortcutLabel } from '../shortcuts';
import type { RibbonControl } from '../types';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

interface Props<Ctx> {
    control: RibbonControl<Ctx>;
    ctx: Ctx;
}

/**
 * Compact native select for the ribbon band. The shared form
 * `<Select>` wraps itself in a full-width div (label/error/hint
 * chrome), which can't sit inline inside a 28px band — so this is a
 * bare `<select className="ribbon-select">` styled by ribbon.css.
 */
export default function RibbonSelect<Ctx>({ control, ctx }: Props<Ctx>) {
    const t = useT();
    const disabled = control.disabled?.(ctx) ?? false;
    const options = control.options?.(ctx) ?? [];
    const label = t(control.labelKey);
    const tip = control.shortcut ? `${label} · ${formatShortcutLabel(control.shortcut, isMac)}` : label;

    return (
        <Tooltip content={tip}>
            <select
                className="ribbon-select"
                aria-label={label}
                value={control.value?.(ctx) ?? ''}
                disabled={disabled}
                onChange={(e) => control.onAction(ctx, e.target.value)}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                    </option>
                ))}
            </select>
        </Tooltip>
    );
}
