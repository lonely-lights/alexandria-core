/**
 * AvailabilityIndicator — live status pill for username/email-availability
 * checks during registration.
 *
 * Rendered as TextField's `trailing` slot so it sits inside the input on
 * the inline-end side. Shows nothing on idle, a spinner while checking,
 * or a status icon (success/error) once the server responds.
 */

export type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken';

export interface AvailabilityIndicatorProps {
    status: AvailabilityStatus;

    /**
     * Accessible label for screen readers when the spinner is showing.
     * Defaults to "Checking availability".
     */
    checkingLabel?: string;
}

export default function AvailabilityIndicator({
    status,
    checkingLabel = 'Checking availability',
}: AvailabilityIndicatorProps) {
    if (status === 'idle') {
        return null;
    }

    if (status === 'checking') {
        return (
            <span
                role="status"
                aria-label={checkingLabel}
                className="inline-block animate-spin"
                style={{
                    width: '1rem',
                    height: '1rem',
                    border: '2px solid var(--theme-neutral-300)',
                    borderTopColor: 'var(--theme-brand-primary-500)',
                    borderRadius: '50%',
                }}
            />
        );
    }

    const color =
        status === 'available'
            ? 'var(--theme-status-success-fill)'
            : 'var(--theme-status-error-fill)';

    return (
        <svg
            width="1rem"
            height="1rem"
            viewBox="0 0 20 20"
            fill={color}
            aria-hidden="true"
        >
            {status === 'available' ? (
                <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                />
            ) : (
                <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                />
            )}
        </svg>
    );
}
