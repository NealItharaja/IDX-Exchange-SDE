import { ELLIPSIS, getPageNumbers } from "../utils/pagination";
import "./Pagination.css";

function Pagination({ currentPage, totalPages, onPageChange, disabled = false }) {
    if (totalPages <= 1) {
        return null;
    }

    const pages = getPageNumbers(currentPage, totalPages);

    return (
        <nav className="pagination" aria-label="Pagination">
            <button
                type="button"
                className="pagination__button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={disabled || currentPage === 1}
            >
                Previous
            </button>

            <ul className="pagination__pages">
                {pages.map((page, index) =>
                    page === ELLIPSIS ? (
                        <li key={`ellipsis-${index}`} className="pagination__ellipsis" aria-hidden="true">
                            ...
                        </li>
                    ) : (
                        <li key={page}>
                            <button
                                type="button"
                                className={`pagination__button pagination__page${page === currentPage ? " is-active" : ""}`}
                                onClick={() => onPageChange(page)}
                                disabled={disabled}
                                aria-current={page === currentPage ? "page" : undefined}
                                aria-label={`Page ${page}`}
                            >
                                {page.toLocaleString()}
                            </button>
                        </li>
                    ),
                )}
            </ul>

            <button
                type="button"
                className="pagination__button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={disabled || currentPage === totalPages}
            >
                Next
            </button>
        </nav>
    );
}

export default Pagination;
