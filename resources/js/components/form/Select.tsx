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
    options: SelectOption[] | Record<string, string>;
    placeholder?: string;
    size?: FormSize;
}

export default function Select({ label, error, hint, options, placeholder, size = 'sm', className, id, ...props }: SelectProps) {
    const selectId = id ?? props.name;
    const s = FORM_SIZES[size];

    // Normalize options to array format
    const normalizedOptions: SelectOption[] = Array.isArray(options)
        ? options
        : Object.entries(options).map(([value, optionLabel]) => ({ value, label: optionLabel }));

    return (
        <div className="form-control w-full">
            {label && (
                <label className="label pb-1.5 pt-0" htmlFor={selectId}>
                    <span className="label-text text-xs text-base-content/50">{label}</span>
                </label>
            )}
            <select
                id={selectId}
                className={cn(
                    'select select-bordered w-full min-h-0 rounded-xl',
                    s.height, s.text,
                    error && 'select-error',
                    className,
                )}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {normalizedOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
            {hint && !error && <p className="mt-1 text-xs text-base-content/40">{hint}</p>}
        </div>
    );
}
