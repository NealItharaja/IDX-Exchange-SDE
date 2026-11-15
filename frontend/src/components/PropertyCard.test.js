import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import PropertyCard from "./PropertyCard";
import { ROUTER_FUTURE } from "../routerFuture";

const PHOTOS = JSON.stringify(["https://img.test/1.jpg", "https://img.test/2.jpg", "https://img.test/3.jpg"]);

function property(overrides = {}) {
    return {
        id: 1,
        listingId: "1190271904",
        address: "10219 N Star",
        city: "Morongo Valley",
        state: "CA",
        zipcode: "92256",
        price: 385000,
        beds: 2,
        baths: "1.0",
        sqft: 1388,
        photos: PHOTOS,
        ...overrides,
    };
}

function CurrentPath() {
    return <p data-testid="path">{useLocation().pathname}</p>;
}

function renderCard(props) {
    render(
        <MemoryRouter initialEntries={["/"]} future={ROUTER_FUTURE}>
            <Routes>
                <Route path="/" element={<PropertyCard property={property(props)} />} />
                <Route path="/property/:id" element={<p>Detail page</p>} />
            </Routes>
            <CurrentPath />
        </MemoryRouter>,
    );
}

const path = () => screen.getByTestId("path").textContent;
const photo = () => screen.getByRole("img");

describe("PropertyCard", () => {
    it("clicking anywhere on the card navigates to /property/[listing-id]", () => {
        renderCard();
        fireEvent.click(screen.getByText("$385,000"));
        expect(path()).toBe("/property/1190271904");
    });

    it("the address is a real link to the detail page", () => {
        renderCard();
        expect(screen.getByRole("link", { name: "10219 N Star" })).toHaveAttribute("href", "/property/1190271904");

        fireEvent.click(screen.getByRole("link", { name: "10219 N Star" }));
        expect(path()).toBe("/property/1190271904");
    });
});

describe("PropertyImageCarousel (on the card)", () => {
    it("arrows cycle through the photos and the counter shows X / Y", () => {
        renderCard();
        expect(screen.getByText("1 / 3")).toBeInTheDocument();
        expect(photo()).toHaveAttribute("src", "https://img.test/1.jpg");

        fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
        expect(screen.getByText("2 / 3")).toBeInTheDocument();
        expect(photo()).toHaveAttribute("src", "https://img.test/2.jpg");

        fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));
        fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));
        expect(screen.getByText("3 / 3")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
        expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });

    it("arrow clicks do not navigate to the detail page", () => {
        renderCard();

        fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
        fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));

        expect(path()).toBe("/");
    });

    it("a single photo shows no arrows or counter", () => {
        renderCard({ photos: JSON.stringify(["https://img.test/only.jpg"]) });

        expect(photo()).toHaveAttribute("src", "https://img.test/only.jpg");
        expect(screen.queryByRole("button", { name: "Next photo" })).not.toBeInTheDocument();
        expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
    });

    it("falls back to a placeholder when L_Photos is empty or not valid JSON", () => {
        renderCard({ photos: "[not json" });
        expect(screen.getByText("No photo available")).toBeInTheDocument();
    });

    it("shows a placeholder for a photo that fails to load", () => {
        renderCard();
        fireEvent.error(photo());
        expect(screen.getByText("Photo unavailable")).toBeInTheDocument();
    });
});
