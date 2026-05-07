interface LogoProps {
    size?: string;
    className?: string;
}

/**
 * Generic placeholder brand mark.
 *
 * Consumer apps SHOULD override this — `Logo` is the symbol auth
 * pages and the sidebar render in their brand slot, and shipping
 * a real brand mark is an app-side concern. The placeholder is a
 * theme-aware geometric mark (no embedded gradient ids, uses
 * DaisyUI's primary/base-100 tokens) that renders cleanly under
 * any consumer theme but is obviously not "the" brand.
 *
 * Override paths:
 *   1. Publish + replace this file via your app's resources/js
 *      tree (via @alexandria alias shadowing).
 *   2. Pass your own `<Logo />` equivalent into the auth page
 *      / sidebar slots — e.g.
 *      `<AppLayout sidebarLogo={<MyBrandLogo />} ... />`.
 */
export default function Logo({ size = '2.5em', className }: LogoProps) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            width={size}
            height={size}
            aria-hidden="true"
        >
            {/* Outer rounded square — brand primary (preset + mode aware) */}
            <rect
                x="6"
                y="6"
                width="88"
                height="88"
                rx="20"
                ry="20"
                fill="var(--theme-brand-primary-500)"
            />
            {/* Inner notch — page bg so it cuts cleanly out of the square */}
            <rect
                x="22"
                y="22"
                width="56"
                height="56"
                rx="10"
                ry="10"
                fill="var(--theme-base-page)"
            />
            {/* Center dot — brand primary again */}
            <circle
                cx="50"
                cy="50"
                r="12"
                fill="var(--theme-brand-primary-500)"
            />
        </svg>
    );
}
