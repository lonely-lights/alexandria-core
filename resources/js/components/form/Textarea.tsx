import { type TextareaHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { FORM_SIZES, type FormSize } from './sizes';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string | ReactNode;
    size?: FormSize;
}

export default function Textarea({ label, error, hint, size = 'sm', className, id, ...props }: TextareaProps) {
    const textareaId = id ?? props.name;
    const s = FORM_SIZES[size];

    return (
        <div className="form-control w-full">
            {label && (
                <label className="label pb-1.5 pt-0" htmlFor={textareaId}>
                    <span className="label-text text-xs text-base-content/50">{label}</span>
                </label>
            )}
            <textarea
                id={textareaId}
                className={cn(
                    'textarea textarea-bordered w-full rounded-xl',
                    s.text,
                    error && 'textarea-error',
                    className,
                )}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
            {hint && !error && <p className="mt-1 text-xs text-base-content/40">{hint}</p>}
        </div>
    );
}
