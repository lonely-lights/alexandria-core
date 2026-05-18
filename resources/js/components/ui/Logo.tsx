import LogoMark from '../brand/LogoMark';

interface LogoProps {
    size?: string;
    className?: string;
}

/**
 * Backward-compatible thin wrapper around the canonical `<LogoMark>`.
 *
 * Pre-Stage-8f, `<Logo>` was a generic placeholder mark — consumer apps
 * were expected to override it. After 8f, the Alexandria mark is a
 * first-class brand asset (B11 design), so `<Logo>` simply delegates
 * to `<LogoMark>` and threads through the em-based size string so
 * existing callers (auth pages, app layout, welcome) stay compatible
 * without per-caller migration.
 *
 * New code should import `<LogoMark>` (or `<LogoLockup>`) directly —
 * this wrapper exists for API compatibility with the pre-8f
 * placeholder. It will be removed once all callers migrate.
 */
export default function Logo({ size = '3em', className }: LogoProps) {
    return (
        <LogoMark
            className={className}
            style={{ width: size, height: size }}
            ariaLabel=""
        />
    );
}
