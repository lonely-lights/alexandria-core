import Modal from '@alexandria/components/ui/Modal';
import Tooltip from '@alexandria/components/ui/Tooltip';
import useT from '@alexandria/hooks/useT';
import { resolveGate } from '@alexandria/ribbon/ribbonGates';
import type { RibbonGates } from '@alexandria/ribbon/types';

import type { RegisteredSidebarMode, SidebarModeContext } from './sidebarModeRegistry';

export function WritingToolButtons({
    modes,
    gates,
    compact = false,
    onOpen,
}: {
    modes: RegisteredSidebarMode[];
    gates: RibbonGates;
    compact?: boolean;
    onOpen: (id: string) => void;
}) {
    const t = useT();

    return modes
        .filter((mode) => mode.presentation === 'modal')
        .map((mode) => {
            const verdict = resolveGate(mode.requires, gates);

            if (verdict === 'hidden') {
                return null;
            }

            const locked = verdict === 'locked';
            const label = t(mode.labelKey);

            return (
                <Tooltip key={mode.id} content={locked ? `${label}: ${t('writing.ribbon.locked_hint')}` : label}>
                    <span className="relative inline-flex shrink-0">
                        <button
                            type="button"
                            data-writing-tool={mode.id}
                            aria-label={label}
                            aria-haspopup="dialog"
                            disabled={locked}
                            onClick={() => onOpen(mode.id)}
                            className={
                                compact
                                    ? 'writing-touch-button disabled:opacity-40'
                                    : 'alex-toolbar-btn writing-header-tool inline-flex items-center transition-colors disabled:opacity-40'
                            }
                        >
                            <i className={mode.icon} aria-hidden="true" />
                        </button>
                        {locked && (
                            <i
                                className="fa-solid fa-lock pointer-events-none absolute right-1 top-1 text-[9px] opacity-60"
                                aria-hidden="true"
                            />
                        )}
                    </span>
                </Tooltip>
            );
        });
}

export function WritingToolModal({
    mode,
    context,
    onClose,
}: {
    mode: RegisteredSidebarMode;
    context: SidebarModeContext;
    onClose: () => void;
}) {
    const t = useT();

    return (
        <Modal open onClose={onClose} maxWidth="max-w-5xl">
            <div
                data-writing-tool-modal={mode.id}
                role="dialog"
                aria-modal="true"
                aria-label={t(mode.labelKey)}
                className="flex h-[85dvh] min-h-0 flex-col"
            >
                <header
                    className="flex shrink-0 items-center justify-between px-4 py-2.5"
                    style={{
                        background: 'var(--theme-base-300)',
                        borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                    }}
                >
                    <h2 className="text-sm font-semibold">{t(mode.labelKey)}</h2>
                    <button
                        type="button"
                        data-writing-tool-close
                        aria-label={t('writing.tools.close')}
                        className="alex-toolbar-btn inline-flex h-7 w-7 items-center justify-center rounded-full text-xs"
                        onClick={onClose}
                    >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </header>
                <div className="min-h-0 flex-1">
                    <mode.component {...context} onRequestClose={onClose} />
                </div>
            </div>
        </Modal>
    );
}
