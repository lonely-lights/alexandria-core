import useT from '@alexandria/hooks/useT';
import Tooltip from '@alexandria/components/ui/Tooltip';

import { formatShortcutLabel } from '../shortcuts';
import type { RibbonControl } from '../types';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

interface Props<Ctx> {
    control: RibbonControl<Ctx>;
    ctx: Ctx;
    showLabel: boolean; // comfortable mode
}

/**
 * Identical to RibbonButton except `aria-pressed` is ALWAYS set —
 * toggles announce their pressed state even when inactive.
 */
export default function RibbonToggle<Ctx>({ control, ctx, showLabel }: Props<Ctx>) {
    const t = useT();
    const disabled = control.disabled?.(ctx) ?? false;
    const active = control.active?.(ctx) ?? false;
    const label = t(control.labelKey);
    const tip = control.shortcut ? `${label} · ${formatShortcutLabel(control.shortcut, isMac)}` : label;

    const trigger = (
        <button
            type="button"
            className={`ribbon-ctl alex-toolbar-btn ${active ? 'alex-toolbar-btn--active' : ''}`}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => control.onAction(ctx)}
        >
            <i className={control.icon} aria-hidden="true" />
            {showLabel && <span className="ribbon-ctl-label">{label}</span>}
        </button>
    );

    // Firefox doesn't fire mouse events on disabled form elements, so
    // the tooltip's hover listeners attach to a wrapper span instead.
    return (
        <Tooltip content={tip}>
            {disabled ? (
                <span style={{ display: 'contents' }}>{trigger}</span>
            ) : (
                trigger
            )}
        </Tooltip>
    );
}
