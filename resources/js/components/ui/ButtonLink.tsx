/**
 * ButtonLink — same visual surface as <Button>, rendered as Inertia <Link>.
 *
 * Use when the click destination is a route (preserves SPA navigation) OR
 * when you want the button to render as an <a> for raw URLs / external
 * targets. Pass `external` to render as a plain <a> instead of an Inertia
 * <Link> (e.g. mailto:, tel:, https:// to a third party).
 *
 * Hover behavior comes from the shared `.alex-btn--{variant}` CSS rules.
 * Icon prop + iconPosition mirror Button's API.
 */

import { Link } from '@inertiajs/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

import {
    buttonStyles,
    renderIcon,
    type ButtonIcon,
    type ButtonIconPosition,
    type ButtonStyleProps,
} from './Button';

export interface ButtonLinkProps
    extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'>,
        ButtonStyleProps {
    children: ReactNode;

    /** Destination URL. Always required. */
    href: string;

    /**
     * When true, render as a plain `<a>` (full page navigation).
     * Defaults to false → renders as Inertia `<Link>` (SPA navigation).
     */
    external?: boolean;

    /** FontAwesome class string or ReactNode (SVG / custom JSX). */
    icon?: ButtonIcon;

    /** Where the icon sits relative to the text. Default 'after'. */
    iconPosition?: ButtonIconPosition;
}

export default function ButtonLink({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    external = false,
    icon,
    iconPosition = 'after',
    href,
    children,
    className = '',
    ...rest
}: ButtonLinkProps) {
    const style = buttonStyles({ variant, size, fullWidth });
    const classes = `alex-btn alex-btn--${variant} ${className}`;
    const iconElement = renderIcon(icon);

    const inner = (
        <>
            {iconPosition === 'before' && iconElement}
            {children}
            {iconPosition === 'after' && iconElement}
        </>
    );

    if (external) {
        return (
            <a href={href} className={classes} style={style} {...rest}>
                {inner}
            </a>
        );
    }

    return (
        <Link href={href} className={classes} style={style}>
            {inner}
        </Link>
    );
}
