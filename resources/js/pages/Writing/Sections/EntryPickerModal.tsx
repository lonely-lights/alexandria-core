import { useEffect, useRef, useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import Input from '@alexandria/components/form/Input';
import Modal, { ModalHeader } from '@alexandria/components/ui/Modal';

/**
 * Single-pick entry chooser for the reference panel's POV/Setting
 * fields — Stage 8g.1 (Plan 3 Task 4). SearchableMultiSelectModal
 * filters a static items array client-side with multi-select
 * semantics, so this modal owns its own debounced server search
 * (same /api/v1/entries/search contract the Browse tab uses) and
 * resolves on the first row click.
 */

export interface EntrySearchRow {
    id: number;
    name: string;
    slug: string;
    blueprint_slug: string | null;
    blueprint_name: string | null;
    blueprint_icon: string | null;
}

/** Blueprint icons may arrive bare ('fa-cube') or styled ('fa-solid fa-cube'). */
export function blueprintIconClass(icon: string | null): string {
    if (!icon) {
        return 'fa-solid fa-cube';
    }

    return icon.includes(' ') ? icon : `fa-solid ${icon}`;
}

export async function searchEntries(projectId: number, query: string, limit = 15): Promise<EntrySearchRow[]> {
    const response = await fetch(
        `/api/v1/entries/search?q=${encodeURIComponent(query)}&project_id=${projectId}&limit=${limit}`,
        {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        },
    );

    if (!response.ok) {
        throw new Error(`Entry search failed: ${response.status}`);
    }

    const payload = (await response.json()) as { data?: EntrySearchRow[] };

    return payload.data ?? [];
}

const rowIconStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const rowSubStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
};

const hintStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 35%, transparent)',
};

export default function EntryPickerModal({
    open,
    onClose,
    title,
    projectId,
    onPick,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    projectId: number;
    onPick: (row: EntrySearchRow) => void;
}) {
    const t = useT();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<EntrySearchRow[]>([]);
    const [searched, setSearched] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clear a pending search on unmount so the stale timer never
    // fires into the dead instance.
    useEffect(() => {
        return () => {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (open) {
            setQuery('');
            setResults([]);
            setSearched(false);
        }
    }, [open]);

    function handleQueryChange(value: string) {
        setQuery(value);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        if (!value.trim()) {
            setResults([]);
            setSearched(false);
            return;
        }

        timerRef.current = setTimeout(() => {
            searchEntries(projectId, value.trim())
                .then((rows) => {
                    setResults(rows);
                    setSearched(true);
                })
                .catch(() => {
                    setResults([]);
                    setSearched(true);
                });
        }, 300);
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
            <ModalHeader title={title} onClose={onClose} />
            <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid var(--theme-base-300)' }}
            >
                <Input
                    type="text"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder={t('writing.panel.search_placeholder')}
                    autoFocus
                    icon="fa-solid fa-magnifying-glass"
                    size="sm"
                />
            </div>
            <div className="max-h-72 flex-1 overflow-y-auto py-1">
                {results.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs" style={hintStyle}>
                        {query.trim() && searched
                            ? t('writing.panel.no_results')
                            : t('writing.panel.search_hint')}
                    </p>
                ) : (
                    results.map((row) => (
                        <button
                            key={row.id}
                            type="button"
                            onClick={() => onPick(row)}
                            className="alex-row flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm"
                        >
                            <i
                                className={`${blueprintIconClass(row.blueprint_icon)} w-4 shrink-0 text-center text-xs`}
                                style={rowIconStyle}
                                aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
                            {row.blueprint_name && (
                                <span className="shrink-0 text-[11px]" style={rowSubStyle}>
                                    {row.blueprint_name}
                                </span>
                            )}
                        </button>
                    ))
                )}
            </div>
        </Modal>
    );
}
