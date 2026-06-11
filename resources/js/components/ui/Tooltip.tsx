import { useState, useRef, type CSSProperties, type ReactNode, type ReactElement, cloneElement, isValidElement } from 'react';
import {
    useFloating,
    useHover,
    useDismiss,
    useRole,
    useInteractions,
    useTransitionStyles,
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

type TooltipTone = 'default' | 'error';

interface TooltipProps {
    /** The content shown inside the tooltip */
    content: ReactNode;
    /** The trigger element (must accept ref) */
    children: ReactElement;
    /** Placement relative to the trigger */
    placement?: Placement;
    /** Color variant — maps to brand or status theme tokens */
    variant?: TooltipVariant;
    /**
     * Controlled visibility. When provided, hover behavior is bypassed
     * entirely and the bubble shows iff `open` is true — used for
     * anchored field-error poppers where the CALLER owns the lifecycle
     * (e.g. show while a validation error exists). Omit for the
     * classic hover tooltip.
     */
    open?: boolean;
    /**
     * Visual tone. `error` swaps the solid variant fill for a soft
     * status-error bubble (tinted card surface + error stroke border
     * and text) so validation messages read as field feedback, not a
     * hover hint. `default` keeps the variant-token painting.
     */
    tone?: TooltipTone;
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
    open,
    tone = 'default',
    delay = 200,
    bounce = false,
    disabled = false,
}: TooltipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const arrowRef = useRef<SVGSVGElement>(null);

    // Controlled mode: when `open` is provided the caller drives
    // visibility — internal hover state is ignored and the hover /
    // dismiss interactions are disabled so nothing can close the
    // bubble out from under the caller.
    const isControlled = open !== undefined;
    const visible = isControlled ? open : isOpen;

    const { refs, floatingStyles, context } = useFloating({
        open: visible,
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
        enabled: !disabled && !isControlled,
    });
    const dismiss = useDismiss(context, { enabled: !isControlled });
    const role = useRole(context, { role: 'tooltip' });

    const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss, role]);

    // Slide + fade entrance/exit. Distance is intentionally short
    // (4px) and durations short (open 140ms, close 90ms) so the
    // motion reads as snappy hover feedback rather than a slow modal
    // entrance. Direction depends on `side`: tooltip slides AWAY from
    // the trigger on enter (so it appears to grow out of the trigger
    // edge it sits next to). `isMounted` keeps the node alive through
    // the close animation; we use it instead of `isOpen` for render.
    const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
        duration: { open: 140, close: 90 },
        initial: ({ side }) => ({
            opacity: 0,
            transform:
                side === 'top' ? 'translateY(4px)' :
                side === 'bottom' ? 'translateY(-4px)' :
                side === 'left' ? 'translateX(4px)' :
                'translateX(-4px)',
        }),
    });

    const tokens = VARIANT_TOKENS[variant];

    // Error tone: a soft tinted card bubble (12% error stroke mixed
    // into the card surface) with the stroke for border + text, so the
    // popper reads as field-validation feedback instead of the solid
    // hover-hint fill. The arrow shares the same fill + stroke so it
    // tracks the bubble exactly.
    const errorBg = 'color-mix(in srgb, var(--theme-status-error-stroke) 12%, var(--theme-surface-card))';
    const isErrorTone = tone === 'error';

    const panelStyle: CSSProperties = isErrorTone
        ? {
              background: errorBg,
              color: 'var(--theme-status-error-stroke)',
              border: '1px solid var(--theme-status-error-stroke)',
              borderRadius: 'var(--theme-radius-button)',
              boxShadow: '0 0 16px rgba(0, 0, 0, 0.25)',
              ...transitionStyles,
          }
        : {
              background: tokens.bg,
              color: tokens.text,
              borderRadius: 'var(--theme-radius-button)',
              boxShadow: '0 0 16px rgba(0, 0, 0, 0.25)',
              ...transitionStyles,
          };

    return (
        <>
            {isValidElement(children) &&
                cloneElement(children, {
                    ref: refs.setReference,
                    ...getReferenceProps(),
                } as Record<string, unknown>)}

            {isMounted && content && (
                <FloatingPortal>
                    {/* Outer div carries floating-ui positioning; inner
                        div carries the animated panel + arrow so the
                        transform-based slide doesn't fight floating-ui's
                        positioning transform. */}
                    <div
                        ref={refs.setFloating}
                        style={floatingStyles}
                        {...getFloatingProps()}
                        className="z-[9999]"
                    >
                        <div
                            style={panelStyle}
                            className={cn(
                                'max-w-xs px-3 py-1.5 text-xs font-medium',
                                bounce && 'animate-bounce',
                            )}
                        >
                            {content}
                            <FloatingArrow
                                ref={arrowRef}
                                context={context}
                                width={12}
                                height={6}
                                stroke={isErrorTone ? 'var(--theme-status-error-stroke)' : undefined}
                                strokeWidth={isErrorTone ? 1 : 0}
                                style={{ fill: isErrorTone ? errorBg : tokens.bg }}
                            />
                        </div>
                    </div>
                </FloatingPortal>
            )}
        </>
    );
}
