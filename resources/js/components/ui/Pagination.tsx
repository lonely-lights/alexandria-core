import { type CSSProperties } from 'react';
import useT from '@alexandria/hooks/useT';

interface PaginationProps {
    currentPage: number;
    lastPage: number;
    from: number | null;
    to: number | null;
    total: number;
    onPageChange: (page: number) => void;
}

const fadedText: CSSProperties = { color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)' };

export default function Pagination({ currentPage, lastPage, from, to, total, onPageChange }: PaginationProps) {
    const t = useT();

    // Hide entirely when there's nothing to paginate. `lastPage` may
    // arrive null/undefined from a failed or empty API response, in
    // which case `<= 1` is false (NaN comparison) — explicit checks
    // cover that path. `total === 0` covers the legitimate "search
    // returned zero results" case.
    if (!total || total === 0 || !lastPage || lastPage <= 1) return null;

    // Button structural + theme styling lives in pagination.css so the
    // CSS :hover rule can override the rest position cleanly. Inline
    // styles would win specificity and silently disable the hover.

    const showing = t('common.pagination.showing')
        .replace(':from', String(from ?? ''))
        .replace(':to', String(to ?? ''))
        .replace(':total', String(total));

    const pageOf = t('common.pagination.page')
        .replace(':current', String(currentPage))
        .replace(':last', String(lastPage));

    return (
        <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm" style={fadedText}>
                {showing}
            </p>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="alex-pagination-btn"
                    aria-label={t('common.pagination.first')}
                >
                    <i className="fa-solid fa-angles-left text-xs" />
                </button>
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="alex-pagination-btn"
                    aria-label={t('common.pagination.previous')}
                >
                    <i className="fa-solid fa-angle-left text-xs" />
                </button>
                <span className="px-3 text-sm">
                    {pageOf}
                </span>
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === lastPage}
                    className="alex-pagination-btn"
                    aria-label={t('common.pagination.next')}
                >
                    <i className="fa-solid fa-angle-right text-xs" />
                </button>
                <button
                    type="button"
                    onClick={() => onPageChange(lastPage)}
                    disabled={currentPage === lastPage}
                    className="alex-pagination-btn"
                    aria-label={t('common.pagination.last')}
                >
                    <i className="fa-solid fa-angles-right text-xs" />
                </button>
            </div>
        </div>
    );
}
