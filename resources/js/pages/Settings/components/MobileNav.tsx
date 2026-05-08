import { useState } from 'react';
import { ALL_NAV } from '../nav-config';

/**
 * Current mobile-only settings nav — collapses the desktop rail into a
 * single button that opens an accordion-style panel below it. Slated to
 * be replaced by a drawer + slide-over drilldown primitive in step 3
 * of the settings/profile conversion plan; until then this preserves
 * the existing mobile experience verbatim.
 */
export default function MobileNav({
    activeSection,
    expandedGroups,
    onSectionChange,
    onToggleGroup,
}: {
    activeSection: string;
    expandedGroups: Record<string, boolean>;
    onSectionChange: (key: string) => void;
    onToggleGroup: (key: string) => void;
}) {
    const [open, setOpen] = useState(false);

    const currentLabel = ALL_NAV.flatMap((i) => [i, ...(i.children ?? [])]).find((i) => i.key === activeSection)?.label ?? 'Settings';

    return (
        <div className="space-y-2 lg:hidden">
            <div className="relative">
                <button
                    onClick={() => setOpen(!open)}
                    className="btn btn-ghost w-full justify-between rounded-xl bg-base-200/50"
                >
                    <span>{currentLabel}</span>
                    <i className={`fa-solid fa-chevron-down text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-base-300/50 bg-base-200 p-2 shadow-lg">
                        {ALL_NAV.map((item) => (
                            <div key={item.key}>
                                <button
                                    onClick={() => {
                                        if (item.children) {
                                            onToggleGroup(item.key);
                                        } else {
                                            onSectionChange(item.key);
                                            setOpen(false);
                                        }
                                    }}
                                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${activeSection === item.key ? 'bg-primary/10 text-primary' : ''}`}
                                >
                                    <i className={`fa-solid ${item.icon} w-4`} />
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {item.children && <i className={`fa-solid fa-chevron-down text-xs ${expandedGroups[item.key] ? 'rotate-180' : ''}`} />}
                                </button>
                                {item.children && expandedGroups[item.key] && item.children.map((child) => (
                                    <button
                                        key={child.key}
                                        onClick={() => { onSectionChange(child.key); setOpen(false); }}
                                        className={`flex w-full items-center gap-2 rounded-lg py-1.5 pl-10 pr-3 text-sm ${activeSection === child.key ? 'bg-primary/10 text-primary' : 'text-base-content/70'}`}
                                    >
                                        <i className={`fa-solid ${child.icon} w-4`} />
                                        {child.label}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
