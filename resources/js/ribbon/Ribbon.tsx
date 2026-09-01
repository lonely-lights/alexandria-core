import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePage } from '@inertiajs/react';

import { useHoverOffDismiss } from '@alexandria/hooks/useHoverOffDismiss';
import { useMenuDismissDelay } from '@alexandria/hooks/useMenuDismissDelay';
import useT from '@alexandria/hooks/useT';
import Tooltip from '@alexandria/components/ui/Tooltip';

import { getRibbonTabs, subscribeRibbon } from './ribbonRegistry';
import { resolveGate } from './ribbonGates';
import { formatShortcutLabel } from './shortcuts';
import useRibbonShortcuts from './useRibbonShortcuts';
import QuickActionBar from './QuickActionBar';
import {
    canPinControl,
    findControlById,
    normalizeQuickActions,
    nextQuickActionId,
    type RibbonQuickAction,
} from './quickActions';
import RibbonButton from './controls/RibbonButton';
import RibbonToggle from './controls/RibbonToggle';
import RibbonSelect from './controls/RibbonSelect';
import RibbonCombo from './controls/RibbonCombo';
import RibbonMenu from './controls/RibbonMenu';
import type { RibbonControl, RibbonGates, RibbonMode, RibbonTab } from './types';

const MODE_STORAGE_KEY = 'alexandria.ribbon.mode';
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const paperColorPreview: Record<string, string> = {
    theme: 'var(--theme-base-page)',
    white: '#ffffff',
    ivory: '#fffaf0',
    cream: '#fdf6e3',
    gray: '#f8fafc',
};

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
    /** Permission/entitlement gates for this ribbon instance.
     *  Controls with `requires` are filtered (hidden) or locked (disabled + lock icon)
     *  based on the resolved verdict. Controls without `requires` are always visible. */
    gates?: RibbonGates;
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
    /** Optional preloaded QAT items; defaults to auth.preferences.ribbon_quick_actions. */
    quickActions?: RibbonQuickAction[];
    /** Persistence endpoint for QAT edits. */
    quickActionSaveUrl?: string;
    /** Optional tab id whose controls always render in the band. */
    bandTabId?: string;
}

/**
 * The app-level ribbon (spec §1): renders a registered tab set against
 * a host-provided context. Modes: expanded (icon band — tooltips name
 * the controls, no inline text labels) and collapsed (tabs only;
 * clicking a tab overlays the band until pointer leaves). Mode persists
 * globally in localStorage.
 */
export default function Ribbon<Ctx>({
    setKey,
    context,
    gates,
    leading,
    trailing,
    headerRow,
    quickActions,
    quickActionSaveUrl = '/account/ribbon/quick-actions',
    bandTabId,
}: RibbonProps<Ctx>) {
    const t = useT();
    const page = usePage();
    const tabs = useSyncExternalStore(subscribeRibbon, () => getRibbonTabs(setKey)) as RibbonTab<Ctx>[];
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [mode, setMode] = useState<RibbonMode>(readMode);
    const [overlayOpen, setOverlayOpen] = useState(false);
    const pageQuickActions = (page.props as {
        auth?: { preferences?: { ribbon_quick_actions?: unknown } };
    }).auth?.preferences?.ribbon_quick_actions;
    const initialQuickActions = useMemo(
        () => normalizeQuickActions(quickActions ?? pageQuickActions),
        [quickActions, pageQuickActions],
    );
    const [quickActionItems, setQuickActionItems] = useState<RibbonQuickAction[]>(initialQuickActions);
    const [menuPlaceholder, setMenuPlaceholder] = useState<{
        tabId: string;
        left: number;
        top: number;
        width: number;
    } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; controlId: string } | null>(null);

    // Hover-off auto-dismiss (menu_dismiss_delay_ms preference) for the
    // fixed-band File/Edit/View menus. Armed only while a tab menu is
    // open; the tab buttons and the portaled menu are separate DOM
    // subtrees, so both sides are wired.
    const menuDismissDelayMs = useMenuDismissDelay();
    const { handlePointerEnter: handleMenuHoverEnter, handlePointerLeave: handleMenuHoverLeave } = useHoverOffDismiss({
        delayMs: menuPlaceholder ? menuDismissDelayMs : null,
        onDismiss: () => setMenuPlaceholder(null),
    });

    // Same treatment for the right-click quick-action context menu. It
    // has no hover-able trigger (the control under the cursor opened
    // it), so the portaled panel alone defines the region.
    const { handlePointerEnter: handleContextMenuHoverEnter, handlePointerLeave: handleContextMenuHoverLeave } = useHoverOffDismiss({
        delayMs: contextMenu ? menuDismissDelayMs : null,
        onDismiss: () => setContextMenu(null),
    });

    useRibbonShortcuts(tabs, context, gates);

    useEffect(() => {
        setQuickActionItems(initialQuickActions);
    }, [initialQuickActions]);

    useEffect(() => {
        if (!contextMenu) {
            return;
        }

        const close = () => setContextMenu(null);
        document.addEventListener('mousedown', close);
        window.addEventListener('scroll', close, true);

        return () => {
            document.removeEventListener('mousedown', close);
            window.removeEventListener('scroll', close, true);
        };
    }, [contextMenu]);

    useEffect(() => {
        if (!menuPlaceholder) {
            return;
        }

        const close = (event?: Event) => {
            const target = event?.target;

            if (target instanceof Element && target.closest('[data-ribbon-tab]')) {
                return;
            }

            setMenuPlaceholder(null);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                close();
            }
        };

        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', closeOnEscape);
        window.addEventListener('resize', close);

        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', closeOnEscape);
            window.removeEventListener('resize', close);
        };
    }, [menuPlaceholder]);

    if (tabs.length === 0) {
        return null;
    }

    // Filter tabs that have at least one non-hidden visible control after gating.
    // Locked controls (disabled + upsell) still count as visible for tab presence.
    const visibleTabs = tabs.filter((tab) =>
        tab.groups.some((group) =>
            group.controls.some((control) => {
                if (!(control.visible?.(context) ?? true)) {
                    return false;
                }
                return resolveGate(control.requires, gates) !== 'hidden';
            }),
        ),
    );

    if (visibleTabs.length === 0) {
        return null;
    }

    const fixedBand = bandTabId !== undefined;
    const selectedTab = activeTabId === null ? null : (visibleTabs.find((tab) => tab.id === activeTabId) ?? null);
    const activeTab = selectedTab ?? visibleTabs[0];
    const bandTab = (bandTabId ? visibleTabs.find((tab) => tab.id === bandTabId) : null) ?? activeTab;

    function persistQuickActions(next: RibbonQuickAction[]): void {
        const normalized = normalizeQuickActions(next);
        setQuickActionItems(normalized);

        void fetch(quickActionSaveUrl, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
            },
            body: JSON.stringify({ items: normalized }),
        }).catch((error: unknown) => {
            console.warn('[ribbon] quick action save failed', error);
        });
    }

    function handleControlContextMenu(event: MouseEvent<HTMLDivElement>): void {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const trigger = target.closest('[data-ribbon-control]');
        const controlId = trigger?.getAttribute('data-ribbon-control');
        const control = controlId ? findControlById(tabs, controlId) : null;

        if (!controlId || !canPinControl(control)) {
            return;
        }

        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY, controlId });
    }

    function toggleQuickAction(controlId: string): void {
        const existing = quickActionItems.find(
            (item) => item.type === 'control' && item.setKey === setKey && item.controlId === controlId,
        );

        if (existing) {
            persistQuickActions(quickActionItems.filter((item) => item.id !== existing.id));
            setContextMenu(null);

            return;
        }

        persistQuickActions([
            ...quickActionItems,
            {
                id: nextQuickActionId('control'),
                type: 'control',
                setKey,
                controlId,
            },
        ]);
        setContextMenu(null);
    }

    function persistMode(next: RibbonMode): void {
        setMode(next);
        try {
            localStorage.setItem(MODE_STORAGE_KEY, next);
        } catch {
            // storage unavailable
        }
    }

    function menuPosition(id: string, element: HTMLElement) {
        const rect = element.getBoundingClientRect();

        return {
            tabId: id,
            left: rect.left,
            top: rect.bottom + 6,
            width: rect.width,
        };
    }

    function onTabClick(id: string, event: MouseEvent<HTMLButtonElement>): void {
        if (fixedBand) {
            const nextPosition = menuPosition(id, event.currentTarget);

            setMenuPlaceholder((current) => current?.tabId === id ? null : nextPosition);
            return;
        }

        setActiveTabId(id);
        if (mode === 'collapsed') {
            setOverlayOpen(true);
        }
    }

    function onTabPreview(id: string, element: HTMLElement): void {
        if (!fixedBand || !menuPlaceholder || menuPlaceholder.tabId === id) {
            return;
        }

        const nextPosition = menuPosition(id, element);

        setMenuPlaceholder(nextPosition);
    }

    const bandVisible = mode !== 'collapsed' || overlayOpen;

    /* The strip is its own scroll container so a cramped viewport
       (merged-header mode on mobile) scrolls the tabs horizontally
       instead of wrapping or crushing the leading/trailing clusters.
       role="tablist" lives here — host content stays outside it.
       Empty tabs (all controls gated hidden) are omitted. */
    const tabStrip = (
        <div className={`ribbon-tabstrip ${fixedBand ? 'ribbon-tabstrip--menu' : ''}`} role="tablist">
            {visibleTabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    data-ribbon-tab={tab.id}
                    aria-haspopup={fixedBand ? 'menu' : undefined}
                    aria-expanded={fixedBand ? menuPlaceholder?.tabId === tab.id : undefined}
                    aria-selected={!fixedBand && tab.id === activeTab.id}
                    className={`ribbon-tab ${!fixedBand && tab.id === activeTab.id ? 'ribbon-tab--active' : ''} ${fixedBand && menuPlaceholder?.tabId === tab.id ? 'ribbon-tab--menu-open' : ''}`}
                    onClick={(event) => onTabClick(tab.id, event)}
                    onFocus={(event) => onTabPreview(tab.id, event.currentTarget)}
                    onMouseEnter={(event) => {
                        handleMenuHoverEnter();
                        onTabPreview(tab.id, event.currentTarget);
                    }}
                    onMouseLeave={handleMenuHoverLeave}
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
                        <div className="ribbon-tabs">
                            {tabStrip}
                            <QuickActionBar
                                setKey={setKey}
                                tabs={tabs}
                                context={context}
                                gates={gates}
                                actions={quickActionItems}
                                onChange={persistQuickActions}
                            />
                        </div>
                    </div>
                    {trailing && <div className="ribbon-header-trailing">{trailing}</div>}
                </div>
            ) : (
                <div className="ribbon-tabs">
                    {leading}
                    {tabStrip}
                    <QuickActionBar
                        setKey={setKey}
                        tabs={tabs}
                        context={context}
                        gates={gates}
                        actions={quickActionItems}
                        onChange={persistQuickActions}
                    />
                    {trailing && <div className="ribbon-tabs-trailing">{trailing}</div>}
                </div>
            )}

            {bandVisible && (
                <div
                    className={`ribbon-band ${mode === 'collapsed' ? 'ribbon-band--overlay' : ''}`}
                    onContextMenu={handleControlContextMenu}
                    onMouseLeave={() => mode === 'collapsed' && setOverlayOpen(false)}
                >
                    {bandTab.groups.map((group) => {
                        // Apply visibility predicate then gate resolution.
                        // 'hidden' → exclude; 'locked' → disabled + lock glyph.
                        const gatedControls = group.controls
                            .filter((control) => control.visible?.(context) ?? true)
                            .map((control) => ({
                                control,
                                verdict: resolveGate(control.requires, gates),
                            }))
                            .filter(({ verdict }) => verdict !== 'hidden');

                        if (gatedControls.length === 0) {
                            return null;
                        }

                        return (
                            <div key={group.id} className="ribbon-group">
                                <div className="ribbon-group-controls">
                                    {gatedControls.map(({ control, verdict }) => {
                                        if (verdict === 'locked') {
                                            // Force disabled; overlay a lock badge.
                                            // The title on the wrapper acts as a tooltip for
                                            // the upsell hint (writing.ribbon.locked_hint).
                                            const lockedControl: RibbonControl<Ctx> = {
                                                ...control,
                                                disabled: (_ctx: Ctx) => true,
                                            };
                                            return (
                                                <div
                                                    key={control.id}
                                                    className="relative inline-flex"
                                                    title={t('writing.ribbon.locked_hint')}
                                                >
                                                    {renderControl(lockedControl, context)}
                                                    <i
                                                        className="fa-solid fa-lock ribbon-ctl-lock pointer-events-none absolute bottom-0 right-0 text-[8px]"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                            );
                                        }
                                        return renderControl(control, context);
                                    })}
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

            {contextMenu && createPortal(
                <QuickActionContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    pinned={quickActionItems.some(
                        (item) => item.type === 'control' && item.setKey === setKey && item.controlId === contextMenu.controlId,
                    )}
                    onToggle={() => toggleQuickAction(contextMenu.controlId)}
                    onMouseEnter={handleContextMenuHoverEnter}
                    onMouseLeave={handleContextMenuHoverLeave}
                />,
                document.body,
            )}

            {menuPlaceholder && createPortal(
                <RibbonTabMenu
                    tab={tabs.find((tab) => tab.id === menuPlaceholder.tabId) ?? null}
                    ctx={context}
                    gates={gates}
                    left={menuPlaceholder.left}
                    top={menuPlaceholder.top}
                    width={menuPlaceholder.width}
                    onClose={() => setMenuPlaceholder(null)}
                    onMouseEnter={handleMenuHoverEnter}
                    onMouseLeave={handleMenuHoverLeave}
                />,
                document.body,
            )}
        </div>
    );
}

function RibbonTabMenu<Ctx>({
    tab,
    ctx,
    gates,
    left,
    top,
    width,
    onClose,
    onMouseEnter,
    onMouseLeave,
}: {
    tab: RibbonTab<Ctx> | null;
    ctx: Ctx;
    /** Same gate state threaded from the host Ribbon — controls gated
     *  `hidden` are filtered out; `locked` render disabled + lock icon. */
    gates?: RibbonGates;
    left: number;
    top: number;
    width: number;
    onClose: () => void;
    /** Hover-off auto-dismiss region handlers from the host Ribbon. */
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}) {
    const t = useT();
    const [openSelectId, setOpenSelectId] = useState<string | null>(null);
    const submenuCloseTimer = useRef<number | null>(null);
    // Apply visibility predicate then gate resolution — mirrors the band render.
    // 'hidden' controls are excluded; 'locked' controls stay but render disabled.
    const groups = tab?.groups.map((group) => {
        const gatedControls = group.controls
            .filter((control) => control.visible?.(ctx) ?? true)
            .map((control) => ({ control, verdict: resolveGate(control.requires, gates) }))
            .filter(({ verdict }) => verdict !== 'hidden');
        return { ...group, gatedControls };
    }).filter((group) => group.gatedControls.length > 0) ?? [];

    useEffect(() => {
        setOpenSelectId(null);
    }, [tab?.id]);

    useEffect(() => () => {
        if (submenuCloseTimer.current !== null) {
            window.clearTimeout(submenuCloseTimer.current);
        }
    }, []);

    if (groups.length === 0) {
        return null;
    }

    function openSubmenu(controlId: string): void {
        if (submenuCloseTimer.current !== null) {
            window.clearTimeout(submenuCloseTimer.current);
            submenuCloseTimer.current = null;
        }

        setOpenSelectId(controlId);
    }

    function scheduleSubmenuClose(controlId: string): void {
        if (submenuCloseTimer.current !== null) {
            window.clearTimeout(submenuCloseTimer.current);
        }

        submenuCloseTimer.current = window.setTimeout(() => {
            setOpenSelectId((value) => value === controlId ? null : value);
            submenuCloseTimer.current = null;
        }, 500);
    }

    function run(control: RibbonControl<Ctx>, value?: string): void {
        if (control.disabled?.(ctx) ?? false) {
            return;
        }

        control.onAction(ctx, value);
        onClose();
    }

    return (
        <div
            role="menu"
            data-ribbon-menu
            className="ribbon-tab-menu"
            style={{
                left,
                top,
                minWidth: Math.max(width + 96, 220),
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {groups.map((group, groupIndex) => (
                <div key={group.id} className="ribbon-tab-menu-group">
                    {groupIndex > 0 && <div className="ribbon-tab-menu-divider" />}
                    <div className="ribbon-tab-menu-heading">{t(group.labelKey)}</div>
                    {group.gatedControls.map(({ control, verdict }) => {
                        const isLocked = verdict === 'locked';

                        /* A combo degrades to its preset submenu here: a
                           collapsed menu row has nowhere to put an
                           editable field, and offering the ladder beats
                           rendering a row whose click means nothing. */
                        if (control.type === 'select' || control.type === 'combo') {
                            const current = control.value?.(ctx);
                            const disabled = isLocked || (control.disabled?.(ctx) ?? false);
                            const open = openSelectId === control.id;

                            return (
                                <div
                                    key={control.id}
                                    className="ribbon-tab-menu-select"
                                    onMouseEnter={() => openSubmenu(control.id)}
                                    onMouseLeave={() => scheduleSubmenuClose(control.id)}
                                >
                                    <button
                                        type="button"
                                        role="menuitem"
                                        aria-haspopup="menu"
                                        aria-expanded={open}
                                        className={`ribbon-tab-menu-row ribbon-tab-menu-row--submenu ${open ? 'is-active' : ''}`}
                                        disabled={disabled}
                                        title={isLocked ? t('writing.ribbon.locked_hint') : undefined}
                                        onClick={() => setOpenSelectId((value) => value === control.id ? null : control.id)}
                                        onFocus={() => openSubmenu(control.id)}
                                    >
                                        <i className={control.icon} aria-hidden="true" />
                                        <span>{control.labelFn?.(ctx) ?? t(control.labelKey)}</span>
                                        {isLocked ? (
                                            <i className="fa-solid fa-lock ribbon-ctl-lock" aria-hidden="true" />
                                        ) : (
                                            <i className="fa-solid fa-chevron-right ribbon-tab-menu-chevron" aria-hidden="true" />
                                        )}
                                    </button>
                                    {open && (
                                        <div role="menu" className="ribbon-tab-submenu">
                                            {(control.options?.(ctx) ?? []).map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    role="menuitemradio"
                                                    aria-checked={current === option.value}
                                                    className={`ribbon-tab-menu-row ribbon-tab-menu-row--option ${current === option.value ? 'is-active' : ''}`}
                                                    disabled={disabled}
                                                    onClick={() => run(control, option.value)}
                                                >
                                                    <i className="fa-solid fa-check" aria-hidden="true" />
                                                    {control.id === 'paper-color' && (
                                                        <span
                                                            className="ribbon-tab-menu-swatch"
                                                            style={{ background: paperColorPreview[option.value] ?? 'var(--theme-base-page)' }}
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                    <span>{t(option.labelKey)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        const active = control.active?.(ctx) ?? false;
                        const disabled = isLocked || (control.disabled?.(ctx) ?? false);
                        const shortcut = control.menuShortcut ?? control.shortcut;

                        return (
                            <button
                                key={control.id}
                                type="button"
                                role={control.type === 'toggle' ? 'menuitemcheckbox' : 'menuitem'}
                                aria-checked={control.type === 'toggle' ? active : undefined}
                                className={`ribbon-tab-menu-row ${active ? 'is-active' : ''}`}
                                disabled={disabled}
                                title={isLocked ? t('writing.ribbon.locked_hint') : undefined}
                                onClick={() => run(control)}
                            >
                                <i className={control.icon} aria-hidden="true" />
                                <span>{control.labelFn?.(ctx) ?? t(control.labelKey)}</span>
                                {isLocked ? (
                                    <i className="fa-solid fa-lock ribbon-ctl-lock" aria-hidden="true" />
                                ) : (
                                    shortcut !== undefined && <kbd>{formatShortcutLabel(shortcut, isMac)}</kbd>
                                )}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function QuickActionContextMenu({
    x,
    y,
    pinned,
    onToggle,
    onMouseEnter,
    onMouseLeave,
}: {
    x: number;
    y: number;
    pinned: boolean;
    onToggle: () => void;
    /** Hover-off auto-dismiss region handlers from the host Ribbon. */
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}) {
    const t = useT();

    return (
        <div
            className="ribbon-context-menu"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{
                left: x,
                top: y,
                background: 'var(--theme-base-surface)',
                border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
                borderRadius: 'var(--theme-radius-card)',
                boxShadow: '0 12px 32px color-mix(in srgb, var(--theme-base-content) 18%, transparent)',
                color: 'var(--theme-base-content)',
            }}
        >
            <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={onToggle}
            >
                <i className={`fa-solid ${pinned ? 'fa-xmark' : 'fa-thumbtack'} w-4 text-center`} aria-hidden="true" />
                {t(pinned ? 'ribbon.qat_remove' : 'ribbon.qat_add')}
            </button>
        </div>
    );
}

function renderControl<Ctx>(control: RibbonControl<Ctx>, ctx: Ctx) {
    switch (control.type) {
        case 'toggle':
            return <RibbonToggle key={control.id} control={control} ctx={ctx} />;
        case 'select':
            return <RibbonSelect key={control.id} control={control} ctx={ctx} />;
        case 'combo':
            return <RibbonCombo key={control.id} control={control} ctx={ctx} />;
        case 'menu':
            return <RibbonMenu key={control.id} control={control} ctx={ctx} />;
        default:
            return <RibbonButton key={control.id} control={control} ctx={ctx} />;
    }
}
