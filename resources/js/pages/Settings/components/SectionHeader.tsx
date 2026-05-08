/**
 * Section header — the icon + title + subtitle + optional uppercase
 * label that sits at the top of every section card.
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
    return (
        <div className="relative overflow-hidden px-8 py-8 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
            <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/5 blur-2xl" aria-hidden="true" />
            <div className="relative flex items-start gap-5">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/15 border border-primary/20">
                    <i className={`fa-solid ${icon} text-xl text-primary`} />
                </div>
                <div className="min-w-0">
                    {label && (
                        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.25em] text-primary/80">
                            {label}
                        </div>
                    )}
                    <h3 className="font-serif text-3xl font-bold leading-tight tracking-tight">{title}</h3>
                    <p className="mt-2 text-sm text-base-content/60 leading-relaxed">{subtitle}</p>
                </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" aria-hidden="true" />
        </div>
    );
}
