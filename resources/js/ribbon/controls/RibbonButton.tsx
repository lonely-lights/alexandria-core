import useT from '@alexandria/hooks/useT';
import Tooltip from '@alexandria/components/ui/Tooltip';

import { formatShortcutLabel } from '../shortcuts';
import type { RibbonControl } from '../types';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

interface Props<Ctx> {
    control: RibbonControl<Ctx>;
    ctx: Ctx;
}

export default function RibbonButton<Ctx>({ control, ctx }: Props<Ctx>) {
    const t = useT();
    const disabled = control.disabled?.(ctx) ?? false;
    const active = control.active?.(ctx) ?? false;
    const label = t(control.labelKey);
    const tip = control.shortcut ? `${label} · ${formatShortcutLabel(control.shortcut, isMac)}` : label;

    const trigger = (
        <button
            type="button"
            data-ribbon-control={control.id}
            className={`ribbon-ctl alex-toolbar-btn ${active ? 'alex-toolbar-btn--active' : ''}`}
            aria-pressed={control.type === 'toggle' ? active : undefined}
            disabled={disabled}
            onClick={() => control.onAction(ctx)}
        >
            <i className={control.icon} aria-hidden="true" />
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
