import type { ReactNode } from 'react';

interface ToggleProps {
    label: string;
    hint?: ReactNode;
    /** Compatibility alias for older callers; prefer `hint`. */
    description?: ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
    name?: string;
    disabled?: boolean;
}

/**
 * Sliding-pill toggle. Paints a track + thumb via the `.alex-toggle`
 * class (see core/resources/css/components/inputs.css) so theming and
 * focus-visible state can reach the right pseudo-elements without
 * inline-style specificity conflicts. Controlled-only: callers own the
 * checked state and update it through `onChange`.
 */
export default function Toggle({
    label,
    hint,
    description,
    checked,
    onChange,
    name,
    disabled,
}: ToggleProps) {
    const helperText = hint ?? description;

    return (
        <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
            <div>
                <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--theme-base-content)' }}
                >
                    {label}
                </span>
                {helperText && (
                    <p
                        className="text-xs"
                        style={{
                            color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
                        }}
                    >
                        {helperText}
                    </p>
                )}
            </div>
            <input
                type="checkbox"
                name={name}
                className="alex-toggle"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
            />
        </label>
    );
}
