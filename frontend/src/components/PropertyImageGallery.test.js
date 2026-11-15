import { fireEvent, render, screen, within } from "@testing-library/react";
import PropertyImageGallery from "./PropertyImageGallery";

const URLS = ["https://img.test/1.jpg", "https://img.test/2.jpg", "https://img.test/3.jpg"];

const openButton = () => screen.getByRole("button", { name: "Open full-screen photo viewer" });
const mainImage = () => within(openButton()).getByRole("img");
const dialog = () => screen.getByRole("dialog", { name: "Photo viewer" });
const lightboxImage = () => within(dialog()).getByRole("img");

function openLightbox() {
    openButton().focus();
    fireEvent.click(openButton());
    return dialog();
}

describe("PropertyImageGallery", () => {
    it("parses L_Photos and shows the first photo with a thumbnail strip", () => {
        render(<PropertyImageGallery photos={JSON.stringify(URLS)} alt="10219 N Star" />);

        expect(mainImage()).toHaveAttribute("src", URLS[0]);
        expect(screen.getAllByRole("button", { name: /^Show photo/ })).toHaveLength(3);
        expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });

    it("clicking a thumbnail updates the main image", () => {
        render(<PropertyImageGallery photos={JSON.stringify(URLS)} />);

        fireEvent.click(screen.getByRole("button", { name: "Show photo 3" }));

        expect(mainImage()).toHaveAttribute("src", URLS[2]);
        expect(screen.getByRole("button", { name: "Show photo 3" })).toHaveAttribute("aria-current", "true");
        expect(screen.getByRole("button", { name: "Show photo 1" })).not.toHaveAttribute("aria-current");
    });

    it("a single photo has no thumbnails or arrows", () => {
        render(<PropertyImageGallery photos={JSON.stringify([URLS[0]])} />);

        expect(mainImage()).toHaveAttribute("src", URLS[0]);
        expect(screen.queryByRole("button", { name: /^Show photo/ })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Next photo" })).not.toBeInTheDocument();
    });

    it("shows a message when there are no photos or L_Photos isn't valid JSON", () => {
        const { rerender } = render(<PropertyImageGallery photos={null} />);
        expect(screen.getByText("No photos available")).toBeInTheDocument();

        rerender(<PropertyImageGallery photos="[broken" />);
        expect(screen.getByText("No photos available")).toBeInTheDocument();
    });
});

describe("Lightbox", () => {
    it("clicking the main image opens a full-screen lightbox on the same photo", () => {
        render(<PropertyImageGallery photos={JSON.stringify(URLS)} />);
        fireEvent.click(screen.getByRole("button", { name: "Show photo 2" }));

        openLightbox();

        expect(lightboxImage()).toHaveAttribute("src", URLS[1]);
        expect(within(dialog()).getByText("2 / 3")).toBeInTheDocument();
    });

    it("left/right arrow keys and buttons move between photos (wrapping around)", () => {
        render(<PropertyImageGallery photos={JSON.stringify(URLS)} />);
        openLightbox();

        fireEvent.keyDown(document.activeElement, { key: "ArrowRight" });
        expect(lightboxImage()).toHaveAttribute("src", URLS[1]);

        fireEvent.keyDown(document.activeElement, { key: "ArrowLeft" });
        fireEvent.keyDown(document.activeElement, { key: "ArrowLeft" });
        expect(lightboxImage()).toHaveAttribute("src", URLS[2]);

        fireEvent.click(within(dialog()).getByRole("button", { name: "Next photo" }));
        expect(lightboxImage()).toHaveAttribute("src", URLS[0]);
    });

    // Debug challenge: the keydown handler only fires if the dialog div can take focus (tabIndex) and has it.
    it("closes when Escape is pressed, with no extra clicks first", () => {
        render(<PropertyImageGallery photos={JSON.stringify(URLS)} />);
        openLightbox();

        // Like a real key press, the event goes to whatever element has focus.
        fireEvent.keyDown(document.activeElement, { key: "Escape" });

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(document.activeElement).toBe(openButton());
    });

    it("closes on a click outside the photo but not on the photo itself", () => {
        render(<PropertyImageGallery photos={JSON.stringify(URLS)} />);
        openLightbox();

        fireEvent.click(lightboxImage());
        expect(dialog()).toBeInTheDocument();

        fireEvent.click(dialog());
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes with the close button and unlocks page scrolling", () => {
        render(<PropertyImageGallery photos={JSON.stringify(URLS)} />);
        openLightbox();
        expect(document.body.style.overflow).toBe("hidden");

        fireEvent.click(screen.getByRole("button", { name: "Close photo viewer" }));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(document.body.style.overflow).toBe("");
    });

    it("a single photo has no arrows and arrow keys do nothing", () => {
        render(<PropertyImageGallery photos={JSON.stringify([URLS[0]])} />);
        openLightbox();

        expect(within(dialog()).queryByRole("button", { name: "Next photo" })).not.toBeInTheDocument();
        fireEvent.keyDown(document.activeElement, { key: "ArrowRight" });
        expect(lightboxImage()).toHaveAttribute("src", URLS[0]);
    });
});
