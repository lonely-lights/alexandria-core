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
        // 'collapsed' persists as-is; any legacy value (the retired
        // 'slim'/'comfortable' density modes) resolves to 'expanded'.
        if (localStorage.getItem(MODE_STORAGE_KEY) === 'collapsed') {
            return 'collapsed';
        }
    } catch {
        // storage unavailable — session default
    }
    return 'expanded';
}

interface RibbonProps<Ctx> {
    setKey: string;
    context: Ctx;
    /** Optional host content rendered before the tabs (e.g. a breadcrumb).
     *  With `headerRow` set, this instead becomes a left column spanning
     *  the full height of BOTH header rows (Docs-style logo block). */
    leading?: ReactNode;
    /** Optional host content rendered at the END of the tab row (e.g. status chip + progress cluster).
     *  With `headerRow` set, this cluster instead spans the full height
     *  of BOTH header rows on the right (Docs-style tall avatar). */
    trailing?: ReactNode;
    /** Optional identity row ABOVE the tab strip (merged-header mode):
     *  stacks over the tabs on the left while `trailing` spans both
     *  rows on the right. */
    headerRow?: ReactNode;
}

/**
 * The app-level ribbon (spec §1): renders a registered tab set against
 * a host-provided context. Modes: expanded (icon band — tooltips name
 * the controls, no inline text labels) and collapsed (tabs only;
 * clicking a tab overlays the band until pointer leaves). Mode persists
 * globally in localStorage.
 */
export default function Ribbon<Ctx>({ setKey, context, leading, trailing, headerRow }: RibbonProps<Ctx>) {
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

    /* The strip is its own scroll container so a cramped viewport
       (merged-header mode on mobile) scrolls the tabs horizontally
       instead of wrapping or crushing the leading/trailing clusters.
       role="tablist" lives here — host content stays outside it. */
    const tabStrip = (
        <div className="ribbon-tabstrip" role="tablist">
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
        </div>
    );

    return (
        <div className="ribbon relative">
            {headerRow !== undefined ? (
                /* Docs-style split header: identity row over the tabs on
                   the left; the trailing cluster spans both rows. */
                <div className="ribbon-header">
                    {leading && <div className="ribbon-header-leading">{leading}</div>}
                    <div className="ribbon-header-main">
                        <div className="ribbon-header-identity">{headerRow}</div>
                        <div className="ribbon-tabs">{tabStrip}</div>
                    </div>
                    {trailing && <div className="ribbon-header-trailing">{trailing}</div>}
                </div>
            ) : (
                <div className="ribbon-tabs">
                    {leading}
                    {tabStrip}
                    {trailing && <div className="ribbon-tabs-trailing">{trailing}</div>}
                </div>
            )}

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
                                    {visibleControls.map((control) => renderControl(control, context))}
                                </div>
                            </div>
                        );
                    })}

                    <div className="ribbon-right">
                        <Tooltip content={t(mode === 'collapsed' ? 'ribbon.mode.expand' : 'ribbon.mode.collapse')}>
                            <button
                                type="button"
                                data-ribbon-mode-toggle="collapse"
                                className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center text-xs"
                                onClick={() => persistMode(mode === 'collapsed' ? 'expanded' : 'collapsed')}
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

function renderControl<Ctx>(control: RibbonControl<Ctx>, ctx: Ctx) {
    switch (control.type) {
        case 'toggle':
            return <RibbonToggle key={control.id} control={control} ctx={ctx} />;
        case 'select':
            return <RibbonSelect key={control.id} control={control} ctx={ctx} />;
        case 'menu':
            return <RibbonMenu key={control.id} control={control} ctx={ctx} />;
        default:
            return <RibbonButton key={control.id} control={control} ctx={ctx} />;
    }
}
