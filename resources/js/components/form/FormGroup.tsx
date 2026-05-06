/**
 * FormGroup — label + control + helper / error text scaffold.
 *
 * Wraps any form control with the surrounding chrome:
 *
 *   <FormGroup label="Email" htmlFor="email" helper="We'll never share">
 *       <TextField id="email" ... />
 *   </FormGroup>
 *
 * Pass `error` to switch the helper line into an error message + flag
 * the field as invalid for assistive tech.
 *
 * Action slot (`action`) renders to the right of the label — used for
 * the "Forgot password?" link beside the password label on Login.
 */

import type { ReactNode } from 'react';

export interface FormGroupProps {
    /** Visible label text. Pass an empty string to hide the label row. */
    label?: string;

    /** Forwarded to the <label htmlFor> attribute. */
    htmlFor?: string;

    /** Static helper text shown below the control when no error is set. */
    helper?: ReactNode;

    /** Error message — replaces helper, switches the wrapper to error styling. */
    error?: string | null;

    /** Right-aligned action element next to the label (e.g. "Forgot?" link). */
    action?: ReactNode;

    /** The form control itself — TextField, native input, etc. */
    children: ReactNode;
}

export default function FormGroup({
    label,
    htmlFor,
    helper,
    error,
    action,
    children,
}: FormGroupProps) {
    return (
        <div className="space-y-2">
            {(label || action) && (
                <div className="flex items-center justify-between">
                    {label && (
                        <label
                            htmlFor={htmlFor}
                            className="block text-sm font-medium"
                            style={{
                                color: 'var(--theme-surface-on-page)',
                                opacity: 0.8,
                            }}
                        >
                            {label}
                        </label>
                    )}
                    {action && <div className="text-sm">{action}</div>}
                </div>
            )}

            {children}

            {error && (
                <p
                    className="text-xs"
                    style={{ color: 'var(--theme-status-error-stroke)' }}
                    role="alert"
                >
                    {error}
                </p>
            )}
            {helper && !error && (
                <p
                    className="text-xs"
                    style={{
                        color: 'var(--theme-surface-on-page)',
                        opacity: 0.6,
                    }}
                >
                    {helper}
                </p>
            )}
        </div>
    );
}
