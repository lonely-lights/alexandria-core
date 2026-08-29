import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import Button from '@alexandria/components/ui/Button';
import ConfirmModal from '@alexandria/components/ui/ConfirmModal';
import useT from '@alexandria/hooks/useT';

import PatternCardModal from './PatternCardModal';
import { deleteCard, fetchCards, type CardDeleteResult, type PatternCard } from './threadApi';

/**
 * "Devices & Tropes" library — Task 6 (design doc
 * 2026-08-29-devices-tropes-design.md Surface #1), the writing hub's
 * card list grouped by kind, with a create/edit modal (PatternCardModal)
 * and a delete flow whose confirm copy makes the soft-delete/in-use
 * guard explicit: deleting a card never breaks existing threads.
 */

export interface PatternLibraryProps {
    projectSlug: string;
    canManage: boolean;
}

const cardPanelStyle: CSSProperties = {
    background: 'var(--theme-surface-card)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const panelHeaderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};

const mutedTextStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const kindHeadingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
};

const cardRowStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-button)',
};

const seededBadgeStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)',
    color: 'var(--theme-brand-primary-500)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 700,
    lineHeight: 1.6,
};

export default function PatternLibrary({ projectSlug, canManage }: PatternLibraryProps) {
    const t = useT();
    const [cards, setCards] = useState<PatternCard[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [editing, setEditing] = useState<PatternCard | 'new' | null>(null);
    const [deleting, setDeleting] = useState<PatternCard | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

    function load() {
        fetchCards(projectSlug).then((result) => {
            if (result === null) {
                setFailed(true);
                return;
            }

            setFailed(false);
            setCards(result);
        });
    }

    useEffect(load, [projectSlug]);

    const grouped = useMemo(() => {
        const groups = new Map<string, PatternCard[]>();

        for (const card of cards ?? []) {
            const list = groups.get(card.kind) ?? [];
            list.push(card);
            groups.set(card.kind, list);
        }

        return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [cards]);

    const existingKinds = useMemo(
        () => [...new Set((cards ?? []).map((card) => card.kind))].sort((a, b) => a.localeCompare(b)),
        [cards],
    );

    function handleSaved(card: PatternCard) {
        setCards((prev) => {
            const list = prev ?? [];
            const exists = list.some((candidate) => candidate.id === card.id);

            return exists ? list.map((candidate) => (candidate.id === card.id ? card : candidate)) : [...list, card];
        });
        setEditing(null);
    }

    async function confirmDelete() {
        if (deleting === null) {
            return;
        }

        setDeleteBusy(true);
        const result: CardDeleteResult | null = await deleteCard(projectSlug, deleting.id);
        setDeleteBusy(false);

        if (result === null) {
            return;
        }

        setCards((prev) => (prev ?? []).filter((candidate) => candidate.id !== deleting.id));
        setDeleteNotice(
            result.threads_kept > 0
                ? t('writing.library.delete_result').replace(':count', String(result.threads_kept))
                : null,
        );
        setDeleting(null);
    }

    return (
        <section className="min-w-0" style={cardPanelStyle} data-writing-pattern-library>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={panelHeaderStyle}>
                <div className="min-w-0">
                    <h2 className="font-serif text-lg font-bold tracking-tight">{t('writing.library.heading')}</h2>
                    <p className="mt-0.5 text-xs" style={mutedTextStyle}>{t('writing.library.subheading')}</p>
                </div>
                {canManage && (
                    <Button icon="fa-solid fa-plus" iconPosition="before" onClick={() => setEditing('new')}>
                        {t('writing.library.new_card')}
                    </Button>
                )}
            </div>

            <div className="px-5 py-4">
                {deleteNotice !== null && (
                    <p className="mb-3 text-xs" style={mutedTextStyle}>{deleteNotice}</p>
                )}

                {failed && (
                    <p className="text-sm italic" style={{ color: 'var(--theme-status-error-stroke)' }}>
                        {t('writing.library.load_error')}
                    </p>
                )}

                {!failed && cards === null && (
                    <p className="text-sm italic" style={mutedTextStyle}>{t('writing.library.loading')}</p>
                )}

                {cards !== null && cards.length === 0 && (
                    <p className="text-sm italic" style={mutedTextStyle}>{t('writing.library.empty')}</p>
                )}

                {grouped.map(([kind, kindCards]) => (
                    <div key={kind} className="mb-4 last:mb-0">
                        <div className="mb-1.5 px-1" style={kindHeadingStyle}>{kind}</div>
                        <div className="flex flex-col gap-1">
                            {kindCards.map((card) => (
                                <div
                                    key={card.id}
                                    className="alex-row flex items-center justify-between gap-2 px-3 py-2"
                                    style={cardRowStyle}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate text-sm font-medium">{card.name}</span>
                                            {card.is_seeded && (
                                                <span style={seededBadgeStyle}>{t('writing.library.seeded_badge')}</span>
                                            )}
                                        </div>
                                        <p className="truncate text-xs" style={mutedTextStyle}>{card.definition}</p>
                                    </div>
                                    {canManage && (
                                        <div className="flex shrink-0 items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                icon="fa-solid fa-pen"
                                                onClick={() => setEditing(card)}
                                            >
                                                {t('writing.library.edit_action')}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                icon="fa-solid fa-trash"
                                                onClick={() => setDeleting(card)}
                                            >
                                                {t('writing.library.delete_action')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {editing !== null && (
                <PatternCardModal
                    projectSlug={projectSlug}
                    card={editing === 'new' ? null : editing}
                    existingKinds={existingKinds}
                    onClose={() => setEditing(null)}
                    onSaved={handleSaved}
                />
            )}

            <ConfirmModal
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={() => void confirmDelete()}
                title={t('writing.library.delete_confirm_title')}
                message={t('writing.library.delete_confirm_body')}
                confirmLabel={t('writing.library.delete_action')}
                variant="danger"
                loading={deleteBusy}
            />
        </section>
    );
}
