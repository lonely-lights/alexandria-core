import { useState, useSyncExternalStore, type ReactNode } from 'react';

import useT from '@alexandria/hooks/useT';
import Tooltip from '@alexandria/components/ui/Tooltip';

import { getRibbonTabs, subscribeRibbon } from './ribbonRegistry';
import useRibbonShortcuts from './useRibbonShortcuts';
import RibbonButton from './controls/RibbonButton';
import RibbonToggle from './controls/RibbonToggle';
import RibbonSelect from './controls/RibbonSelect';
import RibbonMenu from './controls/RibbonMenu';
import type { RibbonControl, RibbonMode, RibbonTab } from './types';

const MODE_STORAGE_KEY = 'alexandria.ribbon.mode';

function readMode(): RibbonMode {
    try {
        const stored = localStorage.getItem(MODE_STORAGE_KEY);
        if (stored === 'slim' || stored === 'collapsed' || stored === 'comfortable') {
            return stored;
        }
    } catch {
        // storage unavailable — session default
    }
    return 'comfortable';
}

interface RibbonProps<Ctx> {
    setKey: string;
    context: Ctx;
    /** Optional host content rendered in the tab row, before the tabs (e.g. a breadcrumb). */
    leading?: ReactNode;
    /** Optional host content rendered at the END of the tab row (e.g. status chip + progress cluster). */
    trailing?: ReactNode;
}

/**
 * The app-level ribbon (spec §1): renders a registered tab set against
 * a host-provided context. Modes: comfortable (labeled groups), slim
 * (single icon row), collapsed (tabs only; clicking a tab overlays the
 * band until pointer leaves). Mode persists globally in localStorage.
 */
export default function Ribbon<Ctx>({ setKey, context, leading, trailing }: RibbonProps<Ctx>) {
    const t = useT();
    const tabs = useSyncExternalStore(subscribeRibbon, () => getRibbonTabs(setKey)) as RibbonTab<Ctx>[];
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [mode, setMode] = useState<RibbonMode>(readMode);
    const [overlayOpen, setOverlayOpen] = useState(false);

    useRibbonShortcuts(tabs, context);

    if (tabs.length === 0) {
        return null;
    }

    const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

    function persistMode(next: RibbonMode): void {
        setMode(next);
        try {
            localStorage.setItem(MODE_STORAGE_KEY, next);
        } catch {
            // storage unavailable
        }
    }

    function onTabClick(id: string): void {
        setActiveTabId(id);
        if (mode === 'collapsed') {
            setOverlayOpen(true);
        }
    }

    const bandVisible = mode !== 'collapsed' || overlayOpen;
    const showLabels = mode === 'comfortable';

    return (
        <div className={`ribbon relative ${mode === 'slim' ? 'ribbon--slim' : ''}`}>
            <div className="ribbon-tabs" role="tablist">
                {leading}
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={tab.id === activeTab.id}
                        className={`ribbon-tab ${tab.id === activeTab.id ? 'ribbon-tab--active' : ''}`}
                        onClick={() => onTabClick(tab.id)}
                    >
                        {t(tab.labelKey)}
                    </button>
                ))}
                {trailing && <div className="ribbon-tabs-trailing">{trailing}</div>}
            </div>

            {bandVisible && (
                <div
                    className={`ribbon-band ${mode === 'collapsed' ? 'ribbon-band--overlay' : ''}`}
                    onMouseLeave={() => mode === 'collapsed' && setOverlayOpen(false)}
                >
                    {activeTab.groups.map((group) => {
                        const visibleControls = group.controls.filter(
                            (control) => control.visible?.(context) ?? true,
                        );

                        if (visibleControls.length === 0) {
                            return null;
                        }

                        return (
                            <div key={group.id} className="ribbon-group">
                                <div className="ribbon-group-controls">
                                    {visibleControls.map((control) => renderControl(control, context, showLabels))}
                                </div>
                                {showLabels && <span className="ribbon-group-label">{t(group.labelKey)}</span>}
                            </div>
                        );
                    })}

                    <div className="ribbon-right">
                        <Tooltip content={t(mode === 'slim' ? 'ribbon.mode.comfortable' : 'ribbon.mode.slim')}>
                            <button
                                type="button"
                                className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs"
                                onClick={() => persistMode(mode === 'slim' ? 'comfortable' : 'slim')}
                            >
                                <i className={`fa-solid ${mode === 'slim' ? 'fa-up-right-and-down-left-from-center' : 'fa-down-left-and-up-right-to-center'}`} aria-hidden="true" />
                            </button>
                        </Tooltip>
                        <Tooltip content={t(mode === 'collapsed' ? 'ribbon.mode.expand' : 'ribbon.mode.collapse')}>
                            <button
                                type="button"
                                className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs"
                                onClick={() => persistMode(mode === 'collapsed' ? 'comfortable' : 'collapsed')}
                            >
                                <i className={`fa-solid ${mode === 'collapsed' ? 'fa-thumbtack' : 'fa-chevron-up'}`} aria-hidden="true" />
                            </button>
                        </Tooltip>
                    </div>
                </div>
            )}
        </div>
    );
}

function renderControl<Ctx>(control: RibbonControl<Ctx>, ctx: Ctx, showLabel: boolean) {
    switch (control.type) {
        case 'toggle':
            return <RibbonToggle key={control.id} control={control} ctx={ctx} showLabel={showLabel} />;
        case 'select':
            return <RibbonSelect key={control.id} control={control} ctx={ctx} />;
        case 'menu':
            return <RibbonMenu key={control.id} control={control} ctx={ctx} />;
        default:
            return <RibbonButton key={control.id} control={control} ctx={ctx} showLabel={showLabel} />;
    }
}
