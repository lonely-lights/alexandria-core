/**
 * Section header — the icon + title + subtitle + optional uppercase
 * label that sits at the top of every section card. All accent colours
 * come from the `--theme-brand-primary-*` token family so preset swaps
 * repaint the header alongside the rest of the chrome.
 */
export default function SectionHeader({
    icon,
    title,
    subtitle,
    label,
}: {
    icon: string;
    title: string;
    subtitle: string;
    label?: string;
}) {
    const brandTint10 = 'color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)';
    const brandTint15 = 'color-mix(in srgb, var(--theme-brand-primary-500) 15%, transparent)';
    const brandTint20 = 'color-mix(in srgb, var(--theme-brand-primary-500) 20%, transparent)';
    const brandTint5 = 'color-mix(in srgb, var(--theme-brand-primary-500) 5%, transparent)';
    const brandTint80 = 'color-mix(in srgb, var(--theme-brand-primary-500) 80%, transparent)';
    const subtitleColor = 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)';

    return (
        <div
            className="relative overflow-hidden px-8 py-8"
            style={{
                background: `linear-gradient(to bottom right, ${brandTint10}, transparent, transparent)`,
            }}
        >
            <div
                className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 blur-2xl"
                style={{
                    background: brandTint5,
                    borderRadius: 'var(--theme-radius-badge)',
                }}
                aria-hidden="true"
            />
            <div className="relative flex items-start gap-5">
                <div
                    className={`flex h-15 w-15 flex-shrink-0 items-center justify-center border ${label ? 'mt-3' : ''}`}
                    style={{
                        background: brandTint15,
                        borderColor: brandTint20,
                        borderRadius: 'var(--theme-radius-card)',
                    }}
                >
                    <i
                        className={`fa-solid ${icon} text-2xl`}
                        style={{ color: 'var(--theme-brand-primary-500)' }}
                    />
                </div>
                <div className="min-w-0">
                    {label && (
                        <div
                            className="mb-0.5 text-[11px] font-semibold uppercase tracking-[.25em]"
                            style={{ color: brandTint80 }}
                        >
                            {label}
                        </div>
                    )}
                    <h3 className="font-serif text-3xl font-bold leading-tight tracking-tight">{title}</h3>
                    <p
                        className="mt-0.5 text-sm leading-relaxed"
                        style={{ color: subtitleColor }}
                    >
                        {subtitle}
                    </p>
                </div>
            </div>
            <div
                className="absolute inset-x-0 bottom-0 h-px"
                style={{
                    background: `linear-gradient(to right, transparent, ${brandTint20}, transparent)`,
                }}
                aria-hidden="true"
            />
        </div>
    );
}
