/**
 * TextField — themed text input with optional icon-prefix slot + state styling.
 *
 * Consumed by Stage 2's auth pages (Login email/password, Register name/
 * email/password, etc.) where each input has an icon glyph on the
 * inline-start side and gets a coloured border based on validation
 * state (idle/success/error).
 *
 * For label + helper + error chrome, wrap in FormGroup. TextField only
 * renders the input itself + the optional icon slot + an optional
 * trailing slot (right side, used for AvailabilityIndicator).
 *
 * State prop drives the border colour:
 *   - idle    — neutral
 *   - success — status-success
 *   - error   — status-error
 *
 * Focus ring is painted by CSS (.alex-textfield:focus-visible in
 * core/resources/css/components/inputs.css) so we don't have to fight
 * inline-style specificity for keyboard-focus halos. Border colour stays
 * inline because it reflects validation state, not focus.
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

export type TextFieldState = 'idle' | 'success' | 'error';

export interface TextFieldProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    /** Icon slot at the inline-start side (e.g. mail/lock SVG). */
    icon?: ReactNode;

    /** Trailing slot at the inline-end side (e.g. AvailabilityIndicator). */
    trailing?: ReactNode;

    /** Validation state — drives border colour. Default 'idle'. */
    state?: TextFieldState;
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
    { icon, trailing, state = 'idle', className = '', style, ...rest },
    ref,
) {
    const borderColor = STATE_BORDER[state];

    return (
        <div className="relative">
            {icon && (
                <span
                    aria-hidden="true"
                    className="absolute inset-y-0 flex items-center pointer-events-none"
                    style={{
                        insetInlineStart: '1rem',
                        color: 'var(--theme-base-content)',
                        opacity: 0.4,
                    }}
                >
                    {icon}
                </span>
            )}

            <input
                ref={ref}
                className={`alex-textfield w-full ${className}`}
                style={{
                    width: '100%',
                    padding: icon
                        ? '0.625rem 0.875rem 0.625rem 3rem'
                        : '0.625rem 0.875rem',
                    paddingInlineEnd: trailing ? '2.75rem' : undefined,
                    background: 'var(--theme-base-200)',
                    color: 'var(--theme-base-content)',
                    border: `1px solid ${borderColor}`,
                    borderRadius: 'var(--theme-radius-input)',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    ...style,
                }}
                {...rest}
            />

            {trailing && (
                <span
                    className="absolute inset-y-0 flex items-center pointer-events-none"
                    style={{ insetInlineEnd: '1rem' }}
                >
                    {trailing}
                </span>
            )}
        </div>
    );
});

export default TextField;

const STATE_BORDER: Record<TextFieldState, string> = {
    idle: 'var(--theme-neutral-300)',
    success: 'var(--theme-status-success-stroke)',
    error: 'var(--theme-status-error-stroke)',
};
