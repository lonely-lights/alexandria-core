import {
    inputStyle,
    listShellStyle,
    rowBorderStyle,
    subtitle30,
    subtitle40,
} from "./treeModalStyles";

export interface EntryLinkSearchResult {
    id: number;
    name: string;
    blueprint_name: string;
}

interface EntryLinkSearchProps {
    query: string;
    onQueryChange: (value: string) => void;
    results: EntryLinkSearchResult[];
    searching: boolean;
    placeholder: string;
    noResultsLabel: string;
    onSelect: (result: EntryLinkSearchResult) => void;
    autoFocus?: boolean;
}

/**
 * Debounced-search input + results list + no-results fallback.
 * Shared by the tree modals (AddEntryModal link mode, ConvertStubModal
 * link mode) so both surfaces stay in sync on layout, spinner placement,
 * and the empty-state threshold.
 *
 * Parent owns the debounce + fetch — this component is purely
 * presentational. Selecting a result fires `onSelect` and the parent
 * is expected to clear the query + results (this avoids the component
 * holding state that doesn't survive remounts).
 */
export default function EntryLinkSearch({
    query,
    onQueryChange,
    results,
    searching,
    placeholder,
    noResultsLabel,
    onSelect,
    autoFocus = true,
}: EntryLinkSearchProps) {
    return (
        <>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2"
                    style={inputStyle}
                    autoFocus={autoFocus}
                />
                {searching && (
                    <i
                        className="fa-solid fa-circle-notch fa-spin absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                        style={subtitle30}
                    />
                )}
            </div>

            {results.length > 0 && (
                <div
                    className="max-h-48 overflow-y-auto"
                    style={listShellStyle}
                >
                    {results.map((r, i) => {
                        const isLast = i === results.length - 1;
                        return (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => onSelect(r)}
                                className="alex-row flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                                style={isLast ? {} : rowBorderStyle}
                            >
                                <div>
                                    <p className="font-medium">{r.name}</p>
                                    <p className="text-xs" style={subtitle40}>
                                        {r.blueprint_name}
                                    </p>
                                </div>
                                <i
                                    className="fa-solid fa-check text-xs"
                                    style={subtitle30}
                                />
                            </button>
                        );
                    })}
                </div>
            )}

            {results.length === 0 && query.trim().length >= 2 && !searching && (
                <p className="text-center text-sm" style={subtitle40}>
                    {noResultsLabel}
                </p>
            )}
        </>
    );
}
