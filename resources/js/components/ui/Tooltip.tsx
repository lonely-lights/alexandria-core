import { useState, useRef, type CSSProperties, type ReactNode, type ReactElement, cloneElement, isValidElement } from 'react';
import {
    useFloating,
    useHover,
    useDismiss,
    useRole,
    useInteractions,
    offset,
    flip,
    shift,
    arrow,
    FloatingPortal,
    FloatingArrow,
    type Placement,
} from '@floating-ui/react';
import { cn } from '../../lib/utils';

type TooltipVariant = 'default' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';

interface TooltipProps {
    /** The content shown inside the tooltip */
    content: ReactNode;
    /** The trigger element (must accept ref) */
    children: ReactElement;
    /** Placement relative to the trigger */
    placement?: Placement;
    /** Color variant — maps to brand or status theme tokens */
    variant?: TooltipVariant;
    /** Delay before showing (ms) */
    delay?: number;
    /** Add a bounce animation to draw attention */
    bounce?: boolean;
    /** Disable the tooltip */
    disabled?: boolean;
}

// Variant → theme token resolution. Both `bg` and `text` are CSS
// var() references that the panel + arrow share, so the arrow color
// always tracks whatever the panel paints. Using brand-* tokens for
// the brand variants and status-* tokens for the status variants
// (instead of DaisyUI's --p / --s / --in / etc) means tooltips
// repaint when the active preset changes.
//
// `default` paints the brand-secondary tone — same tooltip "voice"
// the legacy variant had, just routed through --theme-* now.
const VARIANT_TOKENS: Record<TooltipVariant, { bg: string; text: string }> = {
    default: {
        bg: 'var(--theme-brand-secondary-500)',
        text: 'var(--theme-brand-secondary-content)',
    },
    primary: {
        bg: 'var(--theme-brand-primary-500)',
        text: 'var(--theme-brand-primary-content)',
    },
    secondary: {
        bg: 'var(--theme-brand-secondary-500)',
        text: 'var(--theme-brand-secondary-content)',
    },
    accent: {
        bg: 'var(--theme-brand-accent-500)',
        text: 'var(--theme-brand-accent-content)',
    },
    info: {
        bg: 'var(--theme-status-info-fill)',
        text: 'var(--theme-status-info-content)',
    },
    success: {
        bg: 'var(--theme-status-success-fill)',
        text: 'var(--theme-status-success-content)',
    },
    warning: {
        bg: 'var(--theme-status-warning-fill)',
        text: 'var(--theme-status-warning-content)',
    },
    error: {
        bg: 'var(--theme-status-error-fill)',
        text: 'var(--theme-status-error-content)',
    },
};

export default function Tooltip({
    content,
    children,
    placement = 'top',
    variant = 'default',
    delay = 200,
    bounce = false,
    disabled = false,
}: TooltipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const arrowRef = useRef<SVGSVGElement>(null);

    const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        placement,
        middleware: [
            offset(10),
            flip(),
            shift({ padding: 8 }),
            arrow({ element: arrowRef }),
        ],
    });

    const hover = useHover(context, {
        delay: { open: delay, close: 50 },
        enabled: !disabled,
    });
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: 'tooltip' });

    const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss, role]);

    const tokens = VARIANT_TOKENS[variant];

    const panelStyle: CSSProperties = {
        ...floatingStyles,
        background: tokens.bg,
        color: tokens.text,
        borderRadius: 'var(--theme-radius-button)',
        boxShadow: '0 0 16px rgba(0, 0, 0, 0.25)',
    };

    return (
        <>
            {isValidElement(children) &&
                cloneElement(children, {
                    ref: refs.setReference,
                    ...getReferenceProps(),
                } as Record<string, unknown>)}

            {isOpen && content && (
                <FloatingPortal>
                    <div
                        ref={refs.setFloating}
                        style={panelStyle}
                        {...getFloatingProps()}
                        className={cn(
                            'z-[9999] max-w-xs px-3 py-1.5 text-xs font-medium',
                            bounce && 'animate-bounce',
                        )}
                    >
                        {content}
                        <FloatingArrow
                            ref={arrowRef}
                            context={context}
                            width={12}
                            height={6}
                            style={{ fill: tokens.bg }}
                        />
                    </div>
                </FloatingPortal>
            )}
        </>
    );
}
