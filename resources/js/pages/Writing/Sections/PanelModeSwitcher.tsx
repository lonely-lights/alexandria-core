import { useSyncExternalStore, type CSSProperties } from 'react';

import Tooltip from '@alexandria/components/ui/Tooltip';
import useT from '@alexandria/hooks/useT';
import useEntitlements from '@alexandria/hooks/useEntitlements';
import { resolveGate } from '@alexandria/ribbon/ribbonGates';
import type { RibbonGates } from '@alexandria/ribbon/types';

import type { PanelMode } from '../panelMode';
import { getSidebarModes, subscribeSidebarModes } from '../sidebarModeRegistry';

/**
 * Right-rail mode switcher — Stage 11.5 Task 4; extended Stage 12a Task 2;
 * extended outline-mode Task 7.
 *
 * Four built-in icon buttons (Linked items · Notes · Comments · Outline)
 * followed by any modes registered via sidebarModeRegistry. Registered
 * modes are entitlement-gated via resolveGate: 'hidden' → omit, 'locked'
 * → disabled button + fa-lock badge + locked-hint title, 'visible' →
 * normal button.
 */

interface PanelModeSwitcherProps {
    mode: PanelMode;
    onChange: (mode: PanelMode) => void;
    /** Permission map threaded from Workspace (e.g. work.update) — used
     *  alongside entitlements to gate registered modes. Defaults to {}. */
    can?: Record<string, boolean>;
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
    { id: 'outline', icon: 'fa-solid fa-list-tree', labelKey: 'writing.outline.sidebar_label' },
];

export default function PanelModeSwitcher({ mode, onChange, can = {} }: PanelModeSwitcherProps) {
    const t = useT();
    const entitlements = useEntitlements();
    const registeredModes = useSyncExternalStore(subscribeSidebarModes, getSidebarModes);
    const gates: RibbonGates = { can, entitlements };

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

            {registeredModes.map((m) => {
                const verdict = resolveGate(m.requires, gates);

                if (verdict === 'hidden') {
                    return null;
                }

                const isActive = m.id === mode;
                const label = t(m.labelKey);

                if (verdict === 'locked') {
                    return (
                        <span
                            key={m.id}
                            className="relative inline-flex"
                            title={t('writing.ribbon.locked_hint')}
                        >
                            <button
                                type="button"
                                disabled
                                aria-label={label}
                                data-panel-mode-btn={m.id}
                                className="alex-toolbar-btn inline-flex h-8 w-8 items-center justify-center text-sm transition-colors"
                                style={idleBtnStyle}
                            >
                                <i className={m.icon} aria-hidden="true" />
                            </button>
                            <i
                                className="fa-solid fa-lock ribbon-ctl-lock pointer-events-none absolute bottom-0 right-0 text-[8px]"
                                aria-hidden="true"
                            />
                        </span>
                    );
                }

                return (
                    <Tooltip key={m.id} content={label}>
                        <button
                            type="button"
                            onClick={() => onChange(m.id)}
                            aria-label={label}
                            aria-pressed={isActive}
                            data-panel-mode-btn={m.id}
                            className={`alex-toolbar-btn inline-flex h-8 w-8 items-center justify-center text-sm transition-colors ${isActive ? 'alex-toolbar-btn--active' : ''}`}
                            style={isActive ? activeBtnStyle : idleBtnStyle}
                        >
                            <i className={m.icon} aria-hidden="true" />
                        </button>
                    </Tooltip>
                );
            })}
        </div>
    );
}
