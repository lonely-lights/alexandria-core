interface PaginationProps {
    currentPage: number;
    lastPage: number;
    from: number | null;
    to: number | null;
    total: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, lastPage, from, to, total, onPageChange }: PaginationProps) {
    // Hide entirely when there's nothing to paginate. `lastPage` may
    // arrive null/undefined from a failed or empty API response, in
    // which case `<= 1` is false (NaN comparison) — explicit checks
    // cover that path. `total === 0` covers the legitimate "search
    // returned zero results" case.
    if (!total || total === 0 || !lastPage || lastPage <= 1) return null;

    return (
        <div className="flex items-center justify-between rounded-2xl border border-base-300 bg-base-100 px-4 py-3">
            <p className="text-sm text-base-content/50">
                Showing {from}&ndash;{to} of {total}
            </p>
            <div className="flex gap-1">
                <button type="button" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="btn btn-ghost btn-sm rounded-lg disabled:opacity-30">
                    <i className="fa-solid fa-angles-left text-xs" />
                </button>
                <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="btn btn-ghost btn-sm rounded-lg disabled:opacity-30">
                    <i className="fa-solid fa-angle-left text-xs" />
                </button>
                <span className="flex items-center px-3 text-sm">
                    Page {currentPage} of {lastPage}
                </span>
                <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === lastPage} className="btn btn-ghost btn-sm rounded-lg disabled:opacity-30">
                    <i className="fa-solid fa-angle-right text-xs" />
                </button>
                <button type="button" onClick={() => onPageChange(lastPage)} disabled={currentPage === lastPage} className="btn btn-ghost btn-sm rounded-lg disabled:opacity-30">
                    <i className="fa-solid fa-angles-right text-xs" />
                </button>
            </div>
        </div>
    );
}
