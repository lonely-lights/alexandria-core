import { useContext, useState, useSyncExternalStore } from 'react';
import Button from '@alexandria/components/ui/Button';
import useT from '@alexandria/hooks/useT';
import WritingToolDialog from '../mobile/WritingToolDialog';
import { WritingSaveCoordinator } from './SectionSaveQueue';
import { WritingSaveContext } from './WritingSaveContext';

const emptyCoordinator = new WritingSaveCoordinator();

export default function WritingSaveStatus() {
    const coordinator = useContext(WritingSaveContext) ?? emptyCoordinator;
    const sessions = useSyncExternalStore(
        coordinator.subscribe,
        coordinator.getSnapshot,
        coordinator.getSnapshot,
    );
    const [open, setOpen] = useState(false);
    const t = useT();
    const pending = sessions.filter((session) => session.hasUnsaved);
    const error = pending.some(
        (session) => session.getSnapshot().status === 'error',
    );
    const saving = pending.some(
        (session) => session.getSnapshot().status === 'saving',
    );
    const status = error
        ? 'error'
        : saving
          ? 'saving'
          : pending.length
            ? 'dirty'
            : 'saved';
    const label = t(`writing.save.${status}`);
    const icon = error
        ? 'fa-triangle-exclamation'
        : saving
          ? 'fa-arrows-rotate'
          : pending.length
            ? 'fa-cloud-arrow-up'
            : 'fa-check';

    return (
        <>
            <span role="status" className="sr-only">
                {error ? label : ''}
            </span>
            <button
                type="button"
                data-writing-save-status={status}
                aria-label={label}
                title={label}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded md:h-8 md:w-8"
                style={{
                    color: error
                        ? 'var(--theme-status-error-stroke)'
                        : 'var(--theme-base-content)',
                }}
                onClick={() => setOpen(true)}
            >
                <i className={`fa-solid ${icon}`} aria-hidden="true" />
            </button>
            {open && (
                <WritingToolDialog
                    title={t('writing.save.title')}
                    onClose={() => setOpen(false)}
                >
                    <div className="min-h-0 space-y-4 overflow-y-auto p-4">
                        <p role="status" className="text-sm">
                            {label}
                        </p>
                        {pending.length > 0 && (
                            <p className="text-sm">
                                {t('writing.save.keep_open')}
                            </p>
                        )}
                        {pending.map((session) => (
                            <div
                                key={session.id}
                                className="flex items-center gap-3 rounded border p-3"
                                style={{ borderColor: 'var(--theme-base-400)' }}
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">
                                        {session.title}
                                    </p>
                                    <p className="text-sm">
                                        {t(
                                            `writing.save.${session.getSnapshot().status}`,
                                        )}
                                    </p>
                                </div>
                                {session.getSnapshot().status === 'error' && (
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            void session.flush();
                                        }}
                                    >
                                        {t('writing.save.retry')}
                                    </Button>
                                )}
                            </div>
                        ))}
                        {pending.length > 0 && (
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    void coordinator.flush();
                                }}
                            >
                                {t(
                                    error
                                        ? 'writing.save.retry_all'
                                        : 'writing.save.now',
                                )}
                            </Button>
                        )}
                    </div>
                </WritingToolDialog>
            )}
        </>
    );
}
