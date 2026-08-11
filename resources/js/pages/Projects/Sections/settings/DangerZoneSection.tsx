import { useState, type CSSProperties } from 'react';
import { router } from '@inertiajs/react';
import Modal from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';
import { projectUrl } from '@alexandria/lib/urls';
import type { ProjectDetail } from '@alexandria/types/projects';

interface DangerZoneSectionProps {
    project: ProjectDetail;
}

const dangerCardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-status-error-stroke) 30%, transparent)',
    background: 'color-mix(in srgb, var(--theme-status-error-fill) 25%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    padding: '1.5rem',
};

const dangerHeadingStyle: CSSProperties = {
    color: 'var(--theme-status-error-stroke)',
};

const subtitleStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
};

const dangerOutlineBtnStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-status-error-stroke)',
    border: '1px solid color-mix(in srgb, var(--theme-status-error-stroke) 50%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
};

const dangerFillBtnStyle: CSSProperties = {
    background: 'var(--theme-status-error-fill)',
    color: 'var(--theme-status-error-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    gap: '0.375rem',
};

const ghostBtnStyle: CSSProperties = {
    background: 'transparent',
    color: 'var(--theme-base-content)',
    borderRadius: 'var(--theme-radius-button)',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
};

const inputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
    padding: '0.5rem 0.75rem',
    textAlign: 'center',
};

const iconWrapStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-status-error-fill) 25%, transparent)',
    color: 'var(--theme-status-error-stroke)',
    borderRadius: '9999px',
};

const kbdStyle: CSSProperties = {
    fontFamily: 'monospace',
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    padding: '0.125rem 0.375rem',
    fontSize: '0.75rem',
};

export default function DangerZoneSection({ project }: DangerZoneSectionProps) {
    const t = useT();
    const [showModal, setShowModal] = useState(false);
    const [confirmation, setConfirmation] = useState('');
    const [deleting, setDeleting] = useState(false);

    function handleDelete() {
        setDeleting(true);
        router.delete(projectUrl(project.slug), {
            data: { confirmation },
            onSuccess: () => { /* redirected by controller */ },
            onError: () => setDeleting(false),
        });
    }

    return (
        <>
            <div style={dangerCardStyle}>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold" style={dangerHeadingStyle}>
                            {t('projects.danger_zone.title')}
                        </h3>
                        <p className="mt-1 text-sm" style={subtitleStyle}>
                            {(() => {
                                const [before, after = ''] = t('projects.danger_zone.subtitle').split(':project');
                                return (
                                    <>
                                        {before}
                                        <strong>{project.name}</strong>
                                        {after}
                                    </>
                                );
                            })()}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="alex-btn inline-flex items-center"
                        style={dangerOutlineBtnStyle}
                    >
                        <i className="fa-solid fa-trash-can mr-1" aria-hidden="true" />
                        {t('projects.danger_zone.button')}
                    </button>
                </div>
            </div>

            <Modal open={showModal} onClose={() => { setShowModal(false); setConfirmation(''); }}>
                <div className="p-6 text-center">
                    <div
                        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center"
                        style={iconWrapStyle}
                    >
                        <i className="fa-solid fa-triangle-exclamation text-2xl" aria-hidden="true" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold">
                        {t('projects.danger_zone.modal.title').replace(':project', project.name)}
                    </h3>
                    <p className="text-sm" style={subtitleStyle}>
                        {t('projects.danger_zone.modal.body')}
                    </p>
                    <p className="mt-4 text-sm font-medium">
                        {(() => {
                            const [before, after = ''] = t('projects.danger_zone.modal.confirm_instruction').split(':name');
                            return (
                                <>
                                    {before}
                                    <kbd style={kbdStyle}>{project.name}</kbd>
                                    {after}
                                </>
                            );
                        })()}
                    </p>
                    <input
                        type="text"
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && confirmation === project.name && handleDelete()}
                        className="mx-auto mt-2 w-64"
                        style={inputStyle}
                        placeholder={project.name}
                        autoFocus
                    />
                    <div className="mt-6 flex justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => { setShowModal(false); setConfirmation(''); }}
                            className="alex-btn"
                            style={ghostBtnStyle}
                        >
                            {t('projects.danger_zone.modal.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={confirmation !== project.name || deleting}
                            className="alex-btn inline-flex items-center"
                            style={{
                                ...dangerFillBtnStyle,
                                opacity: (confirmation !== project.name || deleting) ? 0.5 : 1,
                            }}
                        >
                            {deleting ? (
                                <>
                                    <i className="fa-solid fa-circle-notch fa-spin text-sm" aria-hidden="true" />
                                    {t('projects.danger_zone.modal.deleting')}
                                </>
                            ) : (
                                t('projects.danger_zone.modal.submit')
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
