import { useState } from 'react';
import { router } from '@inertiajs/react';
import Modal from '@alexandria/components/ui/Modal';
import type { ProjectDetail } from '@alexandria/types/projects';

interface DangerZoneSectionProps {
    project: ProjectDetail;
}

export default function DangerZoneSection({ project }: DangerZoneSectionProps) {
    const [showModal, setShowModal] = useState(false);
    const [confirmation, setConfirmation] = useState('');
    const [deleting, setDeleting] = useState(false);

    function handleDelete() {
        setDeleting(true);
        router.delete(`/p/${project.slug}`, {
            data: { confirmation },
            onSuccess: () => { /* redirected by controller */ },
            onError: () => setDeleting(false),
        });
    }

    return (
        <>
            <div className="rounded-2xl border border-error/30 bg-error/10 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-error">Delete Project</h3>
                        <p className="mt-1 text-sm text-base-content/60">
                            Permanently delete <strong>{project.name}</strong> and all its entries, blueprints, and data.
                            This action cannot be undone.
                        </p>
                    </div>
                    <button type="button" onClick={() => setShowModal(true)} className="btn btn-outline btn-error rounded-xl">
                        <i className="fa-solid fa-trash-can mr-1" /> Delete
                    </button>
                </div>
            </div>

            <Modal open={showModal} onClose={() => { setShowModal(false); setConfirmation(''); }}>
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
                        <i className="fa-solid fa-triangle-exclamation text-2xl text-error" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold">Delete "{project.name}"?</h3>
                    <p className="text-sm text-base-content/60">
                        All entries, blueprints, relationships, and AI data will be permanently lost.
                    </p>
                    <p className="mt-4 text-sm font-medium">
                        Type <kbd className="kbd kbd-sm">{project.name}</kbd> to confirm:
                    </p>
                    <input
                        type="text"
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && confirmation === project.name && handleDelete()}
                        className="input input-bordered mx-auto mt-2 w-64 rounded-xl text-center focus:input-error"
                        placeholder={project.name}
                        autoFocus
                    />
                    <div className="mt-6 flex justify-center gap-2">
                        <button type="button" onClick={() => { setShowModal(false); setConfirmation(''); }} className="btn btn-ghost rounded-xl">Cancel</button>
                        <button type="button" onClick={handleDelete} className="btn btn-error rounded-xl" disabled={confirmation !== project.name || deleting}>
                            {deleting ? <><span className="loading loading-spinner loading-sm" /> Deleting...</> : 'Delete Project'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
