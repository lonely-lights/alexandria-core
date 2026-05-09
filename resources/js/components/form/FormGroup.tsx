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

    /**
     * Faded inline hint rendered immediately after the label text — e.g.
     * "(3–30 characters)" on a Username label. Quieter than helper/error
     * (which sit below the control); use this for sub-second-glance
     * format hints that belong tied to the label, not the field state.
     */
    labelHint?: ReactNode;

    /** Forwarded to the <label htmlFor> attribute. */
    htmlFor?: string;

    /**
     * Hide the label visually but keep it in the DOM for screen readers.
     * Use when the surrounding context (page heading, segment style) makes
     * the visual label redundant — e.g. a 6-digit code field on a page
     * already titled "Authentication code".
     */
    hideLabel?: boolean;

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
    labelHint,
    htmlFor,
    hideLabel = false,
    helper,
    error,
    action,
    children,
}: FormGroupProps) {
    const showLabelRow = (label && !hideLabel) || action;

    return (
        <div className="space-y-2">
            {label && hideLabel && (
                <label htmlFor={htmlFor} className="sr-only">
                    {label}
                </label>
            )}
            {showLabelRow && (
                <div className="flex items-center justify-between">
                    {label && !hideLabel && (
                        <label
                            htmlFor={htmlFor}
                            className="block text-sm font-medium"
                            style={{
                                color: 'var(--theme-base-content)',
                                opacity: 0.8,
                            }}
                        >
                            {label}
                            {labelHint && (
                                <span
                                    className="font-normal ms-1.5"
                                    style={{ opacity: 0.5 }}
                                >
                                    {labelHint}
                                </span>
                            )}
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
                        color: 'var(--theme-base-content)',
                        opacity: 0.6,
                    }}
                >
                    {helper}
                </p>
            )}
        </div>
    );
}
