import { act, fireEvent, render, screen } from "@testing-library/react";
import ListingsPage from "./ListingsPage";

let requests;

function home(city, id) {
    return { id, address: `${id} ${city} Home`, city, state: "CA", zipcode: "90000", price: 500000, beds: 3, baths: "2.0", sqft: 1500, photos: "" };
}

function homes(city, count, firstId = 1) {
    return Array.from({ length: count }, (_, i) => home(city, firstId + i));
}

function pageOf(results, { total = results.length, offset = 0 } = {}) {
    return { ok: true, status: 200, json: async () => ({ total, limit: 20, offset, results }) };
}

function pendingRequest(matches) {
    const request = [...requests].reverse().find((r) => !r.done && matches(r.url));
    if (!request) throw new Error(`No pending request matched. Requests: ${requests.map((r) => r.url).join(", ")}`);
    return request;
}

async function respond(matches, results, meta) {
    const request = pendingRequest(matches);
    request.done = true;
    await act(async () => {
        request.resolve(pageOf(results, meta));
    });
}

const allHomes = (url) => !url.includes("city=");
const cityIs = (city) => (url) => url.includes(`city=${city}&`);

function search(city) {
    fireEvent.change(screen.getByLabelText("City"), { target: { value: city } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
}

beforeEach(() => {
    requests = [];
    global.fetch = jest.fn((url) => new Promise((resolve) => requests.push({ url, resolve, done: false })));
    window.scrollTo = jest.fn();
});

afterEach(() => {
    delete global.fetch;
});

describe("ListingsPage filters", () => {
    it("fetches page 1 of the filtered results when the form is submitted", async () => {
        render(<ListingsPage />);
        await respond(allHomes, [home("Anaheim", 1)]);

        search("Irvine");

        expect(fetch).toHaveBeenLastCalledWith("/api/properties?city=Irvine&limit=20&offset=0", expect.anything());
        await respond(cityIs("Irvine"), [home("Irvine", 2)]);
        expect(screen.getByText("2 Irvine Home")).toBeInTheDocument();
        expect(screen.queryByText("1 Anaheim Home")).not.toBeInTheDocument();
    });

    it("shows a helpful message when nothing matches", async () => {
        render(<ListingsPage />);
        await respond(allHomes, [home("Anaheim", 1)]);

        search("Atlantis");
        await respond(cityIs("Atlantis"), []);

        expect(screen.getByText("No properties found.")).toBeInTheDocument();
        expect(screen.getByText(/Nothing matches these filters/)).toBeInTheDocument();
    });

    it("never shows stale results after Clear and a new search", async () => {
        render(<ListingsPage />);
        await respond(allHomes, [home("Anaheim", 1)]);

        search("Irvine");
        await respond(cityIs("Irvine"), [home("Irvine", 2)]);
        expect(screen.getByText("2 Irvine Home")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Clear Filters" }));
        expect(screen.queryByText("2 Irvine Home")).not.toBeInTheDocument();
        expect(screen.getByLabelText("City")).toHaveValue("");

        search("Tustin");
        expect(screen.queryByText("2 Irvine Home")).not.toBeInTheDocument();

        await respond(cityIs("Tustin"), [home("Tustin", 3)]);
        expect(screen.getByText("3 Tustin Home")).toBeInTheDocument();

        await respond(allHomes, [home("Anaheim", 1)]);
        expect(screen.getByText("3 Tustin Home")).toBeInTheDocument();
        expect(screen.queryByText("1 Anaheim Home")).not.toBeInTheDocument();
        expect(screen.queryByText("2 Irvine Home")).not.toBeInTheDocument();
    });
});

describe("ListingsPage pagination", () => {
    const offsetIs = (offset) => (url) => url.includes(`offset=${offset}`);

    async function renderIrvineResults() {
        render(<ListingsPage />);
        await respond(allHomes, homes("Anaheim", 20), { total: 500 });
        search("Irvine");
        await respond(cityIs("Irvine"), homes("Irvine", 20), { total: 45 });
    }

    it("changing pages keeps the active filters, shows X-Y of Z and scrolls to the top", async () => {
        await renderIrvineResults();
        expect(screen.getByText("Showing 1-20 of 45 properties")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Page 2" }));

        expect(fetch).toHaveBeenLastCalledWith("/api/properties?city=Irvine&limit=20&offset=20", expect.anything());
        expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));

        await respond(offsetIs(20), homes("Irvine", 20, 21), { total: 45, offset: 20 });
        expect(screen.getByText("Showing 21-40 of 45 properties")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    });

    it("applying new filters resets to page 1", async () => {
        await renderIrvineResults();
        fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
        await respond(offsetIs(40), homes("Irvine", 5, 41), { total: 45, offset: 40 });

        search("Tustin");

        expect(fetch).toHaveBeenLastCalledWith("/api/properties?city=Tustin&limit=20&offset=0", expect.anything());
        await respond(cityIs("Tustin"), homes("Tustin", 20), { total: 60 });
        expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    });

    it("changing items per page refetches from page 1 with the new limit", async () => {
        await renderIrvineResults();
        fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
        await respond(offsetIs(20), homes("Irvine", 20, 21), { total: 45, offset: 20 });

        fireEvent.change(screen.getByLabelText("Per page"), { target: { value: "50" } });

        expect(fetch).toHaveBeenLastCalledWith("/api/properties?city=Irvine&limit=50&offset=0", expect.anything());
    });

    it("hides pagination when everything fits on one page", async () => {
        render(<ListingsPage />);
        await respond(allHomes, homes("Anaheim", 5), { total: 5 });

        expect(screen.getByText("Showing 1-5 of 5 properties")).toBeInTheDocument();
        expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument();
    });
});
