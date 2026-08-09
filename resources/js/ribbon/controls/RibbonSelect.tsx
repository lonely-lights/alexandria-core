import PickerDropdown from '@alexandria/components/ui/PickerDropdown';
import Tooltip from '@alexandria/components/ui/Tooltip';

import type { RibbonControl } from '../types';
import { useRibbonControlMeta } from './useRibbonControlMeta';

interface Props<Ctx> {
    control: RibbonControl<Ctx>;
    ctx: Ctx;
}

export default function RibbonSelect<Ctx>({ control, ctx }: Props<Ctx>) {
    const { disabled, options, label, tip } = useRibbonControlMeta(control, ctx);
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
