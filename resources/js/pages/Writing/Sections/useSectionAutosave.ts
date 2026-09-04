import { useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { worksBase } from '@alexandria/lib/urls';
import type { CurrentSection } from '../Workspace';
import { SectionSaveQueue } from './SectionSaveQueue';
import type { SectionSaveCounts } from './SectionSaveQueue';
import { WritingSaveContext } from './WritingSaveContext';

export type { SaveStatus } from './SectionSaveQueue';
export type SectionCountsCallback = (
    sectionId: number,
    sectionWords: number,
    workWords: number,
    pages: number | null,
) => void;

interface UseSectionAutosaveArgs {
    projectSlug: string;
    workSlug: string;
    section: CurrentSection;
    onCounts: SectionCountsCallback;
}

/** Thin React adapter: both editors use the same ordered, retryable save queue. */
export default function useSectionAutosave({
    projectSlug,
    workSlug,
    section,
    onCounts,
}: UseSectionAutosaveArgs) {
    const coordinator = useContext(WritingSaveContext);
    const session = useMemo(() => {
        const create = (notify?: () => void) =>
            new SectionSaveQueue(
                section.id,
                section.title,
                section.content ?? '',
                section.word_count,
                async (content, keepalive) => {
                    const response = await fetch(
                        `${worksBase(projectSlug, workSlug)}/sections/${section.id}/content`,
                        {
                            method: 'PUT',
                            credentials: 'same-origin',
                            keepalive,
                            headers: {
                                'Content-Type': 'application/json',
                                Accept: 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                                'X-CSRF-TOKEN':
                                    document
                                        .querySelector(
                                            'meta[name="csrf-token"]',
                                        )
                                        ?.getAttribute('content') ?? '',
                            },
                            body: JSON.stringify({ content }),
                        },
                    );

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const counts: SectionSaveCounts = await response.json();

                    if (
                        !Number.isFinite(counts.word_count) ||
                        !Number.isFinite(counts.work_word_count)
                    ) {
                        throw new Error('Invalid save response');
                    }

                    return counts;
                },
                notify,
            );

        return coordinator?.get(section.id, create) ?? create();
        // Same-section props must not replace text being edited; remounts can recover queued text.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coordinator, projectSlug, workSlug, section.id]);
    const snapshot = useSyncExternalStore(
        session.subscribe,
        session.getSnapshot,
        session.getSnapshot,
    );
    const initialContent = useMemo(() => session.content, [session]);

    useEffect(() => {
        session.updateMetadata(section.title, (counts) =>
            onCounts(
                section.id,
                counts.word_count,
                counts.work_word_count,
                counts.page_estimate,
            ),
        );
    }, [session, section.id, section.title, onCounts]);

    useEffect(() => {
        return () => {
            void session.flush();
        };
    }, [session]);

    return {
        ...snapshot,
        noteChange: session.noteChange,
        initialContent,
        retry: session.flush,
    };
}
