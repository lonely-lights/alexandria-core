import type { ResolvedView } from './useBlueprintViews';

interface ViewToggleProps {
    views: ResolvedView[];
    active: string | null;
    onSelect: (type: string) => void;
}

/**
 * Renders one button per registered + enabled + applicable view.
 * Inaccessible views (tier / purchase not met) render with a lock
 * icon and an onClick that surfaces an upgrade nudge instead of
 * activating the view. Disabled-for-blueprint views are hidden entirely
 * (they're configured via settings, not the toggle).
 */
export default function ViewToggle({ views, active, onSelect }: ViewToggleProps) {
    const visible = views.filter((v) =>
        v.applicableForBlueprint && v.enabledForBlueprint
    );

    if (visible.length === 0) {
        // No registered views enabled — render nothing. The caller
        // is expected to render its own baseline button (e.g. Table)
        // separately, so ViewToggle renders whenever it has at least
        // one view to offer.
        return null;
    }

    return (
        <div className="flex overflow-hidden rounded-xl border border-base-content/10">
            {visible.map((v) => {
                const isActive = active === v.definition.type;
                const locked = !v.accessibleForUser;
                const iconClass = v.definition.icon.includes(' ')
                    ? v.definition.icon
                    : `fa-solid ${v.definition.icon}`;

                return (
                    <button
                        key={v.definition.type}
                        type="button"
                        onClick={() => !locked && onSelect(v.definition.type)}
                        className={`btn btn-sm gap-1.5 rounded-none border-0 ${
                            isActive ? 'btn-primary' : 'btn-ghost'
                        } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={locked ? `Requires upgrade` : v.definition.label}
                    >
                        <i className={`${iconClass} w-3.5 text-center text-xs`} />
                        {v.definition.label}
                        {locked && <i className="fa-solid fa-lock ml-1 text-[9px] opacity-60" />}
                    </button>
                );
            })}
        </div>
    );
}
