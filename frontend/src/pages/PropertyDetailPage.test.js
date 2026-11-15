import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PropertyDetailPage from "./PropertyDetailPage";
import { ROUTER_FUTURE } from "../routerFuture";

const PROPERTY = {
    id: 361330,
    L_ListingID: "1190271904",
    L_DisplayId: "1190271904",
    L_Address: "10219 N Star",
    L_City: "Morongo Valley",
    L_State: "CA",
    L_Zip: "92256",
    L_Type_: "SingleFamilyResidence",
    L_Status: "Active",
    L_SystemPrice: 385000,
    L_Keyword2: 2,
    LM_Dec_3: "1.0",
    LM_Int2_3: 1388,
    YearBuilt: 1958,
    L_Remarks: "Discover your own piece of High Desert paradise.",
    L_Photos: JSON.stringify(["https://img.test/1.jpg", "https://img.test/2.jpg"]),
    LMD_MP_Latitude: "34.065903000000000",
    LMD_MP_Longitude: "-116.561885000000000",
    LotSizeAcres: "5.0000",
    Heating: "ForcedAir,Propane",
    ListAgentFullName: "Bryan Duke",
};

const OPEN_HOUSES = [
    {
        id: 6514,
        listingId: "1190271904",
        date: "2026-10-17",
        startTime: "11:00:00",
        endTime: "14:00:00",
        allData: JSON.stringify({ OpenHouseRemarks: "Come see the views!" }),
    },
];

function jsonResponse(status, body) {
    return Promise.resolve({ ok: status < 400, status, json: async () => body });
}

function mockApi({ property = PROPERTY, openHouses = OPEN_HOUSES, propertyStatus = 200, openHouseStatus = 200 } = {}) {
    global.fetch = jest.fn((url) =>
        url.endsWith("/openhouses") ? jsonResponse(openHouseStatus, openHouses) : jsonResponse(propertyStatus, property),
    );
}

function renderAt(entries, initialIndex = entries.length - 1) {
    render(
        <MemoryRouter initialEntries={entries} initialIndex={initialIndex} future={ROUTER_FUTURE}>
            <Routes>
                <Route path="/" element={<p>Listings page</p>} />
                <Route path="/property/:id" element={<PropertyDetailPage />} />
            </Routes>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    window.scrollTo = jest.fn();
});

afterEach(() => {
    delete global.fetch;
});

describe("PropertyDetailPage", () => {
    it("shows price, address, stats, description, details and open houses", async () => {
        mockApi();
        renderAt(["/property/1190271904"]);

        expect(await screen.findByRole("heading", { name: "10219 N Star" })).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith("/api/properties/1190271904", expect.anything());
        expect(fetch).toHaveBeenCalledWith("/api/properties/1190271904/openhouses", expect.anything());

        expect(screen.getByText("$385,000")).toBeInTheDocument();
        expect(screen.getByText("Morongo Valley, CA 92256")).toBeInTheDocument();

        const stats = within(screen.getByRole("list", { name: "Property stats" }));
        expect(stats.getByText("2")).toBeInTheDocument();
        expect(stats.getByText("1")).toBeInTheDocument();
        expect(stats.getByText("1,388")).toBeInTheDocument();
        expect(stats.getByText("1958")).toBeInTheDocument();

        expect(screen.getByText("Discover your own piece of High Desert paradise.")).toBeInTheDocument();
        expect(screen.getByText("Single Family Residence")).toBeInTheDocument();
        expect(screen.getByText("5 acres")).toBeInTheDocument();
        expect(screen.getByText("Forced Air, Propane")).toBeInTheDocument();
        expect(screen.getByText("Bryan Duke")).toBeInTheDocument();

        expect(await screen.findByText("Saturday, October 17, 2026")).toBeInTheDocument();
        expect(screen.getByText("11:00 AM – 2:00 PM")).toBeInTheDocument();
        expect(screen.getByText("Come see the views!")).toBeInTheDocument();

        expect(screen.getByTitle("Map of 10219 N Star, Morongo Valley, CA 92256")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Open full-screen photo viewer" })).toBeInTheDocument();
    });

    it('shows "No open houses scheduled" and no map when there are none / no coordinates', async () => {
        mockApi({ property: { ...PROPERTY, LMD_MP_Latitude: null, LMD_MP_Longitude: null }, openHouses: [] });
        renderAt(["/property/1190271904"]);

        expect(await screen.findByText("No open houses scheduled")).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Location" })).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Get Directions" })).not.toBeInTheDocument();
    });

    it("visiting /property/invalid-id shows an error instead of crashing", async () => {
        mockApi({ propertyStatus: 400, property: { error: "Listing ID must be a number" }, openHouseStatus: 400, openHouses: { error: "Listing ID must be a number" } });
        renderAt(["/property/invalid-id"]);

        const alert = await screen.findByRole("alert");
        expect(within(alert).getByText("Invalid listing ID")).toBeInTheDocument();
        expect(within(alert).getByText("Listing ID must be a number")).toBeInTheDocument();
        expect(within(alert).getByRole("link", { name: "Browse all listings" })).toHaveAttribute("href", "/");
    });

    it("shows a not-found message for an unknown listing ID", async () => {
        mockApi({ propertyStatus: 404, property: { error: "No property found with listing ID 999" }, openHouseStatus: 404, openHouses: {} });
        renderAt(["/property/999"]);

        expect(await screen.findByText("Property not found")).toBeInTheDocument();
    });

    it("still shows the property if only the open house request fails", async () => {
        mockApi({ openHouseStatus: 500, openHouses: { error: "Failed to fetch open houses" } });
        renderAt(["/property/1190271904"]);

        expect(await screen.findByText(/Couldn't load open houses/)).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "10219 N Star" })).toBeInTheDocument();
    });

    it("Back returns to the listings page it came from", async () => {
        mockApi();
        renderAt(["/", "/property/1190271904"]);
        await screen.findByRole("heading", { name: "10219 N Star" });

        fireEvent.click(screen.getByRole("button", { name: "← Back to listings" }));

        expect(screen.getByText("Listings page")).toBeInTheDocument();
    });

    it("Back still goes to the listings page when the detail page was opened directly", async () => {
        mockApi();
        renderAt(["/property/1190271904"]);
        await screen.findByRole("heading", { name: "10219 N Star" });

        fireEvent.click(screen.getByRole("button", { name: "← Back to listings" }));

        expect(screen.getByText("Listings page")).toBeInTheDocument();
    });
});
