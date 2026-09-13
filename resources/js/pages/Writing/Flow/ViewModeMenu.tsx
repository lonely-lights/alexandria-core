import { useState } from 'react';

import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';
import Tooltip from '@alexandria/components/ui/Tooltip';
import useT from '@alexandria/hooks/useT';

import type { WorkspaceViewMode } from './viewMode';

const VIEWS: Array<{ id: WorkspaceViewMode; icon: string }> = [
    { id: 'continuous', icon: 'fa-scroll' },
    { id: 'focus', icon: 'fa-file-lines' },
    { id: 'outline', icon: 'fa-list' },
    { id: 'kanban', icon: 'fa-table-columns' },
];

export default function ViewModeMenu({
    mode,
    onChange,
}: {
    mode: WorkspaceViewMode;
    onChange: (mode: WorkspaceViewMode) => void;
}) {
    const t = useT();
    const [open, setOpen] = useState(false);

    return (
        <>
            <Tooltip content={t('writing.flow.views')} placement="right">
                <button
                    type="button"
                    className="writing-workspace-structure-toggle alex-toolbar-btn"
                    data-writing-view-menu
                    aria-label={t('writing.flow.views')}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    onClick={() => setOpen(true)}
                >
                    <i
                        className="fa-solid fa-table-columns"
                        aria-hidden="true"
                    />
                </button>
            </Tooltip>
            {open && (
                <Modal open onClose={() => setOpen(false)} maxWidth="max-w-md">
                    <ModalHeader
                        title={t('writing.flow.choose_view')}
                        onClose={() => setOpen(false)}
                    />
                    <div className="space-y-2 p-4" data-writing-view-modal>
                        {VIEWS.map(({ id, icon }) => {
                            const selected = mode === id;

                            return (
                                <button
                                    key={id}
                                    type="button"
                                    aria-pressed={selected}
                                    autoFocus={selected}
                                    data-flow-toggle-continuous={
                                        id === 'continuous' ? '' : undefined
                                    }
                                    data-flow-toggle-focus={
                                        id === 'focus' ? '' : undefined
                                    }
                                    data-flow-toggle-outline={
                                        id === 'outline' ? '' : undefined
                                    }
                                    data-flow-toggle-kanban={
                                        id === 'kanban' ? '' : undefined
                                    }
                                    className="flex w-full items-center gap-3 rounded p-3 text-left"
                                    style={{
                                        border: '1px solid color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
                                        background: selected
                                            ? 'var(--theme-brand-primary-highlight-bg)'
                                            : 'transparent',
                                        color: selected
                                            ? 'var(--theme-brand-primary-highlight-fg)'
                                            : 'var(--theme-base-content)',
                                    }}
                                    onClick={() => {
                                        setOpen(false);
                                        onChange(id);
                                    }}
                                >
                                    <i
                                        className={`fa-solid ${icon} w-5 text-center`}
                                        aria-hidden="true"
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold">
                                            {t(`writing.flow.${id}`)}
                                        </span>
                                        <span className="block text-xs opacity-75">
                                            {t(
                                                `writing.flow.${id}_description`,
                                            )}
                                        </span>
                                    </span>
                                    {selected && (
                                        <i
                                            className="fa-solid fa-check"
                                            aria-hidden="true"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </Modal>
            )}
        </>
    );
}
