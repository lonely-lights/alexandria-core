import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import type { BottomNavTab } from '../../types/navigation';

interface BottomNavProps {
    /**
     * Tabs to render left-to-right. Five tabs render evenly spaced across the
     * bar; layout is symmetric so consumers should always pass exactly five.
     */
    tabs: BottomNavTab[];
}

/**
 * Mobile bottom navigation (lg-and-down). Five evenly-spaced tabs over a
 * blurred surface-card background. The "create" affordance is intentionally
 * NOT here — it lives in a separate floating action button anchored to the
 * lower-right.
 *
 * Tabs route via Inertia <Link>. A tab with `href: '#'` + an `onClick`
 * handler renders as a <button> so consumers can wire popovers / modals
 * without abusing anchor semantics.
 */
export default function BottomNav({ tabs }: BottomNavProps) {
    const url = usePage().url;

    return (
        <nav
            aria-label="Primary mobile navigation"
            className="fixed inset-x-0 bottom-0 z-40 flex items-stretch lg:hidden"
            style={{
                height: '4rem',
                paddingBottom: 'env(safe-area-inset-bottom)',
                // base-chrome is the elevated-chrome surface (darker than
                // page in light mode, lighter in dark) — same role as
                // the top navbar. The base ramp flips direction per mode
                // so navbars + footers read correctly in both.
                background:
                    'color-mix(in srgb, var(--theme-base-chrome) 88%, transparent)',
                borderTop: '1px solid var(--theme-base-400)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
            }}
        >
            {tabs.map((tab) => (
                <Tab key={tab.id} tab={tab} active={isActive(tab, url)} />
            ))}
        </nav>
    );
}

function isActive(tab: BottomNavTab, url: string): boolean {
    if (tab.href === '#' || tab.href === '') {
        return false;
    }
    return url === tab.href || url.startsWith(`${tab.href}/`);
}

interface TabProps {
    tab: BottomNavTab;
    active: boolean;
}

// Active + hover tabs use the SAME color pair so the visual treatment is
// consistent. The pair flips per mode via CSS native `light-dark()`,
// driven by `color-scheme: dark | light` set on documentElement by
// the ThemeProvider. In light mode we get a pale brand bg + deep brand
// text; in dark mode we flip to a deep brand bg + pale brand text. The
// 100/700 vs 800/200 stops keep contrast high in both directions.
const ACTIVE_COLOR =
    'light-dark(var(--theme-brand-primary-700), var(--theme-brand-primary-200))';
const ACTIVE_BG =
    'light-dark(var(--theme-brand-primary-100), var(--theme-brand-primary-800))';

function Tab({ tab, active }: TabProps) {
    const colorVar = active
        ? ACTIVE_COLOR
        : 'color-mix(in srgb, var(--theme-surface-on-page) 65%, transparent)';

    const backgroundVar = active ? ACTIVE_BG : 'transparent';

    const className =
        'flex flex-1 flex-col items-center justify-center gap-1 text-center no-underline transition-colors';

    const inner = (
        <>
            <span className="relative inline-flex items-center justify-center">
                {renderIcon(tab.icon)}
                {tab.badge != null && tab.badge !== '' && (
                    <span
                        className="absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] leading-none"
                        style={{
                            background: 'var(--theme-brand-primary-500)',
                            color: 'var(--theme-brand-primary-on)',
                        }}
                    >
                        {tab.badge}
                    </span>
                )}
            </span>
            <span
                className="text-[0.6875rem] tracking-tight"
                style={{ fontWeight: active ? 600 : 500 }}
            >
                {tab.label}
            </span>
        </>
    );

    const baseStyle = { color: colorVar, background: backgroundVar };

    // Action-only tabs (href '#') render as buttons. Useful for tabs that
    // open modals / sheets rather than navigating.
    if (tab.href === '#' || tab.href === '') {
        return (
            <button
                type="button"
                aria-label={tab.label}
                className={className}
                style={baseStyle}
                onClick={(e) =>
                    tab.onClick?.({ preventDefault: () => e.preventDefault() })
                }
            >
                {inner}
            </button>
        );
    }

    return (
        <Link
            href={tab.href}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
            className={className}
            style={baseStyle}
            onClick={
                tab.onClick
                    ? (e) =>
                          tab.onClick!({
                              preventDefault: () => e.preventDefault(),
                          })
                    : undefined
            }
        >
            {inner}
        </Link>
    );
}

function renderIcon(icon: string | ReactNode | undefined): ReactNode {
    if (icon == null) return null;
    if (typeof icon === 'string') {
        const cls = icon.includes(' ') ? icon : `fa-solid ${icon}`;
        return <i className={`${cls} text-base`} aria-hidden="true" />;
    }
    return icon;
}
