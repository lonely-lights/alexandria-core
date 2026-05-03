import { ReactNode, type CSSProperties } from 'react';

interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: string;
}

interface PageHeaderProps {
    /** Breadcrumb trail — last item is rendered as plain text. */
    breadcrumbs?: BreadcrumbItem[];
    /** Main content area (title, subtitle, etc.). */
    children: ReactNode;
    /** Right-aligned actions next to the title. */
    actions?: ReactNode;
    /** Right-aligned content in the breadcrumb bar (tabs, buttons, etc.). */
    tabs?: ReactNode;
    /**
     * Vertical padding around the title area, on the Tailwind spacing
     * scale (6 = py-6 = 1.5rem, 10 = py-10 = 2.5rem, etc.). Default 6.
     *
     * The navbar height is automatically appended to the TOP padding so
     * the element's background extends behind the fixed navbar while
     * the inner content still starts cleanly below it. Bottom padding
     * is exactly the value given.
     */
    py?: number;
    /**
     * Background image URL for the title bar. When set, the bar renders
     * the image as `background-size: cover` with a subtle dark-to-base
     * gradient overlay at the bottom so content stays legible against
     * photography. Use for character pages with portraits, world pages
     * with banners, etc.
     */
    bannerImage?: string;
    /**
     * Extra Tailwind classes merged onto the title-bar wrapper. Use to
     * override the default `bg-base-200/50` tint when you want a solid
     * color or themed background behind the title.
     */
    className?: string;
}

export default function PageHeader({
    breadcrumbs,
    children,
    actions,
    tabs,
    py = 6,
    bannerImage,
    className = '',
}: PageHeaderProps) {
    // Tailwind scale: 1 unit = 0.25rem. py is the caller's chosen padding;
    // we add the --navbar-height CSS var to the top so the banner/bg
    // extends past the fixed navbar while content stays below it.
    const pyRem = `${py * 0.25}rem`;

    const titleBarStyle: CSSProperties = {
        paddingTop: `calc(var(--navbar-height, 3.5rem) + ${pyRem})`,
        paddingBottom: pyRem,
    };

    if (bannerImage) {
        titleBarStyle.backgroundImage = `url('${bannerImage.replace(/'/g, "\\'")}')`;
        titleBarStyle.backgroundSize = 'cover';
        titleBarStyle.backgroundPosition = 'center';
    }

    const titleBarClass = [
        'relative',
        bannerImage ? '' : 'bg-base-200/50',
        className,
    ].filter(Boolean).join(' ');

    return (
        <>
            {/* Bar 1: Title area. Background extends from y=0 upward behind
                the fixed navbar; inline padding keeps content below it. */}
            <div className={titleBarClass} style={titleBarStyle}>
                {bannerImage && (
                    <div
                        className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-base-200/95"
                        aria-hidden="true"
                    />
                )}
                <div className="relative container mx-auto max-w-7xl px-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">{children}</div>
                        {actions && (
                            <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bar 2: Breadcrumbs + tabs. Top+bottom border at a brighter
                tone so the strip reads as a distinct band sandwiched
                between the hero bar above and the page content below. */}
            <div className="border-y border-base-content/15 bg-base-300/40">
                <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
                    {/* Breadcrumbs */}
                    {breadcrumbs && breadcrumbs.length > 0 ? (
                        <div className="flex items-center gap-2 text-sm text-base-content/50">
                            {breadcrumbs.map((crumb, i) => {
                                const isLast = i === breadcrumbs.length - 1;
                                const iconClass = crumb.icon
                                    ? (crumb.icon.includes(' ') ? crumb.icon : `fa-solid ${crumb.icon}`)
                                    : null;

                                return (
                                    <span key={i} className="flex items-center gap-2">
                                        {i > 0 && <i className="fa-solid fa-chevron-right text-[8px]" />}
                                        {isLast ? (
                                            <span className="text-base-content/70">
                                                {iconClass && <i className={`${iconClass} mr-1 text-xs`} />}
                                                {crumb.label}
                                            </span>
                                        ) : crumb.href ? (
                                            <a href={crumb.href} className="hover:text-primary hover:underline">
                                                {iconClass && <i className={`${iconClass} mr-1 text-xs`} />}
                                                {crumb.label}
                                            </a>
                                        ) : (
                                            <span>
                                                {iconClass && <i className={`${iconClass} mr-1 text-xs`} />}
                                                {crumb.label}
                                            </span>
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                    ) : (
                        <div />
                    )}

                    {/* Tabs / right-side content */}
                    {tabs && (
                        <div className="flex gap-2">{tabs}</div>
                    )}
                </div>
            </div>
        </>
    );
}
