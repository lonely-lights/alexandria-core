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
    const activeKey: 'light' | 'dark' | 'system' = followSystem ? 'system' : mode;

    const options: Array<{ key: 'light' | 'dark' | 'system'; label: string; icon: string }> = [
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

    return (
        <div className="px-2 py-1.5">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
                Appearance
            </div>
            <div className="inline-flex w-full overflow-hidden rounded-md border border-base-content/15 bg-base-200">
                {options.map((opt) => {
                    const selected = activeKey === opt.key;
                    return (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleSelect(opt.key)}
                            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs transition-colors ${
                                selected
                                    ? 'bg-primary text-primary-content'
                                    : 'text-base-content/70 hover:bg-base-content/5'
                            }`}
                            aria-pressed={selected}
                            title={opt.label}
                        >
                            <i className={`fa-solid ${opt.icon} text-[11px]`} aria-hidden="true" />
                            <span className="hidden sm:inline">{opt.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
