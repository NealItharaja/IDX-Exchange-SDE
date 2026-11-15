import { render, screen } from "@testing-library/react";
import OpenHouseList, { getOpenHouseRemarks } from "./OpenHouseList";

function openHouse(overrides = {}, remarks) {
    return {
        id: 1,
        listingId: "1190524867",
        date: "2026-09-18",
        startTime: "17:30:00",
        endTime: "19:30:00",
        allData: JSON.stringify({ OpenHouseKey: "abc", OpenHouseRemarks: remarks ?? null }),
        ...overrides,
    };
}

describe("getOpenHouseRemarks", () => {
    it("reads OpenHouseRemarks out of the all_data JSON string", () => {
        const { allData } = openHouse({}, "New Listing! Come see it Friday.");

        expect(typeof allData).toBe("string");
        expect(allData.OpenHouseRemarks).toBeUndefined();
        expect(getOpenHouseRemarks(allData)).toBe("New Listing! Come see it Friday.");
    });

    it("also accepts an already-parsed object", () => {
        expect(getOpenHouseRemarks({ OpenHouseRemarks: "  Twilight Open House " })).toBe("Twilight Open House");
    });

    it.each([
        ["null remarks", JSON.stringify({ OpenHouseRemarks: null })],
        ["blank remarks", JSON.stringify({ OpenHouseRemarks: "   " })],
        ["no remarks key", JSON.stringify({ OpenHouseKey: "abc" })],
        ["invalid JSON", "{not json"],
        ["missing all_data", null],
    ])("returns null for %s", (_, allData) => {
        expect(getOpenHouseRemarks(allData)).toBeNull();
    });
});

describe("OpenHouseList", () => {
    it("shows the date, formatted times and remarks", () => {
        render(<OpenHouseList openHouses={[openHouse({}, "Twilight Open House")]} />);

        expect(screen.getByText("Friday, September 18, 2026")).toBeInTheDocument();
        expect(screen.getByText("5:30 PM – 7:30 PM")).toBeInTheDocument();
        expect(screen.getByText("Twilight Open House")).toBeInTheDocument();
    });

    it("leaves remarks out when an open house doesn't have any", () => {
        const { container } = render(
            <OpenHouseList openHouses={[openHouse({ id: 2, startTime: "11:00:00", endTime: "14:00:00" })]} />,
        );

        expect(screen.getByText("11:00 AM – 2:00 PM")).toBeInTheDocument();
        expect(container.querySelector(".open-houses__remarks")).toBeNull();
    });

    it('shows "No open houses scheduled" when there are none', () => {
        render(<OpenHouseList openHouses={[]} />);
        expect(screen.getByText("No open houses scheduled")).toBeInTheDocument();
    });
});
