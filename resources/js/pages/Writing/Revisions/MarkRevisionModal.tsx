import { useState } from 'react';

import Button from '@alexandria/components/ui/Button';
import Input from '@alexandria/components/form/Input';
import Modal, { ModalFooter, ModalHeader } from '@alexandria/components/ui/Modal';
import useT from '@alexandria/hooks/useT';

import type { CurrentSection, SectionNode } from '../Workspace';
import { markRevision } from './revisionApi';

/**
 * Mark-revision dialog — Stage 9 (design doc 2026-08-29-revisions-design.md
 * Surfaces #1/#2). Two entry points share this one component:
 *
 *  - File → "Mark revision…" (`lockedSection: null`): a scope radio —
 *    *This scene* (the current section, default), one option per
 *    ancestor container (nearest first), then *Entire work* — plus an
 *    optional label.
 *  - Navigator row menu "Mark revision…" (`lockedSection: <node>`): the
 *    scope is fixed to that row; the radio is replaced by plain text
 *    naming the locked scope.
 *
 * Success is a toastless inline confirmation ("Rev N marked") — no
 * established toast idiom lives in this desk (see ExportFdxModal/
 * WorkSettingsModal precedent) — followed by an auto-close so the modal
 * doesn't linger. `onMarked` fires immediately on success (not after the
 * close delay) so a History panel already open refreshes right away.
 */

const CONFIRM_CLOSE_DELAY_MS = 1100;

/** Depth-first ancestor path for `targetId`, nearest ancestor first. */
function ancestorsOf(nodes: SectionNode[], targetId: number): SectionNode[] {
    function walk(list: SectionNode[], trail: SectionNode[]): SectionNode[] | null {
        for (const node of list) {
            if (node.id === targetId) {
                return trail;
            }

            const found = walk(node.children, [...trail, node]);

            if (found !== null) {
                return found;
            }
        }

        return null;
    }

    const trail = walk(nodes, []);

    return trail === null ? [] : [...trail].reverse();
}

export interface MarkRevisionModalProps {
    projectSlug: string;
    workSlug: string;
    sections: SectionNode[];
    currentSection: CurrentSection | null;
    /** Non-null when opened from the Navigator row menu — locks the scope to this section/container. */
    lockedSection: SectionNode | null;
    onClose: () => void;
    /** Fired immediately on a successful mark, before the auto-close. */
    onMarked: () => void;
}

export default function MarkRevisionModal({
    projectSlug,
    workSlug,
    sections,
    currentSection,
    lockedSection,
    onClose,
    onMarked,
}: MarkRevisionModalProps) {
    const t = useT();

    const ancestors = lockedSection === null && currentSection !== null
        ? ancestorsOf(sections, currentSection.id)
        : [];

    // null = Entire work. Defaults to the current section when one is
    // open, otherwise there's nothing scene-scoped to default to.
    const [scopeSectionId, setScopeSectionId] = useState<number | null>(
        lockedSection?.id ?? currentSection?.id ?? null,
    );
    const [label, setLabel] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [failed, setFailed] = useState(false);
    const [confirmedNumber, setConfirmedNumber] = useState<number | null>(null);

    async function submit() {
        setSubmitting(true);
        setFailed(false);

        const revision = await markRevision(projectSlug, workSlug, {
            scopeSectionId: lockedSection?.id ?? scopeSectionId,
            label: label.trim() || undefined,
        });

        setSubmitting(false);

        if (revision === null) {
            setFailed(true);

            return;
        }

        setConfirmedNumber(revision.number);
        onMarked();
        window.setTimeout(onClose, CONFIRM_CLOSE_DELAY_MS);
    }

    return (
        <Modal open onClose={onClose} maxWidth="max-w-md">
            <ModalHeader title={t('writing.revisions.mark_title')} onClose={onClose} />

            {confirmedNumber !== null ? (
                <div className="px-6 py-8 text-center text-sm font-medium">
                    {t('writing.revisions.mark_confirmed').replace(':number', String(confirmedNumber))}
                </div>
            ) : (
                <form
                    noValidate
                    onSubmit={(e) => {
                        e.preventDefault();
                        void submit();
                    }}
                >
                    <div className="flex flex-col gap-4 px-6 py-5">
                        {lockedSection !== null ? (
                            <div>
                                <span className="mb-1.5 block text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}>
                                    {t('writing.revisions.scope_label')}
                                </span>
                                <p className="text-sm font-medium" data-mark-revision-locked-scope>
                                    {lockedSection.title}
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2" role="radiogroup" aria-label={t('writing.revisions.scope_label')}>
                                <span className="text-xs" style={{ color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' }}>
                                    {t('writing.revisions.scope_label')}
                                </span>

                                {currentSection !== null && (
                                    <label className="flex cursor-pointer items-center gap-3 text-sm">
                                        <input
                                            type="radio"
                                            name="mark-revision-scope"
                                            checked={scopeSectionId === currentSection.id}
                                            onChange={() => setScopeSectionId(currentSection.id)}
                                        />
                                        {t('writing.revisions.scope_this_scene')}
                                    </label>
                                )}

                                {ancestors.map((ancestor) => (
                                    <label key={ancestor.id} className="flex cursor-pointer items-center gap-3 text-sm">
                                        <input
                                            type="radio"
                                            name="mark-revision-scope"
                                            checked={scopeSectionId === ancestor.id}
                                            onChange={() => setScopeSectionId(ancestor.id)}
                                        />
                                        {ancestor.title}
                                    </label>
                                ))}

                                <label className="flex cursor-pointer items-center gap-3 text-sm">
                                    <input
                                        type="radio"
                                        name="mark-revision-scope"
                                        checked={scopeSectionId === null}
                                        onChange={() => setScopeSectionId(null)}
                                    />
                                    {t('writing.revisions.scope_entire_work')}
                                </label>
                            </div>
                        )}

                        <Input
                            label={t('writing.revisions.label_placeholder')}
                            name="label"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            size="md"
                        />

                        {failed && (
                            <p className="text-xs" style={{ color: 'var(--theme-status-error-stroke)' }}>
                                {t('writing.revisions.mark_error')}
                            </p>
                        )}
                    </div>
                    <ModalFooter>
                        <Button variant="ghost" onClick={onClose} type="button">
                            {t('writing.form.cancel')}
                        </Button>
                        <Button type="submit" loading={submitting}>
                            {t('writing.revisions.mark_action')}
                        </Button>
                    </ModalFooter>
                </form>
            )}
        </Modal>
    );
}
