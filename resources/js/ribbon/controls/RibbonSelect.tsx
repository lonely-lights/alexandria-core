import useT from '@alexandria/hooks/useT';
import PickerDropdown from '@alexandria/components/ui/PickerDropdown';
import Tooltip from '@alexandria/components/ui/Tooltip';

import { formatShortcutLabel } from '../shortcuts';
import type { RibbonControl } from '../types';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

interface Props<Ctx> {
    control: RibbonControl<Ctx>;
    ctx: Ctx;
}

export default function RibbonSelect<Ctx>({ control, ctx }: Props<Ctx>) {
    const t = useT();
    const disabled = control.disabled?.(ctx) ?? false;
    const options = (control.options?.(ctx) ?? []).map((option) => ({
        value: option.value,
        label: t(option.labelKey),
    }));
    const label = control.labelFn?.(ctx) ?? t(control.labelKey);
    const tip = control.shortcut ? `${label} - ${formatShortcutLabel(control.shortcut, isMac)}` : label;
    const value = control.value?.(ctx) ?? options[0]?.value ?? '';

    const trigger = (
        <PickerDropdown
            value={value}
            options={options}
            onChange={(next) => control.onAction(ctx, next)}
            className="ribbon-select"
            style={{
                height: '1.5rem',
                paddingBlock: 0,
                paddingInline: '0.5rem 1.5rem',
                borderRadius: 'var(--theme-radius-button)',
            }}
            ariaLabel={label}
            disabled={disabled}
            menuWidth={160}
            dataAttributes={{ 'data-ribbon-control': control.id }}
        />
    );

    return (
        <Tooltip content={tip}>
            <span className="inline-flex">{trigger}</span>
        </Tooltip>
    );
}
