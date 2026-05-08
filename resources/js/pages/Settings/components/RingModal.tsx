import AvatarWithRing, { type AvatarRingOption } from '@alexandria/components/ui/AvatarWithRing';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';
import Button from '@alexandria/components/ui/Button';
import useT from '@alexandria/hooks/useT';

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
    const t = useT();
    const previewRing = previewRingId !== null ? rings[previewRingId] : null;

    const previewBg = 'color-mix(in srgb, var(--theme-base-300) 30%, transparent)';
    const noneIconBg = 'var(--theme-base-300)';
    const noneIconFg = 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)';
    const subtitleFg = 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)';
    const selectedBg = 'color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)';
    const selectedRing = 'var(--theme-brand-primary-500)';
    const checkColor = 'var(--theme-brand-primary-500)';
    const animatedBadgeBg = 'color-mix(in srgb, var(--theme-brand-secondary-500) 20%, transparent)';
    const animatedBadgeFg = 'var(--theme-brand-secondary-500)';

    function optionStyle(isSelected: boolean) {
        return isSelected
            ? {
                  background: selectedBg,
                  borderRadius: 'var(--theme-radius-card)',
                  boxShadow: `inset 0 0 0 2px ${selectedRing}`,
              }
            : {
                  borderRadius: 'var(--theme-radius-card)',
              };
    }

    return (
        <Modal open onClose={onClose}>
            <ModalHeader title={t('settings.ring_picker.title')} onClose={onClose} />

            {/* Preview */}
            <div
                className="flex justify-center p-6"
                style={{ background: previewBg }}
            >
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
                    type="button"
                    onClick={() => onPreview(null)}
                    className="alex-ring-option flex w-full items-center gap-3 px-4 py-3 text-left transition-all"
                    style={optionStyle(previewRingId === null)}
                >
                    <div
                        className="flex h-10 w-10 items-center justify-center"
                        style={{
                            background: noneIconBg,
                            borderRadius: 'var(--theme-radius-badge)',
                        }}
                    >
                        <i
                            className="fa-solid fa-ban"
                            style={{ color: noneIconFg }}
                            aria-hidden="true"
                        />
                    </div>
                    <div>
                        <p className="font-medium">{t('settings.ring_picker.none_label')}</p>
                        <p className="text-xs" style={{ color: subtitleFg }}>
                            {t('settings.ring_picker.none_description')}
                        </p>
                    </div>
                    {previewRingId === null && (
                        <i
                            className="fa-solid fa-check ml-auto"
                            style={{ color: checkColor }}
                            aria-hidden="true"
                        />
                    )}
                </button>

                {Object.entries(rings).map(([id, ring]) => {
                    const ringId = parseInt(id);
                    const isSelected = previewRingId === ringId;

                    return (
                        <button
                            key={ringId}
                            type="button"
                            onClick={() => onPreview(ringId)}
                            className="alex-ring-option flex w-full items-center gap-3 px-4 py-3 text-left transition-all"
                            style={optionStyle(isSelected)}
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
                                        <span
                                            className="ml-2 inline-block px-2 py-0.5 text-xs font-semibold"
                                            style={{
                                                background: animatedBadgeBg,
                                                color: animatedBadgeFg,
                                                borderRadius: 'var(--theme-radius-badge)',
                                            }}
                                        >
                                            {t('settings.ring_picker.animated_badge')}
                                        </span>
                                    )}
                                </p>
                                {ring.description && (
                                    <p className="text-xs" style={{ color: subtitleFg }}>
                                        {ring.description}
                                    </p>
                                )}
                            </div>
                            {isSelected && (
                                <i
                                    className="fa-solid fa-check ml-auto"
                                    style={{ color: checkColor }}
                                    aria-hidden="true"
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            <ModalFooter>
                <Button variant="ghost" onClick={onClose}>
                    {t('settings.ring_picker.cancel_button')}
                </Button>
                <Button
                    variant="primary"
                    onClick={() => onSave(previewRingId)}
                    disabled={previewRingId === savedRingId}
                >
                    {t('settings.ring_picker.save_button')}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
