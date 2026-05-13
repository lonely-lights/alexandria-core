import {
    TOGGLE_ACCENT_COLOR,
    helperStyle,
    toggleCardStyle,
} from "./settingsPanelStyles";

interface SettingsActivationToggleProps {
    title: string;
    description: string;
    enabled: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
    /** Optional small status line under the description (e.g. "Saving…"). */
    statusLine?: string;
}

/**
 * Activation toggle card used at the top of each settings panel
 * (Tree, Kanban, Timeline, Graph). Card chrome + toggle pattern is
 * identical across all four — extracted here so a change to the
 * affordance ripples everywhere instead of drifting per-panel.
 *
 * Native `<input type="checkbox">` with an `accentColor` token gives
 * us the toggle look without DaisyUI's `toggle toggle-primary` class
 * pair. The card itself stays a `<label>` so the whole surface is
 * a click target.
 */
export default function SettingsActivationToggle({
    title,
    description,
    enabled,
    onChange,
    disabled = false,
    statusLine,
}: SettingsActivationToggleProps) {
    return (
        <label
            className="alex-row flex cursor-pointer items-center justify-between gap-4 px-4 py-3"
            style={toggleCardStyle}
        >
            <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-0.5 text-xs" style={helperStyle}>
                    {description}
                </p>
                {statusLine && (
                    <p
                        className="mt-1 text-[10px]"
                        style={{
                            color: "color-mix(in srgb, var(--theme-base-content) 40%, transparent)",
                        }}
                    >
                        {statusLine}
                    </p>
                )}
            </div>
            <input
                type="checkbox"
                role="switch"
                checked={enabled}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                style={{
                    accentColor: TOGGLE_ACCENT_COLOR,
                    width: "2rem",
                    height: "1.25rem",
                }}
            />
        </label>
    );
}
