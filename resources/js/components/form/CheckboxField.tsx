/**
 * CheckboxField — labeled checkbox with theme-aware accent.
 *
 * Renders the native checkbox with `accent-color` set to brand-primary,
 * paired with a clickable label. Use for Login's "Remember me" and
 * Register's "I agree to terms" rows.
 *
 * For the toggle-shaped (sliding pill) variant, see Toggle.tsx — this
 * component is the standard checkbox surface.
 */

import type { InputHTMLAttributes, ReactNode } from 'react';

export interface CheckboxFieldProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'children'> {
    /** Label text or rich content rendered next to the box. */
    label: ReactNode;

    /** Aligns label baseline with checkbox vs. tops. Default 'center'. */
    align?: 'center' | 'start';
}

export default function CheckboxField({
    label,
    align = 'center',
    id,
    className = '',
    ...rest
}: CheckboxFieldProps) {
    const fieldId = id ?? rest.name;

    return (
        <label
            htmlFor={fieldId}
            className={`flex gap-3 cursor-pointer select-none ${className}`}
            style={{
                alignItems: align === 'center' ? 'center' : 'flex-start',
            }}
        >
            <input
                id={fieldId}
                type="checkbox"
                className="alex-checkbox"
                style={{
                    accentColor: 'var(--theme-brand-primary-500)',
                    width: '1rem',
                    height: '1rem',
                    marginTop: align === 'start' ? '0.25rem' : 0,
                }}
                {...rest}
            />
            <span
                className="text-sm"
                style={{
                    color: 'var(--theme-surface-on-page)',
                    opacity: 0.8,
                }}
            >
                {label}
            </span>
        </label>
    );
}
