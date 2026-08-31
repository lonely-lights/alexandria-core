import type { CSSProperties, ReactNode } from 'react';
import Tooltip from '@alexandria/components/ui/Tooltip';
import useT from '@alexandria/hooks/useT';

interface NotesToolbarProps {
    /** View toggle only renders when a Grid view is available (owner
     * ruling, 2026-08-31: a bare core install with no gridView slot keeps
     * the pre-unification single-view layout). */
    showViewToggle: boolean;
    viewMode: 'list' | 'grid';
    onViewModeChange: (mode: 'list' | 'grid') => void;
    search: string;
    onSearchChange: (value: string) => void;
    onOpenFilters: () => void;
    hasActiveFilters: boolean;
    activeFilterCount: number;
    /** Active-filter dismiss chips, rendered right after the Filters
     * button (NotesFilterChips). */
    filterChips?: ReactNode;
    /** Scope pills only render when the caller supplies onScopeChange —
     * the drawer's notable-scoped NotesView never does (scope doesn't
     * apply there), so it renders no pills, matching its pre-unification
     * behavior exactly. */
    showScopePills: boolean;
    scope: 'all' | 'root';
    onScopeChange: (scope: 'all' | 'root') => void;
    /** View-specific slot: List = Compact toggle + column-settings icon,
     * Grid = "Showing N of M notes" count. */
    extras?: ReactNode;
}

const searchInputStyle: CSSProperties = {
    background: 'var(--theme-base-surface)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: 'var(--theme-radius-input)',
    color: 'var(--theme-base-content)',
};

/**
 * The Notes Dashboard's unified toolbar row (owner ruling, 2026-08-31):
 * replaces the old two-row layout (view toggle + scope pills on one row,
 * search/filters/compact/columns — or capture/search/count for Grid — on
 * a second, view-specific row) with a single row of identical anatomy in
 * both views: view toggle, search, Filters, active-filter chips, scope
 * pills, and a view-specific extras slot.
 *
 * Rendered once, by whichever of NotesView (List) or KeepGrid (Grid) is
 * currently mounted — the two views swap via a ternary in NotesDashboard,
 * so only one of them (and therefore only one toolbar) is ever in the DOM
 * at a time. Search is the one piece of state that's genuinely lifted and
 * shared across both (NotesDashboard owns it); filters, scope, and view
 * mode are passed straight through from whichever parent state already
 * owns them.
 */
export default function NotesToolbar({
    showViewToggle,
    viewMode,
    onViewModeChange,
    search,
    onSearchChange,
    onOpenFilters,
    hasActiveFilters,
    activeFilterCount,
    filterChips,
    showScopePills,
    scope,
    onScopeChange,
    extras,
}: NotesToolbarProps) {
    const t = useT();

    const filtersBtnStyle: CSSProperties = {
        background: hasActiveFilters ? 'var(--theme-brand-secondary-500)' : 'transparent',
        color: hasActiveFilters
            ? 'var(--theme-brand-secondary-content)'
            : 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
        borderRadius: 'var(--theme-radius-button)',
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            {showViewToggle && (
                <div
                    className="inline-flex items-center gap-1"
                    role="group"
                    aria-label={t('notes.view.grid_aria')}
                >
                    <button
                        type="button"
                        onClick={() => onViewModeChange('list')}
                        className={`alex-notes-tab alex-notes-tab--icon-only ${viewMode === 'list' ? 'alex-notes-tab--active' : ''}`}
                        aria-label={t('notes.view.list_aria')}
                        aria-pressed={viewMode === 'list'}
                        title={t('notes.view.list')}
                    >
                        <i className="fa-solid fa-list text-xs" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onViewModeChange('grid')}
                        className={`alex-notes-tab alex-notes-tab--icon-only ${viewMode === 'grid' ? 'alex-notes-tab--active' : ''}`}
                        aria-label={t('notes.view.grid_aria')}
                        aria-pressed={viewMode === 'grid'}
                        title={t('notes.view.grid')}
                    >
                        <i className="fa-solid fa-table-cells-large text-xs" aria-hidden="true" />
                    </button>
                </div>
            )}

            <input
                type="text"
                placeholder={t('notes.list.search_placeholder')}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="min-w-0 flex-1 px-3 py-1.5 text-xs sm:max-w-56 sm:flex-initial sm:text-sm"
                style={searchInputStyle}
            />

            <Tooltip content={t('notes.list.filters.tooltip')} placement="bottom">
                <button
                    type="button"
                    onClick={onOpenFilters}
                    className="inline-flex flex-shrink-0 items-center gap-1.5 px-2 py-1 text-[11px] font-medium transition-colors sm:px-2.5 sm:text-xs"
                    style={filtersBtnStyle}
                >
                    <i className="fa-solid fa-filter text-[10px]" />
                    {t('notes.list.filters.button')}
                    {hasActiveFilters && (
                        <span
                            className="inline-flex items-center px-1.5 py-0 text-[10px] font-semibold"
                            style={{
                                background:
                                    'color-mix(in srgb, var(--theme-brand-secondary-content) 20%, transparent)',
                                color: 'var(--theme-brand-secondary-content)',
                                borderRadius: 'var(--theme-radius-badge)',
                            }}
                        >
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </Tooltip>

            {filterChips}

            {/* Spacer — pushes the scope pills + view-specific extras to
                the row's right edge, matching the owner-approved anatomy
                (search/filters/chips left, scope + extras right). */}
            <div className="ml-auto flex flex-shrink-0 flex-wrap items-center gap-2 sm:gap-3">
                {showScopePills && (
                    <div
                        className="inline-flex items-center gap-1"
                        role="group"
                        aria-label={t('notes.scope.group_aria')}
                    >
                        <button
                            type="button"
                            onClick={() => onScopeChange('all')}
                            className={`alex-notes-tab ${scope === 'all' ? 'alex-notes-tab--active' : ''}`}
                            aria-label={t('notes.scope.all_aria')}
                            aria-pressed={scope === 'all'}
                        >
                            {t('notes.scope.all')}
                        </button>
                        <button
                            type="button"
                            onClick={() => onScopeChange('root')}
                            className={`alex-notes-tab ${scope === 'root' ? 'alex-notes-tab--active' : ''}`}
                            aria-label={t('notes.scope.root_aria')}
                            aria-pressed={scope === 'root'}
                        >
                            {t('notes.scope.root')}
                        </button>
                    </div>
                )}

                {extras}
            </div>
        </div>
    );
}
