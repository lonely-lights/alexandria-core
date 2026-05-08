interface ToggleProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    name?: string;
    disabled?: boolean;
}

/**
 * Sliding-pill toggle. Paints a track + thumb via the `.alex-toggle`
 * class (see core/resources/css/components/inputs.css) so theming and
 * focus-visible state can reach the right pseudo-elements without
 * inline-style specificity conflicts.
 */
export default function Toggle({
    label,
    description,
    checked,
    onChange,
    name,
    disabled,
}: ToggleProps) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
            <div>
                <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--theme-base-content)' }}
                >
                    {label}
                </span>
                {description && (
                    <p
                        className="text-xs"
                        style={{
                            color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
                        }}
                    >
                        {description}
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
