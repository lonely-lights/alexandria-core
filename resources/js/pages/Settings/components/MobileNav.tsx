import { useState, type CSSProperties } from 'react';
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

    const currentLabel =
        ALL_NAV.flatMap((i) => [i, ...(i.children ?? [])]).find((i) => i.key === activeSection)?.label
        ?? 'Settings';

    const triggerStyle: CSSProperties = {
        background: 'color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
        color: 'var(--theme-base-content)',
        borderRadius: 'var(--theme-radius-button)',
    };
    const dropdownStyle: CSSProperties = {
        background: 'var(--theme-base-surface)',
        border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
        borderRadius: 'var(--theme-radius-card)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
    };

    function rowStyle(active: boolean): CSSProperties {
        if (active) {
            return {
                background: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
                color: 'var(--theme-brand-primary-500)',
                borderRadius: 'var(--theme-radius-button)',
            };
        }
        return {
            color: 'var(--theme-base-content)',
            borderRadius: 'var(--theme-radius-button)',
        };
    }

    function childRowStyle(active: boolean): CSSProperties {
        if (active) {
            return {
                background: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
                color: 'var(--theme-brand-primary-500)',
                borderRadius: 'var(--theme-radius-button)',
            };
        }
        return {
            color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
            borderRadius: 'var(--theme-radius-button)',
        };
    }

    return (
        <div className="space-y-2 lg:hidden">
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium transition-colors"
                    style={triggerStyle}
                >
                    <span>{currentLabel}</span>
                    <i
                        className={`fa-solid fa-chevron-down text-xs transition-transform ${open ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                    />
                </button>
                {open && (
                    <div
                        className="absolute left-0 right-0 top-full z-20 mt-2 p-2"
                        style={dropdownStyle}
                    >
                        {ALL_NAV.map((item) => (
                            <div key={item.key}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (item.children) {
                                            onToggleGroup(item.key);
                                        } else {
                                            onSectionChange(item.key);
                                            setOpen(false);
                                        }
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm"
                                    style={rowStyle(activeSection === item.key)}
                                >
                                    <i className={`fa-solid ${item.icon} w-4`} aria-hidden="true" />
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {item.children && (
                                        <i
                                            className={`fa-solid fa-chevron-down text-xs ${expandedGroups[item.key] ? 'rotate-180' : ''}`}
                                            aria-hidden="true"
                                        />
                                    )}
                                </button>
                                {item.children && expandedGroups[item.key] && item.children.map((child) => (
                                    <button
                                        type="button"
                                        key={child.key}
                                        onClick={() => { onSectionChange(child.key); setOpen(false); }}
                                        className="flex w-full items-center gap-2 py-1.5 pl-10 pr-3 text-sm"
                                        style={childRowStyle(activeSection === child.key)}
                                    >
                                        <i className={`fa-solid ${child.icon} w-4`} aria-hidden="true" />
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
