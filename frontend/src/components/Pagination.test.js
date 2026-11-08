import { fireEvent, render, screen } from "@testing-library/react";
import Pagination from "./Pagination";

function renderPagination(currentPage, totalPages, props = {}) {
    const onPageChange = jest.fn();
    const { container, unmount } = render(
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} {...props} />,
    );
    return { onPageChange, container, unmount };
}

// What the user sees between Previous and Next, e.g. "1 ... 4 5 6 ... 24".
function visiblePages(container) {
    return [...container.querySelectorAll(".pagination__pages li")].map((li) => li.textContent).join(" ");
}

const previous = () => screen.getByRole("button", { name: "Previous" });
const next = () => screen.getByRole("button", { name: "Next" });

describe("Pagination", () => {
    it("renders nothing when there is only one page (or none)", () => {
        const { container } = renderPagination(1, 1);
        expect(container).toBeEmptyDOMElement();

        const { container: empty } = renderPagination(1, 0);
        expect(empty).toBeEmptyDOMElement();
    });

    it("first page: Previous is disabled, Next is enabled and page 1 is current", () => {
        const { container } = renderPagination(1, 24);

        expect(previous()).toBeDisabled();
        expect(next()).toBeEnabled();
        expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
        expect(visiblePages(container)).toBe("1 2 3 4 5 ... 24");
    });

    it("last page: Next is disabled and Previous is enabled", () => {
        const { container } = renderPagination(24, 24);

        expect(next()).toBeDisabled();
        expect(previous()).toBeEnabled();
        expect(screen.getByRole("button", { name: "Page 24" })).toHaveAttribute("aria-current", "page");
        expect(visiblePages(container)).toBe("1 ... 20 21 22 23 24");
    });

    it("middle page: shows ellipsis on both sides", () => {
        const { container } = renderPagination(5, 24);

        expect(visiblePages(container)).toBe("1 ... 4 5 6 ... 24");
        expect(previous()).toBeEnabled();
        expect(next()).toBeEnabled();
    });

    it("shows every page with no ellipsis when they all fit", () => {
        const { container } = renderPagination(3, 7);

        expect(visiblePages(container)).toBe("1 2 3 4 5 6 7");
        expect(container.querySelector(".pagination__ellipsis")).toBeNull();
    });

    it("clicking a page number navigates to that page", () => {
        const { onPageChange } = renderPagination(5, 24);

        fireEvent.click(screen.getByRole("button", { name: "Page 6" }));
        fireEvent.click(screen.getByRole("button", { name: "Page 24" }));

        expect(onPageChange.mock.calls).toEqual([[6], [24]]);
    });

    it("Previous and Next move one page back and forward", () => {
        const { onPageChange } = renderPagination(5, 24);

        fireEvent.click(previous());
        fireEvent.click(next());

        expect(onPageChange.mock.calls).toEqual([[4], [6]]);
    });

    it("disables every button while a page is loading", () => {
        renderPagination(5, 24, { disabled: true });

        for (const button of screen.getAllByRole("button")) {
            expect(button).toBeDisabled();
        }
    });

    it("formats large page numbers", () => {
        renderPagination(1, 2761);

        expect(screen.getByRole("button", { name: "Page 2761" })).toHaveTextContent("2,761");
    });

    // Debug challenge: near the end the last page must show up exactly once (never "1 ... 22 23 24 ... 24").
    it.each([
        [20, "1 ... 19 20 21 ... 24"],
        [21, "1 ... 20 21 22 23 24"],
        [22, "1 ... 20 21 22 23 24"],
        [23, "1 ... 20 21 22 23 24"],
        [24, "1 ... 20 21 22 23 24"],
    ])("page %i of 24 shows the last page once", (currentPage, expected) => {
        const { container } = renderPagination(currentPage, 24);

        expect(visiblePages(container)).toBe(expected);
        expect(screen.getAllByRole("button", { name: "Page 24" })).toHaveLength(1);
    });

    it("never repeats a page number for any page of any size", () => {
        for (let totalPages = 2; totalPages <= 30; totalPages++) {
            for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
                const { container, unmount } = renderPagination(currentPage, totalPages);
                const numbers = visiblePages(container).split(" ").filter((text) => text !== "...");

                expect(new Set(numbers).size).toBe(numbers.length);
                expect(numbers[0]).toBe("1");
                expect(numbers[numbers.length - 1]).toBe(String(totalPages));
                unmount();
            }
        }
    });
});
