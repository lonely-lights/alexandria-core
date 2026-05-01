import { useState, useRef, type ReactNode, type ReactElement, cloneElement, isValidElement } from 'react';
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
    /** DaisyUI color variant */
    variant?: TooltipVariant;
    /** Delay before showing (ms) */
    delay?: number;
    /** Add a bounce animation to draw attention */
    bounce?: boolean;
    /** Disable the tooltip */
    disabled?: boolean;
}

const VARIANT_STYLES: Record<TooltipVariant, { bg: string; text: string; arrowVar: string }> = {
    default: { bg: 'bg-secondary', text: 'text-secondary-content', arrowVar: '--s' },
    primary: { bg: 'bg-primary', text: 'text-primary-content', arrowVar: '--p' },
    secondary: { bg: 'bg-secondary', text: 'text-secondary-content', arrowVar: '--s' },
    accent: { bg: 'bg-accent', text: 'text-accent-content', arrowVar: '--a' },
    info: { bg: 'bg-info', text: 'text-info-content', arrowVar: '--in' },
    success: { bg: 'bg-success', text: 'text-success-content', arrowVar: '--su' },
    warning: { bg: 'bg-warning', text: 'text-warning-content', arrowVar: '--wa' },
    error: { bg: 'bg-error', text: 'text-error-content', arrowVar: '--er' },
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

    const style = VARIANT_STYLES[variant];

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
                        style={floatingStyles}
                        {...getFloatingProps()}
                        className={cn(
                            'z-[9999] max-w-xs rounded-lg px-3 py-1.5 text-xs font-medium tooltip-enter shadow-[0_0_16px_rgba(0,0,0,0.25)]',
                            style.bg,
                            style.text,
                            bounce && 'animate-bounce',
                        )}
                    >
                        {content}
                        <FloatingArrow
                            ref={arrowRef}
                            context={context}
                            width={12}
                            height={6}
                            style={{ fill: `oklch(var(${style.arrowVar}))` }}
                        />
                    </div>
                </FloatingPortal>
            )}
        </>
    );
}
