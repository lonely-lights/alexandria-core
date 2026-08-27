import type { ButtonHTMLAttributes, ReactNode } from "react";

interface FabProps extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children"
> {
    /** Visible label for assistive tech (FAB shows only an icon). */
    label: string;
    /** Icon content. FontAwesome class string OR ReactNode. */
    icon?: string | ReactNode;
}

/**
 * Floating action button — anchored to the lower-right corner across all
 * viewports. On mobile it lifts above the BottomNav bar by clearing the
 * 4rem nav height + the iOS home-indicator inset; on lg+ it sits at a
 * regular margin from the edge.
 *
 * Stacking: BottomNav uses z-40, modals open at z-100. The FAB sits at
 * z-50 so it stays above the nav but ducks beneath any open modal.
 */
export default function Fab({
    label,
    icon = "fa-solid fa-plus",
    className = "",
    ...rest
}: FabProps) {
    return (
        <button
            type="button"
            aria-label={label}
            className={`alex-fab ${className}`.trim()}
            style={{
                position: "fixed",
                right: "1.25rem",
                bottom: "calc(env(safe-area-inset-bottom) + 4.75rem)",
                // 33% smaller than the original 3.5rem (owner, 2026-08-26)
                // — the full-size disc crowded the floating pill nav.
                width: "2.375rem",
                height: "2.375rem",
                borderRadius: "999px",
                background: "var(--theme-brand-primary-500)",
                color: "var(--theme-brand-primary-content)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
                border: "none",
                cursor: "pointer",
                zIndex: 50,
                // Brand-tinted glow + lifted dark shadow stacked. Glow keeps
                // the FAB visible against any base bg in either mode; the
                // dark shadow gives it weight on light pages.
                boxShadow:
                    "0 0 0 1px color-mix(in srgb, var(--theme-brand-primary-500) 30%, transparent), 0 8px 24px color-mix(in srgb, var(--theme-brand-primary-500) 40%, transparent), 0 4px 10px rgba(0, 0, 0, 0.25)",
                transition:
                    "transform var(--theme-motion-duration-interactive) var(--theme-motion-easing-standard), box-shadow var(--theme-motion-duration-interactive) var(--theme-motion-easing-standard), background var(--theme-motion-duration-interactive) var(--theme-motion-easing-standard)",
            }}
            {...rest}
        >
            {renderIcon(icon)}
        </button>
    );
}

function renderIcon(icon: string | ReactNode | undefined): ReactNode {
    if (icon == null) return null;
    if (typeof icon === "string") {
        const cls = icon.includes(" ") ? icon : `fa-solid ${icon}`;
        return <i className={cls} aria-hidden="true" />;
    }
    return icon;
}
