import { useEffect, useState } from 'react';

import Modal from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';
import { NavGroup, NavItem } from '@alexandria/pages/Blueprints/Sections/modals/settings/Nav';
import PanelHeader from '@alexandria/pages/Blueprints/Sections/modals/settings/PanelHeader';
import {
    closeBtnStyle,
    navSidebarStyle,
    primaryTextStyle,
    rightPaneStyle,
    titleBarStyle,
} from '@alexandria/pages/Blueprints/Sections/modals/settings/settingsPanelStyles';
import type { EntryShowEntry } from '@alexandria/pages/Entries/Show';

import EntryThemePanel from './settings/EntryThemePanel';

/**
 * Entry Settings Modal — Stage 8b M3.
 *
 * Mirrors the BlueprintSettingsModal shell (title bar + left nav +
 * right pane + PanelHeader). For now the only panel is Theme; future
 * entry-scoped settings (visibility/sharing, AI sorting overrides,
 * archival, custom slug) plug in via the same dispatcher pattern.
 *
 * The shell primitives (NavGroup/NavItem/PanelHeader and the shared
 * styles) are imported from the Blueprints modal folder rather than
 * being pre-emptively promoted to a shared location — DRY through
 * reuse first, extract later if a third consumer needs them.
 */

type MenuPanel = 'theme';

interface EntrySettingsModalProps {
    open: boolean;
    onClose: () => void;
    project: { slug: string };
    blueprint: { slug: string };
    entry: EntryShowEntry;
    initialMenu?: MenuPanel;
}

export default function EntrySettingsModal({
    open,
    onClose,
    project,
    blueprint,
    entry,
    initialMenu,
}: EntrySettingsModalProps) {
    const t = useT();

    const [activeMenu, setActiveMenu] = useState<MenuPanel>(
        initialMenu ?? 'theme',
    );

    useEffect(() => {
        if (open && initialMenu) setActiveMenu(initialMenu);
    }, [open, initialMenu]);

    const navProps = (menu: MenuPanel) => ({
        active: activeMenu === menu,
        onClick: () => setActiveMenu(menu),
    });

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-5xl">
            <div className="flex h-[85vh] flex-col">
                {/* Title bar */}
                <div
                    className="flex items-center justify-between px-4 py-2.5"
                    style={titleBarStyle}
                >
                    <span className="text-sm font-semibold">
                        {t('entries.entry_settings.title')}{' '}
                        <span style={primaryTextStyle}>{entry.name}</span>
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="alex-btn alex-btn--ghost inline-flex items-center justify-center"
                        style={closeBtnStyle}
                    >
                        <i className="fa-solid fa-xmark text-xs" />
                    </button>
                </div>

                {/* Body: left nav + right pane */}
                <div className="flex flex-1 overflow-hidden">
                    <nav
                        className="w-56 shrink-0 overflow-y-auto py-3"
                        style={navSidebarStyle}
                    >
                        <NavGroup
                            title={t('entries.entry_settings.nav.appearance')}
                        >
                            <NavItem
                                {...navProps('theme')}
                                icon="fa-solid fa-palette"
                                label={t('entries.entry_settings.nav.theme')}
                            />
                        </NavGroup>
                    </nav>

                    {/* Right pane */}
                    <div
                        className="flex flex-1 flex-col overflow-hidden"
                        style={rightPaneStyle}
                    >
                        {activeMenu === 'theme' && (
                            <>
                                <PanelHeader
                                    title={t(
                                        'entries.entry_settings.theme.title',
                                    )}
                                    description={t(
                                        'entries.entry_settings.theme.description',
                                    )}
                                />
                                <div className="flex flex-1 flex-col overflow-y-auto">
                                    <EntryThemePanel
                                        project={project}
                                        blueprint={blueprint}
                                        entry={entry}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
