import { useEffect, useState } from "react";
import { fetchProperties } from "../api/client";
import Pagination from "../components/Pagination";
import PropertyCard from "../components/PropertyCard";
import PropertyFilters from "../components/PropertyFilters";
import "./ListingsPage.css";

const PAGE_SIZE = 20;

function ListingsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);

        const params = { ...filters, limit: PAGE_SIZE, offset: (currentPage - 1) * PAGE_SIZE };

        fetchProperties(params, { signal: controller.signal })
            .then((body) => {
                if (!controller.signal.aborted) setData(body);
            })
            .catch((err) => {
                if (err.name !== "AbortError") setError(err.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [filters, currentPage, reloadKey]);

    const applyFilters = (nextFilters) => {
        setFilters(nextFilters);
        setCurrentPage(1);
        setData(null);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const hasFilters = Object.keys(filters).length > 0;
    const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
    const firstShown = data ? data.offset + 1 : 0;
    const lastShown = data ? data.offset + data.results.length : 0;

    return (
        <main className="listings-page">
            <div className="listings-page__header">
                <h1>Homes for sale</h1>
                {data && !error && data.results.length > 0 && (
                    <p className="listings-page__count">
                        Showing {firstShown.toLocaleString()}-{lastShown.toLocaleString()} of{" "}
                        {data.total.toLocaleString()} properties
                    </p>
                )}
            </div>

            <PropertyFilters onSearch={applyFilters} onClear={() => applyFilters({})} />

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
                    <p><strong>No properties found.</strong></p>
                    <p>
                        {hasFilters
                            ? "Nothing matches these filters. Try a wider price range, fewer beds or baths, or clear the filters."
                            : "There are no properties to show right now."}
                    </p>
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
