import { ApiError, fetchProperties, fetchPropertyDetail } from "./client";

function jsonResponse(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

function nonJsonResponse(status) {
    return { ok: status >= 200 && status < 300, status, json: () => Promise.reject(new SyntaxError("Unexpected token P")) };
}

const PAGE = { total: 1, limit: 20, offset: 0, results: [{ id: 1, city: "Irvine" }] };

beforeEach(() => {
    global.fetch = jest.fn();
});

afterEach(() => {
    delete global.fetch;
});

describe("fetchProperties", () => {
    it("requests /api/properties and returns the parsed body", async () => {
        fetch.mockResolvedValue(jsonResponse(PAGE));

        await expect(fetchProperties()).resolves.toEqual(PAGE);
        expect(fetch).toHaveBeenCalledWith("/api/properties", expect.anything());
    });

    it("sends combined filters and leaves out empty values", async () => {
        fetch.mockResolvedValue(jsonResponse(PAGE));

        await fetchProperties({
            city: " Irvine ",
            zipcode: "",
            minPrice: 300000,
            maxPrice: "   ",
            beds: "3",
            baths: undefined,
            limit: 20,
            offset: 0,
        });

        expect(fetch).toHaveBeenCalledWith(
            "/api/properties?city=Irvine&minPrice=300000&beds=3&limit=20&offset=0",
            expect.anything(),
        );
    });

    it("throws the API's error message and details for a 400", async () => {
        fetch.mockResolvedValue(jsonResponse({
            error: "Invalid query parameters",
            details: ["limit must be a whole number between 1 and 100 (got \"200\")"],
        }, 400));

        const error = await fetchProperties({ limit: 200 }).catch((err) => err);
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(400);
        expect(error.message).toBe("Invalid query parameters: limit must be a whole number between 1 and 100 (got \"200\")");
        expect(error.details).toHaveLength(1);
    });

    it("explains that the backend is down when the proxy returns a non-JSON 500", async () => {
        fetch.mockResolvedValue(nonJsonResponse(500));

        await expect(fetchProperties()).rejects.toThrow("Couldn't reach the API server. Make sure the backend is running.");
    });

    it("turns a network failure into an ApiError", async () => {
        fetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const error = await fetchProperties().catch((err) => err);
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(0);
        expect(error.message).toMatch(/Couldn't reach the server/);
    });

    it("lets AbortError through untouched so callers can ignore cancelled requests", async () => {
        const abort = new DOMException("The operation was aborted.", "AbortError");
        fetch.mockRejectedValue(abort);

        await expect(fetchProperties()).rejects.toBe(abort);
    });

    it("rejects a successful response that isn't JSON", async () => {
        fetch.mockResolvedValue(nonJsonResponse(200));

        await expect(fetchProperties()).rejects.toThrow("wasn't valid JSON");
    });
});

describe("fetchPropertyDetail", () => {
    it("requests the property by encoded listing ID", async () => {
        fetch.mockResolvedValue(jsonResponse({ L_ListingID: "1190271904" }));

        await expect(fetchPropertyDetail("1190271904")).resolves.toEqual({ L_ListingID: "1190271904" });
        expect(fetch).toHaveBeenCalledWith("/api/properties/1190271904", expect.anything());

        await fetchPropertyDetail("abc/123");
        expect(fetch).toHaveBeenLastCalledWith("/api/properties/abc%2F123", expect.anything());
    });

    it("throws the 404 message for an unknown ID", async () => {
        fetch.mockResolvedValue(jsonResponse({ error: "No property found with listing ID 9999999999" }, 404));

        await expect(fetchPropertyDetail("9999999999")).rejects.toThrow("No property found with listing ID 9999999999");
    });
});
