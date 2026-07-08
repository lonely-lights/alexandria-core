import { type CSSProperties, type ReactNode } from 'react';

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
     * override the default theme tint when you want a solid color or
     * themed background behind the title.
     */
    className?: string;
    /**
     * Optional narrow strip rendered between the title bar and the
     * breadcrumb/tab strip — used for lightweight desktop menu bars
     * (File / Edit / View). The slot is generic so any ReactNode works.
     */
    menuBar?: ReactNode;
}

export default function PageHeader({
    breadcrumbs,
    children,
    actions,
    tabs,
    py = 6,
    bannerImage,
    className = '',
    menuBar,
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
    } else {
        // Subtle base-content tint so the title bar reads as a distinct
        // band against the page surface. color-mix into transparent
        // gives the same "10% wash" effect as the legacy bg-base-200/50
        // utility, but tracks the active --theme-base-content instead
        // of DaisyUI's preset-frozen --color-base-200.
        titleBarStyle.background = 'color-mix(in srgb, var(--theme-base-content) 5%, transparent)';
    }

    const titleBarClass = ['relative', className].filter(Boolean).join(' ');

    const breadcrumbStripStyle: CSSProperties = {
        background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
        borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
        borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    };

    const breadcrumbTextStyle: CSSProperties = {
        color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
    };

    const currentCrumbStyle: CSSProperties = {
        color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
    };

    return (
        <>
            {/* Bar 1: Title area. Background extends from y=0 upward behind
                the fixed navbar; inline padding keeps content below it. */}
            <div className={titleBarClass} style={titleBarStyle}>
                {bannerImage && (
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                'linear-gradient(to bottom, rgba(0, 0, 0, 0.20), transparent 35%, color-mix(in srgb, var(--theme-base-page) 95%, transparent))',
                        }}
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

            {/* Menu bar slot — desktop File/Edit/View chrome (optional). */}
            {menuBar}

            {/* Bar 2: Breadcrumbs + tabs. Skip entirely when both are
                empty — otherwise we'd render an orphaned bordered strip
                stacked above whatever follows the header. Top+bottom
                borders at a brighter tone so the strip reads as a
                distinct band sandwiched between the hero bar above and
                the page content below. All colors route through
                --theme-base-content via color-mix() so preset swaps
                repaint the strip. */}
            {((breadcrumbs && breadcrumbs.length > 0) || tabs) && (
            <div style={breadcrumbStripStyle}>
                <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
                    {/* Breadcrumbs */}
                    {breadcrumbs && breadcrumbs.length > 0 ? (
                        <div className="flex items-center gap-2 text-sm" style={breadcrumbTextStyle}>
                            {breadcrumbs.map((crumb, i) => {
                                const isLast = i === breadcrumbs.length - 1;
                                const iconClass = crumb.icon
                                    ? (crumb.icon.includes(' ') ? crumb.icon : `fa-solid ${crumb.icon}`)
                                    : null;

                                return (
                                    <span key={i} className="flex items-center gap-2">
                                        {i > 0 && <i className="fa-solid fa-chevron-right text-[8px]" />}
                                        {isLast ? (
                                            <span style={currentCrumbStyle}>
                                                {iconClass && <i className={`${iconClass} mr-1 text-xs`} />}
                                                {crumb.label}
                                            </span>
                                        ) : crumb.href ? (
                                            <a
                                                href={crumb.href}
                                                className="alex-page-header-crumb-link"
                                            >
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
            )}
        </>
    );
}
