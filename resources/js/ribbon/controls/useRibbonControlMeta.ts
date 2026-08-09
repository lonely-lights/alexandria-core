import useT from '@alexandria/hooks/useT';

import { formatShortcutLabel } from '../shortcuts';
import type { RibbonControl } from '../types';

/**
 * The per-render facts every value control derives from its definition:
 * disabled state, resolved option labels, display label, and the
 * shortcut-aware tooltip. Shared by RibbonSelect and RibbonCombo so the
 * two stay one implementation (owner review, 2026-08-09) — a third
 * value control would consume this too.
 */

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

export interface RibbonControlMeta {
    /** Translator, returned so consumers don't mount a second hook. */
    t: (key: string) => string;
    disabled: boolean;
    options: Array<{ value: string; label: string }>;
    label: string;
    tip: string;
}

export function useRibbonControlMeta<Ctx>(
    control: RibbonControl<Ctx>,
    ctx: Ctx,
): RibbonControlMeta {
    const t = useT();
    const disabled = control.disabled?.(ctx) ?? false;
    const options = (control.options?.(ctx) ?? []).map((option) => ({
        value: option.value,
        label: t(option.labelKey),
    }));
    const label = control.labelFn?.(ctx) ?? t(control.labelKey);
    const tip = control.shortcut
        ? `${label} - ${formatShortcutLabel(control.shortcut, isMac)}`
        : label;

    return { t, disabled, options, label, tip };
}
