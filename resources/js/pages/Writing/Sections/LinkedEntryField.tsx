import { useEffect, useRef, useState, type CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import Input from '@alexandria/components/form/Input';

/**
 * LinkedEntryField — compendium-structure-tab (Task 12).
 *
 * Inline search-select for `WorkSettingsModal`'s "linked entry" field:
 * debounced search against the structure blueprint's entries (the
 * `entries-search` contract `LinkMoveModal` already uses), a "None"
 * clear row pinned to the top of the dropdown, and click-to-pick
 * semantics — free typing alone never changes the selected value,
 * only clicking a row (or "None") does. Blurring without a pick
 * reverts the input text back to the current selection's name.
 */

export interface LinkedEntryOption {
    id: number;
    name: string;
}

const dropdownStyle: CSSProperties = {
    background: 'var(--theme-surface-card)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
    boxShadow: '0 8px 24px color-mix(in srgb, black 15%, transparent)',
};

const rowDivider = '1px solid color-mix(in srgb, var(--theme-base-content) 6%, transparent)';

const emptyStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

export default function LinkedEntryField({
    projectId,
    blueprintId,
    value,
    onChange,
    error,
}: {
    projectId: number;
    blueprintId: number;
    value: LinkedEntryOption | null;
    onChange: (entry: LinkedEntryOption | null) => void;
    error?: string;
}) {
    const t = useT();
    const [query, setQuery] = useState(value?.name ?? '');
    const [results, setResults] = useState<LinkedEntryOption[]>([]);
    const [open, setOpen] = useState(false);
    const [searched, setSearched] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    // The parent can reset `value` out from under an open session (a
    // fresh work loaded into the same modal instance) — follow it.
    useEffect(() => {
        setQuery(value?.name ?? '');
    }, [value]);

    function runSearch(search: string) {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            fetch(
                `/api/v1/projects/${projectId}/blueprints/${blueprintId}/entries-search?search=${encodeURIComponent(search)}`,
                {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                },
            )
                .then((res) => (res.ok ? res.json() : []))
                .then((rows: LinkedEntryOption[]) => {
                    setResults(rows);
                    setSearched(true);
                })
                .catch(() => {
                    setResults([]);
                    setSearched(true);
                });
        }, 250);
    }

    function handleFocus() {
        setOpen(true);
        setSearched(false);
        runSearch(query);
    }

    function handleChange(next: string) {
        setQuery(next);
        setOpen(true);
        setSearched(false);
        runSearch(next);
    }

    function pick(entry: LinkedEntryOption | null) {
        onChange(entry);
        setQuery(entry?.name ?? '');
        setOpen(false);
    }

    return (
        <div className="relative">
            <Input
                label={t('writing.settings.linked_entry')}
                name="linked_entry"
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={handleFocus}
                // Delayed close so a row's onClick still fires before the
                // dropdown unmounts — the classic combobox blur race.
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                error={error}
                hint={t('writing.settings.linked_entry_help')}
                autoComplete="off"
                size="md"
            />
            {open && (
                <div
                    className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto py-1"
                    style={dropdownStyle}
                >
                    <button
                        type="button"
                        onClick={() => pick(null)}
                        className="alex-row block w-full px-3 py-2 text-left text-sm italic"
                        style={{ borderBottom: rowDivider }}
                    >
                        {t('writing.settings.linked_entry_none')}
                    </button>
                    {results.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            onClick={() => pick(entry)}
                            className="alex-row block w-full truncate px-3 py-2 text-left text-sm font-medium"
                        >
                            {entry.name}
                        </button>
                    ))}
                    {results.length === 0 && searched && (
                        <p className="px-3 py-2 text-xs" style={emptyStyle}>
                            {t('writing.panel.no_results')}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
