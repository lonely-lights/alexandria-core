import { type TextareaHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { FORM_SIZES, type FormSize } from './sizes';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string | ReactNode;
    size?: FormSize;
}

/**
 * Multi-line text input. Same surface family as `<Input>`/`<Select>`
 * (theming via `.alex-textarea` in inputs.css); resizes vertically
 * with a sensible min-height baked into the class.
 */
export default function Textarea({
    label,
    error,
    hint,
    size = 'sm',
    className,
    id,
    ...props
}: TextareaProps) {
    const textareaId = id ?? props.name;
    const s = FORM_SIZES[size];

    const labelColor = 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)';
    const hintColor = 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)';

    return (
        <div className="w-full">
            {label && (
                <label
                    className="mb-1.5 block text-xs"
                    htmlFor={textareaId}
                    style={{ color: labelColor }}
                >
                    {label}
                </label>
            )}
            <textarea
                id={textareaId}
                className={cn(
                    'alex-textarea',
                    s.text,
                    error && 'alex-textarea--error',
                    className,
                )}
                {...props}
            />
            {error && (
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
