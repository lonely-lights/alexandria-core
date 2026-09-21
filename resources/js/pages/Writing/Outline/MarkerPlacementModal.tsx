import { useState } from 'react';
import Button from '@alexandria/components/ui/Button';
import Modal, {
    ModalHeader,
    ModalFooter,
} from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';
import MarkerReadout from '../pacing/MarkerReadout';
import { pacingNodesFromOutline } from '../pacing/pacingAdapters';
import { buildPacingModel } from '../pacing/pacingModel';
import type { PacingMarkerInput } from '../pacing/pacingTypes';
import type { OutlineMarkerPlacement, OutlineRow } from './outlineTypes';

export default function MarkerPlacementModal({
    rows,
    markers,
    initialIndex,
    initialSectionKey,
    target,
    onSave,
    onClose,
    onJump,
}: {
    rows: OutlineRow[];
    markers: PacingMarkerInput[];
    initialIndex: number;
    initialSectionKey?: string;
    target: number | null;
    onSave: (placement: OutlineMarkerPlacement) => Promise<boolean>;
    onClose: () => void;
    onJump: (key: string) => void;
}) {
    const t = useT();
    const [index, setIndex] = useState(initialIndex);
    const [sectionKey, setSectionKey] = useState(
        initialSectionKey ??
            rows.find(
                (r) => r.sectionId === markers[initialIndex]?.anchor_section_id,
            )?.key ??
            '',
    );
    const [edge, setEdge] = useState<'start' | 'end'>(
        markers[initialIndex]?.anchor_edge ?? 'start',
    );
    const [busy, setBusy] = useState(false);
    const marker = markers[index];
    const nodes = pacingNodesFromOutline(rows).map((n, i) => ({
        ...n,
        sectionId: n.sectionId ?? -(i + 1),
    }));
    const selected = nodes.find((n) => n.key === sectionKey);
    const preview = marker
        ? buildPacingModel(nodes, target, [
              {
                  ...marker,
                  anchor_section_id: selected?.sectionId ?? null,
                  anchor_edge: edge,
              },
          ]).markers[0]
        : null;
    const close = () => {
        if (!busy) {
            onClose();
        }
    };
    async function save(key: string | null) {
        setBusy(true);
        await onSave({ index, sectionKey: key, edge });
        setBusy(false);
        // Save failures remain visible in the outline's recovery controls.
        onClose();
    }

    return (
        <Modal open onClose={close} dismissible={!busy}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('writing.pacing.place_marker')}
                data-marker-placement
            >
                <ModalHeader
                    title={t('writing.pacing.place_marker')}
                    onClose={close}
                />
                <div className="grid gap-4 overflow-y-auto px-6 py-4">
                    <label className="grid gap-1 text-sm">
                        {t('writing.pacing.marker')}
                        <select
                            className="tf-input w-full"
                            aria-label={t('writing.pacing.marker')}
                            value={index}
                            disabled={busy}
                            onChange={(e) => {
                                const next = Number(e.target.value);
                                setIndex(next);
                                setSectionKey(
                                    initialSectionKey ??
                                        rows.find(
                                            (r) =>
                                                r.sectionId ===
                                                markers[next].anchor_section_id,
                                        )?.key ??
                                        '',
                                );
                                setEdge(markers[next].anchor_edge ?? 'start');
                            }}
                        >
                            {markers.map((m, i) => (
                                <option key={i} value={i}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="grid gap-1 text-sm">
                        {t('writing.pacing.scene_section')}
                        <select
                            className="tf-input w-full"
                            aria-label={t('writing.pacing.scene_section')}
                            value={sectionKey}
                            disabled={busy}
                            onChange={(e) => setSectionKey(e.target.value)}
                        >
                            <option value="">
                                {t('writing.pacing.choose_section')}
                            </option>
                            {rows
                                .filter((r) => r.title.trim() !== '')
                                .map((r) => (
                                    <option key={r.key} value={r.key}>
                                        {'— '.repeat(r.depth)}
                                        {r.title}
                                    </option>
                                ))}
                        </select>
                    </label>
                    <label className="grid gap-1 text-sm">
                        {t('writing.pacing.edge')}
                        <select
                            className="tf-input w-full"
                            aria-label={t('writing.pacing.edge')}
                            value={edge}
                            disabled={busy}
                            onChange={(e) =>
                                setEdge(e.target.value as 'start' | 'end')
                            }
                        >
                            <option value="start">
                                {t('writing.pacing.start')}
                            </option>
                            <option value="end">
                                {t('writing.pacing.end')}
                            </option>
                        </select>
                    </label>
                    {preview && <MarkerReadout marker={preview} />}
                    <p className="text-xs opacity-70">
                        {t('writing.pacing.placement_help')}
                    </p>
                    {marker?.anchor_section_id != null && (
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => void save(null)}
                            >
                                {t('writing.pacing.unassign')}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={
                                    busy ||
                                    !rows.some(
                                        (r) =>
                                            r.sectionId ===
                                            marker.anchor_section_id,
                                    )
                                }
                                onClick={() => {
                                    const row = rows.find(
                                        (r) =>
                                            r.sectionId ===
                                            marker.anchor_section_id,
                                    );

                                    if (row) {
                                        onJump(row.key);
                                        onClose();
                                    }
                                }}
                            >
                                {t('writing.pacing.go_to_section')}
                            </Button>
                        </div>
                    )}
                </div>
                <ModalFooter>
                    <Button variant="ghost" disabled={busy} onClick={close}>
                        {t('writing.form.cancel')}
                    </Button>
                    <Button
                        disabled={
                            busy ||
                            !selected ||
                            !marker ||
                            !rows
                                .find((r) => r.key === sectionKey)
                                ?.title.trim()
                        }
                        onClick={() => void save(sectionKey)}
                    >
                        {t('writing.pacing.apply_placement')}
                    </Button>
                </ModalFooter>
            </div>
        </Modal>
    );
}
