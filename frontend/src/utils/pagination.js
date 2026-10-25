export const ELLIPSIS = "...";

function range(start, end) {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

// First and last page are always shown exactly once.
export function getPageNumbers(currentPage, totalPages) {
    if (totalPages <= 7) return range(1, totalPages);
    if (currentPage <= 4) return [...range(1, 5), ELLIPSIS, totalPages];
    if (currentPage >= totalPages - 3) return [1, ELLIPSIS, ...range(totalPages - 4, totalPages)];
    return [1, ELLIPSIS, currentPage - 1, currentPage, currentPage + 1, ELLIPSIS, totalPages];
}
