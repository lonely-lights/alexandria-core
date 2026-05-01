import { type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { FORM_SIZES, type FormSize } from './sizes';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label?: string;
    error?: string;
    hint?: string | ReactNode;
    icon?: string;
    iconElement?: ReactNode;
    size?: FormSize;
}

export default function Input({ label, error, hint, icon, iconElement, size = 'sm', className, id, ...props }: InputProps) {
    const inputId = id ?? props.name;
    const s = FORM_SIZES[size];
    const hasIcon = !!(icon || iconElement);

    return (
        <div className="form-control w-full">
            {label && (
                <label className="label pb-1.5 pt-0" htmlFor={inputId}>
                    <span className="label-text text-xs text-base-content/50">{label}</span>
                </label>
            )}
            <div className={hasIcon ? 'relative' : undefined}>
                {hasIcon && (
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${s.iconSize} text-base-content/30`}>
                        {iconElement ?? <i className={icon} />}
                    </span>
                )}
                <input
                    id={inputId}
                    className={cn(
                        'input input-bordered w-full rounded-xl',
                        s.height, s.text,
                        hasIcon && s.iconPadding,
                        error && 'input-error',
                        className,
                    )}
                    {...props}
                />
            </div>
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
            {hint && !error && <p className="mt-1 text-xs text-base-content/40">{hint}</p>}
        </div>
    );
}
