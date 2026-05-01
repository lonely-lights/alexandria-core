import { useState, useEffect, useRef } from 'react';
import Cropper from 'cropperjs';
import Modal, { ModalFooter } from '@alexandria/components/ui/Modal';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import type { MediaModelType } from '@alexandria/types/media';

interface CropModalProps {
    open: boolean;
    onClose: () => void;
    imageUrl: string;
    mediaId: number;
    modelType: MediaModelType;
    modelId: number;
    onCropped: () => void;
    initialRatio?: number;
}

interface RatioPreset {
    label: string;
    value: number | null;
}

const RATIO_PRESETS: RatioPreset[] = [
    { label: '3:2', value: 3 / 2 },
    { label: '2:3', value: 2 / 3 },
    { label: '16:9', value: 16 / 9 },
    { label: '1:1', value: 1 },
    { label: 'Free', value: null },
];

export default function CropModal({
    open,
    onClose,
    imageUrl,
    mediaId,
    modelType,
    modelId,
    onCropped,
    initialRatio,
}: CropModalProps) {
    const [selectedRatio, setSelectedRatio] = useState<number | null>(initialRatio ?? null);
    const [applying, setApplying] = useState(false);

    const imgRef = useRef<HTMLImageElement>(null);
    const cropperRef = useRef<Cropper | null>(null);

    useEffect(() => {
        if (!open) return;
        setSelectedRatio(initialRatio ?? null);
        setApplying(false);
    }, [open, initialRatio]);

    useEffect(() => {
        if (!open || !imgRef.current) return;

        const img = imgRef.current;

        function initCropper() {
            if (cropperRef.current) {
                cropperRef.current.destroy();
                cropperRef.current = null;
            }

            cropperRef.current = new Cropper(img, {
                template: `
                    <cropper-canvas background>
                        <cropper-image></cropper-image>
                        <cropper-shade hidden></cropper-shade>
                        <cropper-handle action="select" plain></cropper-handle>
                        <cropper-selection initial-coverage="0.8" movable resizable>
                            <cropper-grid role="grid" bordered covered></cropper-grid>
                            <cropper-crosshair centered></cropper-crosshair>
                            <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)"></cropper-handle>
                            <cropper-handle action="n-resize"></cropper-handle>
                            <cropper-handle action="e-resize"></cropper-handle>
                            <cropper-handle action="s-resize"></cropper-handle>
                            <cropper-handle action="w-resize"></cropper-handle>
                            <cropper-handle action="ne-resize"></cropper-handle>
                            <cropper-handle action="nw-resize"></cropper-handle>
                            <cropper-handle action="se-resize"></cropper-handle>
                            <cropper-handle action="sw-resize"></cropper-handle>
                        </cropper-selection>
                    </cropper-canvas>
                `,
            });

            const selection = cropperRef.current.getCropperSelection();
            if (selection && selectedRatio !== null) {
                selection.aspectRatio = selectedRatio;
            }
        }

        if (img.complete) {
            initCropper();
        } else {
            img.addEventListener('load', initCropper, { once: true });
        }

        return () => {
            if (cropperRef.current) {
                cropperRef.current.destroy();
                cropperRef.current = null;
            }
        };
    }, [open]);

    function handleRatioChange(ratio: number | null) {
        setSelectedRatio(ratio);
        if (cropperRef.current) {
            const selection = cropperRef.current.getCropperSelection();
            if (selection) {
                selection.aspectRatio = ratio ?? NaN;
            }
        }
    }

    async function handleApply() {
        if (!cropperRef.current) return;

        const selection = cropperRef.current.getCropperSelection();
        if (!selection) return;

        const { x, y, width, height } = selection;

        setApplying(true);
        try {
            const res = await fetch(`/api/v1/${modelType}/${modelId}/media/${mediaId}/crop`, {
                method: 'PUT',
                headers: csrfHeaders(),
                body: JSON.stringify({
                    x: Math.round(x),
                    y: Math.round(y),
                    width: Math.round(width),
                    height: Math.round(height),
                }),
            });

            if (res.ok) {
                onCropped();
                onClose();
            }
        } finally {
            setApplying(false);
        }
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
            <div className="p-6">
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <i className="fa-solid fa-crop text-primary" />
                    </div>
                    <h3 className="text-lg font-bold">Adjust Crop</h3>
                </div>

                <div className="max-h-[60vh] overflow-hidden rounded-xl bg-base-300">
                    <img
                        ref={imgRef}
                        src={imageUrl}
                        alt="Crop preview"
                        className="block max-w-full"
                        crossOrigin="anonymous"
                    />
                </div>

                <div className="mt-3 flex gap-1">
                    {RATIO_PRESETS.map((preset) => {
                        const isActive = preset.value === null
                            ? selectedRatio === null
                            : selectedRatio === preset.value;
                        return (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => handleRatioChange(preset.value)}
                                className={`btn btn-xs rounded-md ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <ModalFooter>
                <button type="button" onClick={onClose} className="btn btn-ghost">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => void handleApply()}
                    disabled={applying}
                    className="btn btn-primary"
                >
                    {applying && <span className="loading loading-spinner loading-sm" />}
                    Apply Crop
                </button>
            </ModalFooter>
        </Modal>
    );
}
