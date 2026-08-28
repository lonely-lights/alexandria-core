import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';

import type { WorkspaceViewMode } from './viewMode';

/**
 * Manuscript view switcher — spec 2026-08-08
 * continuous-manuscript-scene-flow; widened 2026-08-28 outline-mode
 * Task 5 to a third segment.
 *
 * Three words in a segmented pill, floated over the top-right of the
 * editor pane: 'Continuous' streams the whole work through one
 * scrollport, 'Focus' keeps the one-section-at-a-time editor,
 * 'Outline' swaps in the full-pane structural outline. It is
 * deliberately a pill rather than another ribbon icon — the choice
 * changes what the whole desk *is*, so it belongs on the desk, not
 * buried in a tab.
 *
 * Colours follow the right rail's PanelModeSwitcher idiom (a
 * brand-secondary wash on the live segment) so the two switchers in the
 * workspace read as the same control family.
 */

const trackStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-page) 82%, transparent)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    backdropFilter: 'blur(6px)',
};

const activeSegmentStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-secondary-500) 18%, transparent)',
    color: 'var(--theme-brand-secondary-500)',
    borderRadius: 'var(--theme-radius-badge)',
};

const idleSegmentStyle: CSSProperties = {
    background: 'transparent',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
};

const SEGMENTS: Array<{ id: WorkspaceViewMode; labelKey: string }> = [
    { id: 'continuous', labelKey: 'writing.flow.continuous' },
    { id: 'focus', labelKey: 'writing.flow.focus' },
    { id: 'outline', labelKey: 'writing.flow.outline' },
];

export interface FlowToggleProps {
    mode: WorkspaceViewMode;
    onChange: (mode: WorkspaceViewMode) => void;
}

export default function FlowToggle({ mode, onChange }: FlowToggleProps) {
    const t = useT();

    return (
        <div
            role="group"
            aria-label={t('writing.flow.toggle_aria')}
            data-flow-toggle=""
            className="inline-flex items-center gap-0.5 p-0.5"
            style={trackStyle}
        >
            {SEGMENTS.map(({ id, labelKey }) => {
                const isActive = id === mode;

                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onChange(id)}
                        aria-pressed={isActive}
                        data-flow-toggle-continuous={id === 'continuous' ? '' : undefined}
                        data-flow-toggle-focus={id === 'focus' ? '' : undefined}
                        data-flow-toggle-outline={id === 'outline' ? '' : undefined}
                        className="cursor-pointer px-2.5 py-1 text-xs font-semibold transition-colors"
                        style={isActive ? activeSegmentStyle : idleSegmentStyle}
                    >
                        {t(labelKey)}
                    </button>
                );
            })}
        </div>
    );
}
