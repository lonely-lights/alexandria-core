import { useId, useMemo, useState } from 'react';
import useT from '@alexandria/hooks/useT';
import { searchSettings, type NavItem } from '../nav-config';

interface SettingsSearchProps {
    nav: NavItem[];
    onSelect: (key: string) => void;
    onSearchingChange?: (searching: boolean) => void;
    sticky?: boolean;
}

/**
 * Shared desktop/mobile settings search. Results represent complete
 * settings sections: matching "Font Size" offers Appearance, and
 * selecting it opens Appearance with every control still in context.
 */
export default function SettingsSearch({
    nav,
    onSelect,
    onSearchingChange,
    sticky = false,
}: SettingsSearchProps) {
    const t = useT();
    const [query, setQuery] = useState('');
    const resultsId = useId();
    const results = useMemo(() => searchSettings(nav, query).slice(0, 8), [nav, query]);
    const searching = query.trim().length > 0;

    function updateQuery(next: string) {
        setQuery(next);
        onSearchingChange?.(next.trim().length > 0);
    }

    function selectSection(key: string) {
        updateQuery('');
        onSelect(key);
    }

    return (
        <div
            className={sticky ? 'sticky top-0 z-10 px-3 pb-2 pt-3' : 'px-3 pb-2 pt-3'}
            style={{ background: 'var(--theme-base-page)' }}
        >
            <label htmlFor={`${resultsId}-input`} className="sr-only">
                {t('settings.search.label')}
            </label>
            <div className="relative">
                <i
                    className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs"
                    style={{ color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)' }}
                    aria-hidden="true"
                />
                <input
                    id={`${resultsId}-input`}
                    type="search"
                    value={query}
                    onChange={(event) => updateQuery(event.target.value)}
                    placeholder={t('settings.search.placeholder')}
                    aria-controls={searching ? resultsId : undefined}
                    className="alex-input py-2 text-sm"
                    style={{
                        paddingLeft: '2.25rem',
                        paddingRight: '2.25rem',
                    }}
                />
                {searching && (
                    <button
                        type="button"
                        onClick={() => updateQuery('')}
                        aria-label={t('settings.search.clear')}
                        className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full"
                        style={{ color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)' }}
                    >
                        <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
                    </button>
                )}
            </div>

            {searching && (
                <div
                    id={resultsId}
                    className="mt-2 overflow-hidden"
                    style={{
                        border: '1px solid color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
                        borderRadius: 'var(--theme-radius-card)',
                        background: 'var(--theme-base-surface)',
                    }}
                    aria-live="polite"
                >
                    {results.length > 0 ? (
                        <ul className="m-0 list-none">
                            {results.map(({ group, item, matchingTerms }, index) => (
                                <li
                                    key={item.key}
                                    style={index > 0 ? {
                                        borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                                    } : undefined}
                                >
                                    <button
                                        type="button"
                                        onClick={() => selectSection(item.key)}
                                        className="alex-settings-row flex w-full items-center gap-3 px-3 py-2.5 text-left"
                                        style={{ color: 'var(--theme-base-content)' }}
                                    >
                                        <i
                                            className={`fa-solid ${item.icon} w-5 text-center`}
                                            style={{ color: 'var(--theme-brand-primary-500)' }}
                                            aria-hidden="true"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold">{item.label}</span>
                                            <span
                                                className="block truncate text-[11px]"
                                                style={{ color: 'color-mix(in srgb, var(--theme-base-content) 52%, transparent)' }}
                                            >
                                                {group.label} &rsaquo; {item.label}
                                                {matchingTerms[0] ? ` · ${matchingTerms[0]}` : ''}
                                            </span>
                                        </span>
                                        <i
                                            className="fa-solid fa-arrow-right text-[10px]"
                                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 32%, transparent)' }}
                                            aria-hidden="true"
                                        />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p
                            className="px-3 py-4 text-center text-xs"
                            style={{ color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)' }}
                        >
                            {t('settings.search.empty')}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
