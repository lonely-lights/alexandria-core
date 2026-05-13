import type { CSSProperties } from 'react';
import type { ResolvedView } from './useBlueprintViews';

interface ViewToggleProps {
    views: ResolvedView[];
    active: string | null;
    onSelect: (type: string) => void;
}

const containerStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
};

const buttonBase: CSSProperties = {
    fontSize: '0.875rem',
    padding: '0.25rem 0.75rem',
    border: 0,
    borderRadius: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
};

const buttonActiveStyle: CSSProperties = {
    ...buttonBase,
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
};

const buttonIdleStyle: CSSProperties = {
    ...buttonBase,
    background: 'transparent',
    color: 'var(--theme-base-content)',
};

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
        <div className="flex overflow-hidden" style={containerStyle}>
            {visible.map((v) => {
                const isActive = active === v.definition.type;
                const locked = !v.accessibleForUser;
                const iconClass = v.definition.icon.includes(' ')
                    ? v.definition.icon
                    : `fa-solid ${v.definition.icon}`;

                const style: CSSProperties = {
                    ...(isActive ? buttonActiveStyle : buttonIdleStyle),
                    ...(locked ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                };

                return (
                    <button
                        key={v.definition.type}
                        type="button"
                        onClick={() => !locked && onSelect(v.definition.type)}
                        className="alex-view-toggle-btn"
                        data-active={isActive ? 'true' : 'false'}
                        disabled={locked}
                        style={style}
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
