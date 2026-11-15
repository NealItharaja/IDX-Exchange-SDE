import { render, screen } from "@testing-library/react";
import PropertyMap, { getMapEmbedUrl, toCoordinate } from "./PropertyMap";

const ORIGINAL_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    else process.env.REACT_APP_GOOGLE_MAPS_API_KEY = ORIGINAL_KEY;
});

describe("PropertyMap", () => {
    it("renders a Google Maps Embed API iframe at the property's location", () => {
        process.env.REACT_APP_GOOGLE_MAPS_API_KEY = "test-key";
        render(<PropertyMap latitude="34.065903000000000" longitude="-116.561885000000000" address="10219 N Star" />);

        const frame = screen.getByTitle("Map of 10219 N Star");
        expect(frame.tagName).toBe("IFRAME");
        expect(frame).toHaveAttribute(
            "src",
            "https://www.google.com/maps/embed/v1/place?key=test-key&q=34.065903,-116.561885&zoom=15",
        );
    });

    it("Get Directions opens Google Maps in a new tab", () => {
        render(<PropertyMap latitude="34.065903" longitude="-116.561885" />);

        const link = screen.getByRole("link", { name: "Get Directions" });
        expect(link).toHaveAttribute("href", "https://www.google.com/maps/dir/?api=1&destination=34.065903,-116.561885");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it.each([
        ["latitude missing", null, "-116.56"],
        ["longitude missing", "34.06", null],
        ["both empty", "", ""],
        ["stored as 0", "0", "0"],
        ["not a number", "abc", "-116.56"],
    ])("renders nothing when %s", (_, latitude, longitude) => {
        const { container } = render(<PropertyMap latitude={latitude} longitude={longitude} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("falls back to the keyless embed URL when no API key is configured", () => {
        expect(getMapEmbedUrl(34.1, -116.5, "")).toBe("https://maps.google.com/maps?q=34.1,-116.5&z=15&output=embed");
    });

    it("toCoordinate rejects out-of-range values", () => {
        expect(toCoordinate("91", 90)).toBeNull();
        expect(toCoordinate("-181", 180)).toBeNull();
        expect(toCoordinate(" 33.5 ", 90)).toBe(33.5);
    });
});
