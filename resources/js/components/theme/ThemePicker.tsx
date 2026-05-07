import { useTheme } from '../../hooks/useTheme';

/**
 * Compact Light / Dark / System picker for the user dropdown. Writes
 * straight to the user's preferences via `useTheme` — silent (no toast)
 * and no page refresh. Renders a single segmented control so all three
 * options stay visible at a glance.
 *
 * Renders nothing when there is no surrounding `<ThemeProvider>` (so it
 * is safe to drop in unconditionally).
 *
 * Pair with the user-dropdown menu in core's `Navbar` component, or use
 * standalone wherever a quick theme toggle is helpful.
 */
export default function ThemePicker() {
    const theme = useTheme();
    if (!theme) return null;

    const { mode, followSystem, setMode, setFollowSystem } = theme;
    const activeKey: 'light' | 'dark' | 'system' = followSystem
        ? 'system'
        : mode;

    const options: Array<{
        key: 'light' | 'dark' | 'system';
        label: string;
        icon: string;
    }> = [
        { key: 'light', label: 'Light', icon: 'fa-sun' },
        { key: 'dark', label: 'Dark', icon: 'fa-moon' },
        { key: 'system', label: 'System', icon: 'fa-circle-half-stroke' },
    ];

    function handleSelect(key: 'light' | 'dark' | 'system'): void {
        if (key === 'system') {
            setFollowSystem(true);
        } else {
            setMode(key);
        }
    }

    function openThemeChooser(): void {
        // Decoupled from preset state — consumers that mount a theme
        // chooser modal listen for this event. Core stays preset-blind;
        // app-side ThemeChooserModal handles the response. See
        // alexandria-app/resources/js/components/dev/ThemeChooserModal.tsx.
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('alexandria:open-theme-chooser'),
            );
        }
    }

    return (
        <div className="flex flex-col gap-1.5 px-2 py-1.5">
            <div
                className="alex-appearance-picker inline-flex w-full overflow-hidden rounded-md"
                style={{
                    background: 'var(--theme-base-200)',
                    border: '1px solid var(--theme-base-400)',
                }}
            >
                {options.map((opt) => {
                    const selected = activeKey === opt.key;
                    return (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleSelect(opt.key)}
                            className="alex-appearance-btn flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs transition-colors"
                            style={
                                selected
                                    ? {
                                          background:
                                              'var(--theme-brand-primary-500)',
                                          color: 'var(--theme-brand-primary-content)',
                                      }
                                    : {
                                          background: 'transparent',
                                          color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
                                      }
                            }
                            aria-pressed={selected}
                            title={opt.label}
                        >
                            <i
                                className={`fa-solid ${opt.icon} text-[11px]`}
                                aria-hidden="true"
                            />
                            <span className="hidden sm:inline">
                                {opt.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Theme chooser trigger — dispatches a global event the app
                listens for. Renders unconditionally; consumers that
                don't mount a listener silently no-op when clicked. */}
            <button
                type="button"
                onClick={openThemeChooser}
                className="alex-theme-chooser-trigger flex w-full items-center gap-2 px-2.5 py-1.5 text-xs transition-colors"
                style={{
                    background: 'transparent',
                    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
                    border: '1px solid var(--theme-base-400)',
                    borderRadius: 'var(--theme-radius-button)',
                }}
            >
                <i
                    className="fa-solid fa-palette text-[11px]"
                    aria-hidden="true"
                />
                <span>Theme</span>
                <i
                    className="fa-solid fa-chevron-right ml-auto text-[0.65rem]"
                    aria-hidden="true"
                    style={{ opacity: 0.5 }}
                />
            </button>
        </div>
    );
}
