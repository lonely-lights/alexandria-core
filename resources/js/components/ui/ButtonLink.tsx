/**
 * ButtonLink — same visual surface as <Button>, rendered as Inertia <Link>.
 *
 * Use when the click destination is a route (preserves SPA navigation) OR
 * when you want the button to render as an <a> for raw URLs / external
 * targets. Pass `external` to render as a plain <a> instead of an Inertia
 * <Link> (e.g. mailto:, tel:, https:// to a third party).
 */

import { Link } from '@inertiajs/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

import { buttonStyles, type ButtonStyleProps } from './Button';

export interface ButtonLinkProps extends
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'>,
    ButtonStyleProps {
    children: ReactNode;

    /** Destination URL. Always required. */
    href: string;

    /**
     * When true, render as a plain `<a>` (full page navigation).
     * Defaults to false → renders as Inertia `<Link>` (SPA navigation).
     */
    external?: boolean;
}

export default function ButtonLink({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    external = false,
    href,
    children,
    className = '',
    ...rest
}: ButtonLinkProps) {
    const style = buttonStyles({ variant, size, fullWidth });

    if (external) {
        return (
            <a
                href={href}
                className={`alex-btn ${className}`}
                style={style}
                {...rest}
            >
                {children}
            </a>
        );
    }

    return (
        <Link
            href={href}
            className={`alex-btn ${className}`}
            style={style}
        >
            {children}
        </Link>
    );
}
