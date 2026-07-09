import type { CSSProperties } from 'react';

import Tooltip from '@alexandria/components/ui/Tooltip';
import useT from '@alexandria/hooks/useT';

import type { PanelMode } from '../panelMode';

/**
 * Right-rail mode switcher — Stage 11.5 Task 4.
 *
 * Three icon buttons (Linked items · Notes · Comments) rendered as a
 * thin strip above the panel content. Styled identically to
 * ReferencePanel's internal tab strip for visual continuity.
 */

interface PanelModeSwitcherProps {
    mode: PanelMode;
    onChange: (mode: PanelMode) => void;
}

const stripStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const activeBtnStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-secondary-500) 18%, transparent)',
    color: 'var(--theme-brand-secondary-500)',
    borderRadius: 'var(--theme-radius-button)',
};

const idleBtnStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
};

const MODES: Array<{ id: PanelMode; icon: string; labelKey: string }> = [
    { id: 'linked', icon: 'fa-solid fa-link', labelKey: 'writing.panel.mode_linked' },
    { id: 'notes', icon: 'fa-solid fa-note-sticky', labelKey: 'writing.panel.mode_notes' },
    { id: 'comments', icon: 'fa-solid fa-comment-dots', labelKey: 'writing.panel.mode_comments' },
];

export default function PanelModeSwitcher({ mode, onChange }: PanelModeSwitcherProps) {
    const t = useT();

    return (
        <div
            className="flex shrink-0 items-center gap-1 px-2 py-1.5"
            style={stripStyle}
            data-panel-mode-switcher
        >
            {MODES.map(({ id, icon, labelKey }) => {
                const isActive = id === mode;

                return (
                    <Tooltip key={id} content={t(labelKey)}>
                        <button
                            type="button"
                            onClick={() => onChange(id)}
                            aria-label={t(labelKey)}
                            aria-pressed={isActive}
                            data-panel-mode-btn={id}
                            className={`alex-toolbar-btn inline-flex h-8 w-8 items-center justify-center text-sm transition-colors ${isActive ? 'alex-toolbar-btn--active' : ''}`}
                            style={isActive ? activeBtnStyle : idleBtnStyle}
                        >
                            <i className={icon} aria-hidden="true" />
                        </button>
                    </Tooltip>
                );
            })}
        </div>
    );
}
