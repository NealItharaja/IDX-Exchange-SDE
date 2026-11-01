import { act, fireEvent, render, screen } from "@testing-library/react";
import ListingsPage from "./ListingsPage";

let requests;

function home(city, id) {
    return { id, address: `${id} ${city} Home`, city, state: "CA", zipcode: "90000", price: 500000, beds: 3, baths: "2.0", sqft: 1500, photos: "" };
}

function pageOf(results) {
    return { ok: true, status: 200, json: async () => ({ total: results.length, limit: 20, offset: 0, results }) };
}

function pendingRequest(matches) {
    const request = [...requests].reverse().find((r) => !r.done && matches(r.url));
    if (!request) throw new Error(`No pending request matched. Requests: ${requests.map((r) => r.url).join(", ")}`);
    return request;
}

async function respond(matches, results) {
    const request = pendingRequest(matches);
    request.done = true;
    await act(async () => {
        request.resolve(pageOf(results));
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
