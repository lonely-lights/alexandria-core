import {
    microText,
    muteText,
    rowDivider,
    scrollingListWrapperStyle,
} from '@alexandria/components/notes/modals/linkMoveStyles';
import type { SectionTarget } from '@alexandria/components/notes/modals/WorkSectionPicker';
import useT from '@alexandria/hooks/useT';
import { useEffect, useState } from 'react';

export interface SectionSearchHit extends SectionTarget {
    work_id: number;
    work_title: string;
}

interface SectionSearchResultsProps {
    projectId: number;
    query: string;
    onPick: (hit: SectionSearchHit) => void;
}

/** Below this, typing is still ambiguous and a search costs more than it returns. */
const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;
const PATH_SEPARATOR = ' › ';

/**
 * Section hits under LinkMoveModal's destination search. Typing a scene or
 * chapter name should find it directly, instead of making the writer guess
 * which work holds it and drill in. Picking a hit selects both its work and
 * the section in one step.
 */
export default function SectionSearchResults({ projectId, query, onPick }: SectionSearchResultsProps) {
    const t = useT();
    const [hits, setHits] = useState<{ query: string; rows: SectionSearchHit[] }>({ query: '', rows: [] });
    const trimmed = query.trim();

    useEffect(() => {
        if (trimmed.length < MIN_SEARCH_LENGTH) {
            return;
        }

        const timer = setTimeout(() => {
            fetch(`/api/v1/projects/${projectId}/section-targets?search=${encodeURIComponent(trimmed)}`, {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            })
                .then((r) => r.ok ? r.json() : [])
                .then((rows: SectionSearchHit[]) => setHits({ query: trimmed, rows }))
                .catch(() => setHits({ query: trimmed, rows: [] }));
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [projectId, trimmed]);

    // Hits are tagged with the query that produced them, so a slow response
    // for an earlier query never renders under the current one.
    const rows = trimmed.length >= MIN_SEARCH_LENGTH && hits.query === trimmed ? hits.rows : [];

    if (rows.length === 0) {
        return null;
    }

    return (
        <div className="mt-3">
            <p className="mb-1 text-xs font-semibold" style={muteText}>
                {t('notes.link_move.section.results')}
            </p>
            <div className="max-h-48" style={scrollingListWrapperStyle}>
                {rows.map((hit, idx) => (
                    <button
                        key={hit.id}
                        type="button"
                        data-section-search-hit={hit.id}
                        onClick={() => onPick(hit)}
                        className="alex-notes-tag-row flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm"
                        style={idx === rows.length - 1 ? undefined : { borderBottom: rowDivider }}
                    >
                        <i className="fa-solid fa-bookmark text-xs" style={microText} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{hit.title}</span>
                            <span className="block truncate text-[10px]" style={microText}>
                                {[hit.work_title, ...hit.path].join(PATH_SEPARATOR)}
                            </span>
                        </span>
                        {hit.label && (
                            <span className="shrink-0 text-[10px]" style={microText}>{hit.label}</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
