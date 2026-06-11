import { type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { FORM_SIZES, type FormSize } from './sizes';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label?: string;
    error?: string;
    hint?: string | ReactNode;
    /**
     * Suppress the inline error message while keeping the error border
     * tint — for callers that surface the message elsewhere (e.g. an
     * anchored error popper).
     */
    hideErrorText?: boolean;
    icon?: string;
    iconElement?: ReactNode;
    size?: FormSize;
}

/**
 * Single-line text input. Surface and focus state painted via the
 * `.alex-input` class (see core/resources/css/components/inputs.css);
 * sizing comes from the FORM_SIZES helper. Pair with `<TextField>` for
 * the validated/animated variant; this primitive is the lighter form
 * of the same surface for use inside config rows.
 */
export default function Input({
    label,
    error,
    hint,
    hideErrorText = false,
    icon,
    iconElement,
    size = 'sm',
    className,
    id,
    ...props
}: InputProps) {
    const inputId = id ?? props.name;
    const s = FORM_SIZES[size];
    const hasIcon = !!(icon || iconElement);

    const labelColor = 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)';
    const iconColor = 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)';
    const hintColor = 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)';

    return (
        <div className="w-full">
            {label && (
                <label
                    className="mb-1.5 block text-xs"
                    htmlFor={inputId}
                    style={{ color: labelColor }}
                >
                    {label}
                </label>
            )}
            <div className={hasIcon ? 'relative' : undefined}>
                {hasIcon && (
                    <span
                        className={`absolute left-3 top-1/2 -translate-y-1/2 ${s.iconSize}`}
                        style={{ color: iconColor }}
                    >
                        {iconElement ?? <i className={icon} />}
                    </span>
                )}
                <input
                    id={inputId}
                    className={cn(
                        'alex-input',
                        s.height, s.text,
                        hasIcon && s.iconPadding,
                        error && 'alex-input--error',
                        className,
                    )}
                    // `.alex-input` (inputs.css) sets `padding-inline` which
                    // overrides Tailwind's `pl-*` utility from `s.iconPadding`.
                    // Inline style wins specificity so the icon clears the text.
                    style={
                        hasIcon
                            ? { paddingLeft: s.iconPaddingPx, ...props.style }
                            : props.style
                    }
                    {...props}
                />
            </div>
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
