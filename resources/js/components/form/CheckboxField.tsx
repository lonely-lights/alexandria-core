/**
 * CheckboxField — labeled checkbox with theme-aware shape.
 *
 * The checkbox surface is fully custom-painted (CSS in
 * core/resources/css/components/checkboxes.css) so its corner radius
 * follows the `radius.checkbox` theme token (square / rounded / circle).
 *
 * Use for Login's "Remember me" and Register's "I agree to terms" rows.
 * For the toggle-shaped (sliding pill) variant, see Toggle.tsx.
 */

import type { InputHTMLAttributes, ReactNode } from 'react';

export interface CheckboxFieldProps
    extends Omit<
        InputHTMLAttributes<HTMLInputElement>,
        'type' | 'size' | 'children'
    > {
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
                    marginTop: align === 'start' ? '0.125rem' : 0,
                }}
                {...rest}
            />
            <span
                className="text-sm"
                style={{
                    color: 'var(--theme-base-content)',
                    opacity: 0.85,
                }}
            >
                {label}
            </span>
        </label>
    );
}
