import { type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { FORM_SIZES, type FormSize } from './sizes';

interface SelectOption {
    value: string | number;
    label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    label?: string;
    error?: string;
    hint?: string | ReactNode;
    /**
     * Suppress the inline error message while keeping the error border
     * tint — for callers that surface the message elsewhere (e.g. an
     * anchored error popper).
     */
    hideErrorText?: boolean;
    options: SelectOption[] | Record<string, string>;
    placeholder?: string;
    size?: FormSize;
}

/**
 * Native dropdown. Theming via `.alex-select` in inputs.css — paints
 * the same surface as `<Input>`/`<Textarea>`, plus an inline-SVG
 * chevron on the right and reserved padding so option text never
 * collides with the arrow.
 */
export default function Select({
    label,
    error,
    hint,
    hideErrorText = false,
    options,
    placeholder,
    size = 'sm',
    className,
    id,
    ...props
}: SelectProps) {
    const selectId = id ?? props.name;
    const s = FORM_SIZES[size];

    const labelColor = 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)';
    const hintColor = 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)';

    // Normalize options to array format
    const normalizedOptions: SelectOption[] = Array.isArray(options)
        ? options
        : Object.entries(options).map(([value, optionLabel]) => ({ value, label: optionLabel }));

    return (
        <div className="w-full">
            {label && (
                <label
                    className="mb-1.5 block text-xs"
                    htmlFor={selectId}
                    style={{ color: labelColor }}
                >
                    {label}
                </label>
            )}
            <select
                id={selectId}
                className={cn(
                    'alex-select',
                    s.height, s.text,
                    error && 'alex-select--error',
                    className,
                )}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {normalizedOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && !hideErrorText && (
                <p
                    className="mt-1 text-xs"
                    style={{ color: 'var(--theme-status-error-stroke)' }}
                >
                    {error}
                </p>
            )}
            {hint && !error && (
                <p className="mt-1 text-xs" style={{ color: hintColor }}>
                    {hint}
                </p>
            )}
        </div>
    );
}
