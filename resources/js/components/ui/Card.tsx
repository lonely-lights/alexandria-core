/**
 * Card — surface container with optional header, body, footer slots.
 *
 * Two consumption shapes:
 *
 *   1. Plain card — pass children, get a card-radius padded surface
 *
 *      <Card>Body content</Card>
 *
 *   2. Slotted card — header on top, body in middle, footer on bottom
 *
 *      <Card>
 *          <CardHeader>Title row</CardHeader>
 *          <CardBody>Main content</CardBody>
 *          <CardFooter>Action row</CardFooter>
 *      </Card>
 *
 * Background reads from `--theme-surface-card`; border from
 * `--theme-neutral-300`; radius from `--theme-radius-card`. Header and
 * footer get their own slightly-elevated/sunken backgrounds via the
 * surface-raised / surface-sunken tokens for visual hierarchy.
 */

import type { CSSProperties, ReactNode } from 'react';

export interface CardProps {
    children: ReactNode;

    /**
     * When true, drops internal padding so consumers using slot components
     * (CardHeader / CardBody / CardFooter) get clean horizontal rules.
     * Default false — plain children get standard padding.
     */
    slotted?: boolean;

    /** Extra Tailwind classes for layout. */
    className?: string;
}

const CARD_BASE: CSSProperties = {
    background: 'var(--theme-surface-card)',
    color: 'var(--theme-surface-on-page)',
    border: '1px solid var(--theme-neutral-300)',
    borderRadius: 'var(--theme-radius-card)',
    overflow: 'hidden',
};

export default function Card({ children, slotted = false, className = '' }: CardProps) {
    const style: CSSProperties = slotted
        ? CARD_BASE
        : { ...CARD_BASE, padding: '1.25rem' };

    return (
        <div className={className} style={style}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div
            className={className}
            style={{
                padding: '0.875rem 1.25rem',
                background: 'var(--theme-surface-raised)',
                borderBottom: '1px solid var(--theme-neutral-300)',
                fontWeight: 600,
            }}
        >
            {children}
        </div>
    );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={className} style={{ padding: '1.25rem' }}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div
            className={className}
            style={{
                padding: '0.875rem 1.25rem',
                background: 'var(--theme-surface-sunken)',
                borderTop: '1px solid var(--theme-neutral-300)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
            }}
        >
            {children}
        </div>
    );
}
