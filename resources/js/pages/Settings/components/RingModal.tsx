import AvatarWithRing, { type AvatarRingOption } from '@alexandria/components/ui/AvatarWithRing';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';

/**
 * Avatar ring picker — opens from the avatar block in the settings
 * profile card. Renders the user's avatar inside each ring option for
 * an instant preview; saving fires a fetch to /account/avatar-ring
 * (handled by the body, not this component) so the modal can close
 * optimistically without an Inertia visit.
 */
export default function RingModal({
    rings,
    savedRingId,
    previewRingId,
    avatarSrc,
    initials,
    onPreview,
    onSave,
    onClose,
}: {
    rings: Record<number, AvatarRingOption>;
    savedRingId: number | null;
    previewRingId: number | null;
    avatarSrc: string | null;
    initials: string;
    onPreview: (id: number | null) => void;
    onSave: (id: number | null) => void;
    onClose: () => void;
}) {
    const previewRing = previewRingId !== null ? rings[previewRingId] : null;

    return (
        <Modal open onClose={onClose}>
            <ModalHeader title="Avatar Ring" onClose={onClose} />

                {/* Preview */}
                <div className="flex justify-center bg-base-300/30 p-6">
                    <AvatarWithRing
                        src={avatarSrc}
                        initials={initials}
                        size={96}
                        ring={previewRing?.slug ?? 'none'}
                        ringSettings={previewRing?.settings}
                    />
                </div>

                {/* Ring Options */}
                <div className="max-h-64 space-y-2 overflow-y-auto p-6">
                    {/* None option */}
                    <button
                        onClick={() => onPreview(null)}
                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                            previewRingId === null
                                ? 'bg-primary/10 ring-2 ring-primary'
                                : 'hover:bg-base-300'
                        }`}
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-300">
                            <i className="fa-solid fa-ban text-base-content/40" />
                        </div>
                        <div>
                            <p className="font-medium">None</p>
                            <p className="text-xs text-base-content/50">No ring around your avatar</p>
                        </div>
                        {previewRingId === null && (
                            <i className="fa-solid fa-check ml-auto text-primary" />
                        )}
                    </button>

                    {Object.entries(rings).map(([id, ring]) => {
                        const ringId = parseInt(id);

                        return (
                            <button
                                key={ringId}
                                onClick={() => onPreview(ringId)}
                                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                                    previewRingId === ringId
                                        ? 'bg-primary/10 ring-2 ring-primary'
                                        : 'hover:bg-base-300'
                                }`}
                            >
                                <AvatarWithRing
                                    src={avatarSrc}
                                    initials={initials}
                                    size={40}
                                    ring={ring.slug}
                                    ringSettings={ring.settings}
                                />
                                <div>
                                    <p className="font-medium">
                                        {ring.label}
                                        {ring.is_animated && (
                                            <span className="badge badge-sm badge-secondary ml-2">Animated</span>
                                        )}
                                    </p>
                                    {ring.description && (
                                        <p className="text-xs text-base-content/50">{ring.description}</p>
                                    )}
                                </div>
                                {previewRingId === ringId && (
                                    <i className="fa-solid fa-check ml-auto text-primary" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <ModalFooter>
                    <button onClick={onClose} className="btn btn-ghost rounded-xl">
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(previewRingId)}
                        className="btn btn-primary rounded-xl"
                        disabled={previewRingId === savedRingId}
                    >
                        Save Ring
                    </button>
                </ModalFooter>
        </Modal>
    );
}
