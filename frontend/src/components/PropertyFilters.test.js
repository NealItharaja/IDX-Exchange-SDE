import { fireEvent, render, screen } from "@testing-library/react";
import PropertyFilters, { removeEmptyFilters } from "./PropertyFilters";

function renderFilters() {
    const onSearch = jest.fn();
    const onClear = jest.fn();
    render(<PropertyFilters onSearch={onSearch} onClear={onClear} />);
    return { onSearch, onClear };
}

function change(label, value) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("PropertyFilters", () => {
    it("displays all six inputs, with dropdowns for beds and baths", () => {
        renderFilters();

        for (const label of ["City", "ZIP code", "Min price", "Max price"]) {
            expect(screen.getByLabelText(label)).toBeInTheDocument();
        }
        expect(screen.getByLabelText("Beds").tagName).toBe("SELECT");
        expect(screen.getByLabelText("Baths").tagName).toBe("SELECT");
    });

    it("searches with combined filters and leaves out empty ones", () => {
        const { onSearch } = renderFilters();

        change("City", "  Irvine ");
        change("Min price", "300000");
        change("Beds", "3");
        fireEvent.click(screen.getByRole("button", { name: "Search" }));

        expect(onSearch).toHaveBeenCalledTimes(1);
        expect(onSearch).toHaveBeenCalledWith({ city: "Irvine", minPrice: "300000", beds: "3" });
    });

    it("searches with no filters when the form is empty", () => {
        const { onSearch } = renderFilters();

        fireEvent.click(screen.getByRole("button", { name: "Search" }));

        expect(onSearch).toHaveBeenCalledWith({});
    });

    it("Clear Filters resets every input and calls onClear", () => {
        const { onClear } = renderFilters();

        change("City", "Irvine");
        change("ZIP code", "92618");
        change("Max price", "900000");
        change("Baths", "2");
        fireEvent.click(screen.getByRole("button", { name: "Clear Filters" }));

        expect(onClear).toHaveBeenCalledTimes(1);
        for (const label of ["City", "ZIP code", "Min price", "Max price", "Beds", "Baths"]) {
            expect(screen.getByLabelText(label)).toHaveValue(label.includes("price") ? null : "");
        }
    });

    it("blocks a search where min price is more than max price", () => {
        const { onSearch } = renderFilters();

        change("Min price", "900000");
        change("Max price", "300000");
        fireEvent.click(screen.getByRole("button", { name: "Search" }));

        expect(onSearch).not.toHaveBeenCalled();
        expect(screen.getByRole("alert")).toHaveTextContent("Min price can't be more than max price.");
    });
});

describe("removeEmptyFilters", () => {
    it("drops blank, whitespace-only and missing values and trims the rest", () => {
        expect(removeEmptyFilters({ city: " Irvine ", zipcode: "", beds: "   ", baths: undefined, minPrice: null }))
            .toEqual({ city: "Irvine" });
    });
});
