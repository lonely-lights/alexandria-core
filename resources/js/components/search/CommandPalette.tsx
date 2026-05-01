import {
    useState,
    useEffect,
    useRef,
    useCallback,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import type {
    PaletteCommand,
    PaletteSearchEntry,
    PaletteSearchResults,
} from '../../types/navigation';

interface CommandPaletteProps {
    /** Open / closed state — controlled by the consumer. */
    open: boolean;
    /** Called when the palette wants to close (Esc, backdrop, after select). */
    onClose: () => void;

    /**
     * Optional static command list rendered when the input is empty (and used
     * as the source for fuzzy filtering when the consumer does NOT supply an
     * `onSearch` handler). Useful for app-level shortcuts like "Toggle theme",
     * "Go to dashboard", etc.
     */
    commands?: PaletteCommand[];

    /**
     * Optional async search handler. Receives the query string and returns a
     * grouped result set. When supplied, the palette switches into search
     * mode the moment the user types ≥ 2 characters; the static `commands`
     * list (if any) is shown only when the input is empty.
     *
     * Consumer is responsible for the actual search (HTTP, local index,
     * etc.) — the palette only orchestrates the UI.
     */
    onSearch?: (query: string) => Promise<PaletteSearchResults>;

    /**
     * Optional select handler. Fires when the user activates a search-result
     * entry (Enter or click). Defaults to navigating to `entry.href` via
     * `window.location.href`. Override if you want client-side routing.
     */
    onSelectEntry?: (entry: PaletteSearchEntry) => void;

    /** Placeholder text for the search input. */
    placeholder?: string;

    /** Empty-state text shown when the input is empty and no `commands` are
     *  available. */
    emptyHint?: ReactNode;

    /** Debounce window for `onSearch` calls (ms). Defaults to 250. */
    searchDebounceMs?: number;

    /** Minimum query length before `onSearch` fires. Defaults to 2. */
    minQueryLength?: number;
}

/**
 * Modal command palette: a Cmd+K-style overlay with a search input, scrolling
 * results list, keyboard navigation, and a footer hint row. The consumer
 * supplies the actual commands and/or search handler.
 *
 * Visual chrome (modal, animations, keyboard nav, sticky group headers,
 * footer kbd hints) is core. The command set, the search backend, and the
 * navigation behaviour are consumer-supplied.
 *
 * Pair with the `useCmdK` hook to wire Cmd+K / Ctrl+K to `setOpen(true)`.
 */
export default function CommandPalette({
    open,
    onClose,
    commands,
    onSearch,
    onSelectEntry,
    placeholder = 'Search...',
    emptyHint,
    searchDebounceMs = 250,
    minQueryLength = 2,
}: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PaletteSearchResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const backdropRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closingRef = useRef(false);

    // Decide what to render in the body — search results take priority once
    // the user types past the threshold. Otherwise show the static command
    // list (if supplied).
    const showingSearch = query.length >= minQueryLength && !!onSearch;

    const filteredCommands: PaletteCommand[] = (() => {
        if (!commands?.length) return [];
        if (!query) return commands;
        const q = query.toLowerCase();
        return commands.filter((c) => {
            const haystack = [
                c.label,
                c.description ?? '',
                c.section ?? '',
                ...(c.keywords ?? []),
            ].join(' ').toLowerCase();
            return haystack.includes(q);
        });
    })();

    // Flatten search results for keyboard navigation
    const flatEntries = results?.groups.flatMap((g) =>
        g.entries.map((e) => ({ ...e, groupLabel: g.label })),
    ) ?? [];

    const flatNavigableLength = showingSearch ? flatEntries.length : filteredCommands.length;

    // Animate in
    useEffect(() => {
        if (!open) return;
        closingRef.current = false;
        setQuery('');
        setResults(null);
        setSelectedIndex(0);

        requestAnimationFrame(() => {
            inputRef.current?.focus();
            if (backdropRef.current) {
                gsap.fromTo(
                    backdropRef.current,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.15, ease: 'power2.out' },
                );
            }
            if (panelRef.current) {
                gsap.fromTo(
                    panelRef.current,
                    { opacity: 0, y: -20, scale: 0.97 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'back.out(1.4)' },
                );
            }
        });
    }, [open]);

    const animateClose = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;

        const tl = gsap.timeline({ onComplete: onClose });
        if (panelRef.current) {
            tl.to(
                panelRef.current,
                { opacity: 0, y: -10, scale: 0.98, duration: 0.15, ease: 'power2.in' },
                0,
            );
        }
        if (backdropRef.current) {
            tl.to(backdropRef.current, { opacity: 0, duration: 0.15, ease: 'power2.in' }, 0);
        }
    }, [onClose]);

    // Search
    const performSearch = useCallback(
        (q: string) => {
            if (!onSearch) return;
            if (q.length < minQueryLength) {
                setResults(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            onSearch(q)
                .then((data) => {
                    setResults(data);
                    setSelectedIndex(0);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        },
        [onSearch, minQueryLength],
    );

    function handleInputChange(value: string) {
        setQuery(value);
        setSelectedIndex(0);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (onSearch) {
            debounceRef.current = setTimeout(() => performSearch(value), searchDebounceMs);
        }
    }

    function activateCommand(cmd: PaletteCommand) {
        if (cmd.action) {
            cmd.action();
            animateClose();
            return;
        }
        if (cmd.href) {
            if (onSelectEntry) {
                onSelectEntry({ id: cmd.id, label: cmd.label, href: cmd.href });
            } else {
                window.location.href = cmd.href;
            }
        }
    }

    function activateSearchEntry(entry: PaletteSearchEntry) {
        if (onSelectEntry) {
            onSelectEntry(entry);
            return;
        }
        window.location.href = entry.href;
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            e.preventDefault();
            animateClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, flatNavigableLength - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (showingSearch && flatEntries[selectedIndex]) {
                const { groupLabel: _ignored, ...entry } = flatEntries[selectedIndex];
                void _ignored;
                activateSearchEntry(entry);
            } else if (!showingSearch && filteredCommands[selectedIndex]) {
                activateCommand(filteredCommands[selectedIndex]);
            }
        }
    }

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                ref={backdropRef}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={animateClose}
            />

            <div
                ref={panelRef}
                className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-base-content/10 bg-base-200 shadow-2xl"
            >
                {/* Search input */}
                <div className="flex items-center gap-3 border-b border-base-content/10 px-4 py-3">
                    <i
                        className={`fa-solid fa-magnifying-glass ${loading ? 'animate-pulse' : ''} text-base-content/40`}
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent text-lg outline-none placeholder:text-base-content/30"
                        placeholder={placeholder}
                    />
                    <kbd className="kbd kbd-sm text-xs">ESC</kbd>
                </div>

                {/* Body */}
                <div className="max-h-[50vh] overflow-y-auto">
                    {/* Empty-input state */}
                    {!query && filteredCommands.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-base-content/40">
                            <i className="fa-solid fa-magnifying-glass mb-2 text-2xl" />
                            {emptyHint ?? <p>Start typing to search</p>}
                        </div>
                    )}

                    {/* Static command list (when no onSearch is supplied or
                        the input is below the search threshold) */}
                    {!showingSearch &&
                        filteredCommands.length > 0 &&
                        renderCommandList(filteredCommands, selectedIndex, (i) => setSelectedIndex(i), activateCommand)}

                    {/* Search results */}
                    {showingSearch && !loading && results && results.total === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-base-content/40">
                            <i className="fa-solid fa-search-minus mb-2 text-2xl" />
                            <p>No results for &quot;{query}&quot;</p>
                        </div>
                    )}

                    {showingSearch && results && results.total > 0 && results.groups.map((group) => {
                        const groupIcon = renderIcon(group.icon, 'fa-solid fa-cube');

                        return (
                            <div key={group.label}>
                                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur-sm">
                                    {groupIcon}
                                    {group.label}
                                </div>
                                {group.entries.map((entry) => {
                                    const globalIdx = flatEntries.findIndex((e) => e.id === entry.id);
                                    const isSelected = globalIdx === selectedIndex;

                                    return (
                                        <a
                                            key={entry.id}
                                            href={entry.href}
                                            className={`flex flex-col gap-1 px-4 py-3 transition-colors ${
                                                isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-base-300/50'
                                            }`}
                                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                                            onClick={(e) => {
                                                if (onSelectEntry) {
                                                    e.preventDefault();
                                                    onSelectEntry(entry);
                                                }
                                            }}
                                        >
                                            <span className="font-medium leading-snug">{entry.label}</span>
                                            {entry.description && (
                                                <span className="line-clamp-2 text-xs leading-snug text-base-content/50">
                                                    {entry.description}
                                                </span>
                                            )}
                                        </a>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-base-content/10 px-4 py-2 text-xs text-base-content/40">
                    <div className="flex items-center gap-3">
                        <span><kbd className="kbd kbd-xs">↑↓</kbd> navigate</span>
                        <span><kbd className="kbd kbd-xs">↵</kbd> open</span>
                    </div>
                    {showingSearch && results && (
                        <span>
                            {results.total} result{results.total !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}

/**
 * Renders a flat (un-grouped) list of static commands. We split this out so
 * the main render stays readable and the keyboard-nav indices line up with
 * `filteredCommands`.
 */
function renderCommandList(
    commands: PaletteCommand[],
    selectedIndex: number,
    setSelectedIndex: (i: number) => void,
    activate: (cmd: PaletteCommand) => void,
): ReactNode {
    // Group by `section` while preserving insertion order.
    const sections: Array<{ label: string | null; commands: Array<{ cmd: PaletteCommand; index: number }> }> = [];
    commands.forEach((cmd, index) => {
        const label = cmd.section ?? null;
        const existing = sections.find((s) => s.label === label);
        if (existing) {
            existing.commands.push({ cmd, index });
        } else {
            sections.push({ label, commands: [{ cmd, index }] });
        }
    });

    return sections.map((section, sIdx) => (
        <div key={section.label ?? `__nosection_${sIdx}`}>
            {section.label && (
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur-sm">
                    {section.label}
                </div>
            )}
            {section.commands.map(({ cmd, index }) => {
                const isSelected = index === selectedIndex;
                const icon = renderIcon(cmd.icon, null);
                const disabled = cmd.action == null && !cmd.href;

                return (
                    <button
                        key={cmd.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => activate(cmd)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors disabled:opacity-50 ${
                            isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-base-300/50'
                        }`}
                    >
                        {icon && <span className="w-5 text-center">{icon}</span>}
                        <span className="flex flex-1 flex-col gap-1">
                            <span className="font-medium leading-snug">{cmd.label}</span>
                            {cmd.description && (
                                <span className="line-clamp-2 text-xs leading-snug text-base-content/50">
                                    {cmd.description}
                                </span>
                            )}
                        </span>
                    </button>
                );
            })}
        </div>
    ));
}

/** Renders a string-as-FA-class icon, a ReactNode icon, or the fallback. */
function renderIcon(icon: ReactNode | string | undefined, fallbackClass: string | null): ReactNode {
    if (icon == null || icon === '') {
        return fallbackClass ? <i className={`${fallbackClass} text-[10px]`} /> : null;
    }
    if (typeof icon === 'string') {
        const cls = icon.includes(' ') ? icon : `fa-solid ${icon}`;
        return <i className={`${cls} text-[10px]`} />;
    }
    return icon;
}
