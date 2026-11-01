import { useState } from "react";
import "./PropertyFilters.css";

export const EMPTY_FILTERS = {
    city: "",
    zipcode: "",
    minPrice: "",
    maxPrice: "",
    beds: "",
    baths: "",
};

const BED_OPTIONS = ["1", "2", "3", "4", "5"];
const BATH_OPTIONS = ["1", "1.5", "2", "3", "4"];

export function removeEmptyFilters(filters) {
    const cleaned = {};
    for (const [key, value] of Object.entries(filters)) {
        const trimmed = String(value ?? "").trim();
        if (trimmed !== "") cleaned[key] = trimmed;
    }
    return cleaned;
}

function PropertyFilters({ onSearch, onClear }) {
    const [values, setValues] = useState(EMPTY_FILTERS);
    const [error, setError] = useState(null);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setValues((current) => ({ ...current, [name]: value }));
        setError(null);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const filters = removeEmptyFilters(values);

        if (filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice)) {
            setError("Min price can't be more than max price.");
            return;
        }
        onSearch(filters);
    };

    const handleClear = () => {
        setValues(EMPTY_FILTERS);
        setError(null);
        onClear();
    };

    return (
        <form className="property-filters" onSubmit={handleSubmit} aria-label="Property filters">
            <div className="property-filters__fields">
                <label className="property-filters__field">
                    <span>City</span>
                    <input name="city" type="text" placeholder="e.g. Irvine" value={values.city} onChange={handleChange} />
                </label>

                <label className="property-filters__field">
                    <span>ZIP code</span>
                    <input
                        name="zipcode"
                        type="text"
                        inputMode="numeric"
                        pattern="\d{5}"
                        maxLength={5}
                        title="5 digit ZIP code"
                        placeholder="e.g. 92618"
                        value={values.zipcode}
                        onChange={handleChange}
                    />
                </label>

                <label className="property-filters__field">
                    <span>Min price</span>
                    <input
                        name="minPrice"
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="No min"
                        value={values.minPrice}
                        onChange={handleChange}
                    />
                </label>

                <label className="property-filters__field">
                    <span>Max price</span>
                    <input
                        name="maxPrice"
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="No max"
                        value={values.maxPrice}
                        onChange={handleChange}
                    />
                </label>

                <label className="property-filters__field">
                    <span>Beds</span>
                    <select name="beds" value={values.beds} onChange={handleChange}>
                        <option value="">Any</option>
                        {BED_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}+</option>
                        ))}
                    </select>
                </label>

                <label className="property-filters__field">
                    <span>Baths</span>
                    <select name="baths" value={values.baths} onChange={handleChange}>
                        <option value="">Any</option>
                        {BATH_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}+</option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="property-filters__actions">
                <button type="submit" className="property-filters__search">
                    Search
                </button>
                <button type="button" className="property-filters__clear" onClick={handleClear}>
                    Clear Filters
                </button>
            </div>

            {error && <p className="property-filters__error" role="alert">{error}</p>}
        </form>
    );
}

export default PropertyFilters;
