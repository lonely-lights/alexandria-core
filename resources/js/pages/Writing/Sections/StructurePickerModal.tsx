import { router } from '@inertiajs/react';
import { useEffect, useState, type CSSProperties } from 'react';

import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import useT from '@alexandria/hooks/useT';
import Button from '@alexandria/components/ui/Button';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';

/**
 * StructurePickerModal — compendium-structure-tab (Task 11).
 *
 * Lets a project manager link (or unlink) the structural blueprint
 * that drives the writing dashboard's "Structure" tab. `choices` is
 * Task 8's `structureChoices` optional Inertia prop — absent until
 * this modal fires a partial reload for it, so it opens immediately
 * and shows a pulsing skeleton while the reload is in flight.
 *
 * Submits `PUT /works/{project.slug}/structure` (Task 7) directly via
 * fetch (not `useForm`) per the brief, then reloads `structureMeta` +
 * `structure` on success so both the tab bar and (if active) the tree
 * pick up the change.
 */

export interface StructureChoice {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
}

interface StructurePickerModalProps {
    project: { slug: string };
    current: number | null;
    choices: StructureChoice[] | undefined;
    onClose: () => void;
}

/* ── Theme styles ── */

const helpTextStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
};

const emptyStateStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const errorTextStyle: CSSProperties = {
    color: 'var(--theme-status-error-stroke, #dc2626)',
};

const skeletonRowStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
};

const selectedRowStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 12%, transparent)',
};

export default function StructurePickerModal({ project, current, choices, onClose }: StructurePickerModalProps) {
    const t = useT();
    const [selectedId, setSelectedId] = useState<number | null>(current);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        router.reload({ only: ['structureChoices'] });
        // Fires once on open — `choices` starts undefined until this
        // partial reload resolves, matching Task 8's optional prop.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function submit(blueprintId: number | null) {
        setError(null);
        setSaving(true);
        try {
            const res = await fetch(`/works/${project.slug}/structure`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...csrfHeaders() },
                body: JSON.stringify({ blueprint_id: blueprintId }),
            });
            if (res.ok) {
                onClose();
                router.reload({ only: ['structureMeta', 'structure'] });
            } else {
                const data = await res.json().catch(() => null);
                setError(data?.errors?.blueprint_id?.[0] ?? data?.message ?? t('writing.structure.link_failed'));
            }
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal open onClose={onClose} maxWidth="max-w-md">
            <ModalHeader title={t('writing.structure.picker_title')} onClose={onClose} />
            <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-6 py-4">
                <p className="text-sm" style={helpTextStyle}>
                    {t('writing.structure.picker_help')}
                </p>

                {choices === undefined ? (
                    <div className="flex flex-col gap-2" aria-hidden="true">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="h-10 animate-pulse" style={skeletonRowStyle} />
                        ))}
                    </div>
                ) : choices.length === 0 ? (
                    <p className="px-1 py-4 text-center text-sm italic" style={emptyStateStyle}>
                        {t('writing.structure.picker_none')}
                    </p>
                ) : (
                    <div role="radiogroup" aria-label={t('writing.structure.picker_title')} className="flex flex-col gap-1">
                        {choices.map((choice) => (
                            <button
                                key={choice.id}
                                type="button"
                                role="radio"
                                aria-checked={selectedId === choice.id}
                                className="alex-row flex items-center gap-2 px-3 py-2 text-left text-sm"
                                style={{
                                    borderRadius: 'var(--theme-radius-button)',
                                    ...(selectedId === choice.id ? selectedRowStyle : undefined),
                                }}
                                onClick={() => setSelectedId(choice.id)}
                            >
                                <i className={choice.icon ?? 'fa-solid fa-sitemap'} aria-hidden="true" />
                                <span className="min-w-0 flex-1 truncate font-medium">{choice.name}</span>
                                {selectedId === choice.id && (
                                    <i className="fa-solid fa-check text-xs" aria-hidden="true" />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {error !== null && (
                    <p className="text-sm" style={errorTextStyle}>
                        {error}
                    </p>
                )}
            </div>
            <ModalFooter>
                {current !== null && (
                    <Button variant="ghost" disabled={saving} onClick={() => submit(null)}>
                        {t('writing.structure.picker_clear')}
                    </Button>
                )}
                <Button variant="ghost" onClick={onClose} disabled={saving}>
                    {t('writing.form.cancel')}
                </Button>
                <Button
                    onClick={() => submit(selectedId)}
                    loading={saving}
                    disabled={choices === undefined || selectedId === current}
                >
                    {t('writing.structure.save')}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
