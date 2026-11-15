import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProperties } from "../api/client";
import Pagination from "../components/Pagination";
import PropertyCard from "../components/PropertyCard";
import PropertyFilters, { EMPTY_FILTERS, removeEmptyFilters } from "../components/PropertyFilters";
import "./ListingsPage.css";

const PER_PAGE_OPTIONS = [10, 20, 50];
const DEFAULT_PER_PAGE = 20;
const FILTER_KEYS = Object.keys(EMPTY_FILTERS);

function readFilters(searchParams) {
    return removeEmptyFilters(Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key)])));
}

function readPage(searchParams) {
    const page = Number(searchParams.get("page"));
    return Number.isInteger(page) && page > 0 ? page : 1;
}

function readPerPage(searchParams) {
    const perPage = Number(searchParams.get("perPage"));
    return PER_PAGE_OPTIONS.includes(perPage) ? perPage : DEFAULT_PER_PAGE;
}

function ListingsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const filters = readFilters(searchParams);
    const filtersKey = new URLSearchParams(filters).toString();
    const currentPage = readPage(searchParams);
    const itemsPerPage = readPerPage(searchParams);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const data = result && result.filtersKey === filtersKey ? result.body : null;

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);

        const params = {
            ...Object.fromEntries(new URLSearchParams(filtersKey)),
            limit: itemsPerPage,
            offset: (currentPage - 1) * itemsPerPage,
        };

        fetchProperties(params, { signal: controller.signal })
            .then((body) => {
                if (!controller.signal.aborted) setResult({ filtersKey, body });
            })
            .catch((err) => {
                if (err.name !== "AbortError") setError(err.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [filtersKey, currentPage, itemsPerPage, reloadKey]);

    const buildQuery = ({ nextFilters = filters, page = 1, perPage = itemsPerPage }) => {
        const next = new URLSearchParams(nextFilters);
        if (page > 1) next.set("page", String(page));
        if (perPage !== DEFAULT_PER_PAGE) next.set("perPage", String(perPage));
        return next;
    };

    const updateQuery = (changes) => setSearchParams(buildQuery(changes));
    const applyFilters = (nextFilters) => {
        const next = buildQuery({ nextFilters });
        if (next.toString() === searchParams.toString()) setReloadKey((key) => key + 1);
        else setSearchParams(next);
    };

    const handlePageChange = (page) => {
        updateQuery({ page });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleItemsPerPageChange = (event) => {
        updateQuery({ perPage: Number(event.target.value) });
    };

    const hasFilters = Object.keys(filters).length > 0;
    const totalPages = data ? Math.ceil(data.total / itemsPerPage) : 0;
    const firstShown = data ? data.offset + 1 : 0;
    const lastShown = data ? data.offset + data.results.length : 0;
    const pastLastPage = data && data.results.length === 0 && data.total > 0;

    return (
        <main className="listings-page">
            <div className="listings-page__header">
                <h1>Homes for sale</h1>
                <div className="listings-page__meta">
                    {data && !error && data.results.length > 0 && (
                        <p className="listings-page__count">
                            Showing {firstShown.toLocaleString()}-{lastShown.toLocaleString()} of{" "}
                            {data.total.toLocaleString()} properties
                        </p>
                    )}
                    <label className="listings-page__per-page">
                        Per page
                        <select value={itemsPerPage} onChange={handleItemsPerPageChange}>
                            {PER_PAGE_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>

            {/* Keyed by the applied filters so the form resets to them when they change */}
            <PropertyFilters
                key={filtersKey}
                initialValues={filters}
                onSearch={applyFilters}
                onClear={() => applyFilters({})}
            />

            {loading && !data && (
                <div className="listings-page__status" role="status">
                    <span className="listings-page__spinner" aria-hidden="true" />
                    Loading properties...
                </div>
            )}

            {!loading && error && (
                <div className="listings-page__error" role="alert">
                    <p><strong>Couldn't load properties.</strong> {error}</p>
                    <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
                        Try again
                    </button>
                </div>
            )}

            {!loading && !error && data && data.results.length === 0 && (
                <div className="listings-page__empty">
                    {pastLastPage ? (
                        <>
                            <p><strong>This page is past the end of the results.</strong></p>
                            <button type="button" onClick={() => handlePageChange(1)}>Go to page 1</button>
                        </>
                    ) : (
                        <>
                            <p><strong>No properties found.</strong></p>
                            <p>
                                {hasFilters
                                    ? "Nothing matches these filters. Try a wider price range, fewer beds or baths, or clear the filters."
                                    : "There are no properties to show right now."}
                            </p>
                        </>
                    )}
                </div>
            )}

            {!error && data && data.results.length > 0 && (
                <>
                    {/* Keep the current page on screen (dimmed) while the next page of the same search loads. */}
                    <div className={`listings-page__grid${loading ? " is-loading" : ""}`} aria-busy={loading}>
                        {data.results.map((property) => (
                            <PropertyCard key={property.id} property={property} />
                        ))}
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        disabled={loading}
                    />
                </>
            )}
        </main>
    );
}

export default ListingsPage;
