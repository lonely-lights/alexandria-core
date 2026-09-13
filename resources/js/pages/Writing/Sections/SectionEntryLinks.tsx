import { useEffect, useState } from 'react';

import Tooltip from '@alexandria/components/ui/Tooltip';
import useT from '@alexandria/hooks/useT';
import { csrfHeaders } from '@alexandria/lib/csrfHeaders';
import { worksBase } from '@alexandria/lib/urls';

import EntryPickerModal, { blueprintIconClass } from './EntryPickerModal';
import type { EntryCard } from './ReferencePanel';

/** Keyed by section in the parent so a picker never carries over to another scene. */
export default function SectionEntryLinks({
    project,
    work,
    section,
    canUpdate,
}: {
    project: { id: number; slug: string };
    work: { slug: string };
    section: { id: number; title: string; label: string | null };
    canUpdate: boolean;
}) {
    const t = useT();
    const [links, setLinks] = useState<EntryCard[] | null>(null);
    const [picking, setPicking] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [revision, setRevision] = useState(0);
    const base = worksBase(project.slug, work.slug);

    useEffect(() => {
        const controller = new AbortController();

        fetch(`${base}/panel/mentions/${section.id}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('load');
                }

                const payload = (await response.json()) as {
                    linked: EntryCard[];
                };

                if (!controller.signal.aborted) {
                    setLinks(payload.linked);
                    setError(null);
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setError('writing.panel.links_load_failed');
                }
            });

        return () => controller.abort();
    }, [base, section.id, revision]);

    async function updateLink(entryId: number, unlink = false) {
        if (busy || !canUpdate) {
            return;
        }

        setPicking(false);
        setBusy(true);
        setError(null);

        try {
            const response = await fetch(`${base}/sections/${section.id}/links${unlink ? `/${entryId}` : ''}`, {
                method: unlink ? 'DELETE' : 'POST',
                headers: csrfHeaders(),
                body: unlink ? undefined : JSON.stringify({ entry_id: entryId }),
            });

            if (!response.ok) {
                setError('writing.panel.links_save_failed');

                return;
            }

            setRevision((value) => value + 1);
        } catch {
            setError('writing.panel.links_save_failed');
        } finally {
            setBusy(false);
        }
    }

    return (
        <section
            data-section-entry-links
            className="shrink-0 border-b px-3 py-3"
            style={{ borderColor: 'var(--theme-base-300)' }}
            aria-busy={busy}
        >
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold">
                    {t(
                        section.label?.toLowerCase() === 'scene'
                            ? 'writing.panel.linked_scene'
                            : 'writing.panel.linked_section',
                    )}
                </h3>
                {canUpdate && (
                    <button
                        type="button"
                        data-link-section-entry
                        disabled={busy || links === null}
                        className="alex-toolbar-btn inline-flex items-center gap-1 rounded px-2 py-1 text-xs disabled:opacity-40"
                        onClick={() => setPicking(true)}
                    >
                        <i className="fa-solid fa-plus" aria-hidden="true" />
                        {t('writing.panel.link_item')}
                    </button>
                )}
            </div>
            <p className="mt-1 truncate text-xs opacity-60">{section.title}</p>
            {error && (
                <p role="alert" className="mt-2 text-xs">
                    {t(error)}{' '}
                    <button type="button" className="underline" onClick={() => setRevision((value) => value + 1)}>
                        {t('writing.panel.links_retry')}
                    </button>
                </p>
            )}
            {links?.length === 0 && <p className="mt-2 text-xs opacity-60">{t('writing.panel.links_empty')}</p>}
            {links === null && !error && (
                <p role="status" className="mt-2 text-xs opacity-60">
                    {t('writing.panel.links_loading')}
                </p>
            )}
            <div className="mt-2 max-h-44 overflow-y-auto">
                {links?.map((entry) => (
                    <div key={entry.id} data-section-linked-entry={entry.id} className="flex items-center gap-2 py-1">
                        <i
                            className={`${blueprintIconClass(entry.blueprint_icon)} w-4 text-center text-xs opacity-60`}
                            aria-hidden="true"
                        />
                        <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-0 flex-1 rounded px-1 py-1 text-xs hover:underline"
                        >
                            <span className="block truncate font-medium">{entry.name}</span>
                            {entry.blueprint_name && (
                                <span className="block truncate text-[11px] opacity-60">{entry.blueprint_name}</span>
                            )}
                        </a>
                        {canUpdate && (
                            <Tooltip
                                content={t('writing.panel.unlink_item').replace(':name', entry.name)}
                                placement="left"
                            >
                                <button
                                    type="button"
                                    disabled={busy}
                                    aria-label={t('writing.panel.unlink_item').replace(':name', entry.name)}
                                    className="alex-toolbar-btn inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs disabled:opacity-40"
                                    onClick={() => void updateLink(entry.id, true)}
                                >
                                    <i className="fa-solid fa-link-slash" aria-hidden="true" />
                                </button>
                            </Tooltip>
                        )}
                    </div>
                ))}
            </div>
            <EntryPickerModal
                open={picking}
                onClose={() => setPicking(false)}
                title={t('writing.panel.link_item')}
                projectId={project.id}
                disabledIds={links?.map((entry) => entry.id)}
                onPick={(entry) => void updateLink(entry.id)}
            />
        </section>
    );
}
