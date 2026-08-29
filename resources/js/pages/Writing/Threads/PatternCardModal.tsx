import { useState } from 'react';

import Button from '@alexandria/components/ui/Button';
import Input from '@alexandria/components/form/Input';
import Textarea from '@alexandria/components/form/Textarea';
import Modal, { ModalFooter, ModalHeader } from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';

import { createCard, updateCard, type CardInput, type PatternCard } from './threadApi';

/**
 * Create/edit modal for a Devices & Tropes library card — Task 6
 * (design doc 2026-08-29-devices-tropes-design.md Surface #1). `kind`
 * is a free-text field with a datalist of kinds already in use
 * (`device`/`trope` from the seeded set, plus any owner-made kind) —
 * the design doc explicitly keeps kinds open-ended, so this never
 * hardens into a fixed `<Select>`.
 */

export interface PatternCardModalProps {
    projectSlug: string;
    /** `null` creates a new card; otherwise edits it in place. */
    card: PatternCard | null;
    existingKinds: string[];
    onClose: () => void;
    onSaved: (card: PatternCard) => void;
}

export default function PatternCardModal({ projectSlug, card, existingKinds, onClose, onSaved }: PatternCardModalProps) {
    const t = useT();

    const [name, setName] = useState(card?.name ?? '');
    const [kind, setKind] = useState(card?.kind ?? existingKinds[0] ?? 'device');
    const [definition, setDefinition] = useState(card?.definition ?? '');
    const [craftGuidance, setCraftGuidance] = useState(card?.craft_guidance ?? '');
    const [pitfalls, setPitfalls] = useState(card?.pitfalls ?? '');
    const [shape, setShape] = useState(card?.shape ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);

    async function submit() {
        if (name.trim() === '' || kind.trim() === '' || definition.trim() === '') {
            setError(true);
            return;
        }

        setSaving(true);
        setError(false);

        const input: CardInput = {
            name: name.trim(),
            kind: kind.trim(),
            definition: definition.trim(),
            craft_guidance: craftGuidance.trim() === '' ? null : craftGuidance.trim(),
            pitfalls: pitfalls.trim() === '' ? null : pitfalls.trim(),
            shape: shape.trim() === '' ? null : shape.trim(),
        };

        const result = card === null
            ? await createCard(projectSlug, input)
            : await updateCard(projectSlug, card.id, input);

        setSaving(false);

        if (result === null) {
            setError(true);
            return;
        }

        onSaved(result);
    }

    return (
        <Modal open onClose={onClose} maxWidth="max-w-lg">
            <ModalHeader
                title={card === null ? t('writing.library.modal_new_title') : t('writing.library.modal_edit_title')}
                onClose={onClose}
            />
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                }}
            >
                <div className="flex flex-col gap-4 px-6 py-5">
                    <Input
                        label={t('writing.library.name_label')}
                        name="card-name"
                        placeholder={t('writing.library.name_placeholder')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                        required
                        size="md"
                    />

                    <Input
                        label={t('writing.library.kind_label')}
                        name="card-kind"
                        list="pattern-card-kinds"
                        placeholder={t('writing.library.kind_placeholder')}
                        value={kind}
                        onChange={(e) => setKind(e.target.value)}
                        required
                        size="md"
                    />
                    <datalist id="pattern-card-kinds">
                        {existingKinds.map((candidate) => (
                            <option key={candidate} value={candidate} />
                        ))}
                    </datalist>

                    <Textarea
                        label={t('writing.library.definition_label')}
                        name="card-definition"
                        value={definition}
                        onChange={(e) => setDefinition(e.target.value)}
                        rows={2}
                        required
                        size="md"
                    />

                    <Textarea
                        label={t('writing.library.craft_guidance_label')}
                        name="card-craft-guidance"
                        value={craftGuidance}
                        onChange={(e) => setCraftGuidance(e.target.value)}
                        rows={2}
                        size="md"
                    />

                    <Textarea
                        label={t('writing.library.pitfalls_label')}
                        name="card-pitfalls"
                        value={pitfalls}
                        onChange={(e) => setPitfalls(e.target.value)}
                        rows={2}
                        size="md"
                    />

                    <Textarea
                        label={t('writing.library.shape_label')}
                        name="card-shape"
                        value={shape}
                        onChange={(e) => setShape(e.target.value)}
                        rows={2}
                        size="md"
                    />

                    {error && (
                        <p className="text-xs" style={{ color: 'var(--theme-status-error-stroke)' }}>
                            {t('writing.library.save_error')}
                        </p>
                    )}
                </div>
                <ModalFooter>
                    <Button variant="ghost" type="button" onClick={onClose}>
                        {t('writing.form.cancel')}
                    </Button>
                    <Button type="submit" loading={saving}>
                        {t('writing.library.save_action')}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
