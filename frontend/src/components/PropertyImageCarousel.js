import { useMemo, useState } from "react";
import { parsePhotos } from "../utils/photos";
import "./PropertyImageCarousel.css";

function PropertyImageCarousel({ photos, alt = "Property photo" }) {
    const urls = useMemo(() => parsePhotos(photos), [photos]);
    const [index, setIndex] = useState(0);
    const [failed, setFailed] = useState(() => new Set());

    if (urls.length === 0) {
        return <div className="property-carousel__empty">No photo available</div>;
    }

    const current = Math.min(index, urls.length - 1);
    const url = urls[current];

    // The carousel sits inside a clickable card, so the arrows must not let the click reach the card.
    const step = (offset) => (event) => {
        event.preventDefault();
        event.stopPropagation();
        setIndex((i) => (i + offset + urls.length) % urls.length);
    };

    return (
        <div className="property-carousel">
            {failed.has(url) ? (
                <div className="property-carousel__empty">Photo unavailable</div>
            ) : (
                <img
                    src={url}
                    alt={urls.length > 1 ? `${alt} (photo ${current + 1} of ${urls.length})` : alt}
                    loading="lazy"
                    onError={() => setFailed((prev) => new Set(prev).add(url))}
                />
            )}

            {urls.length > 1 && (
                <>
                    <button
                        type="button"
                        className="property-carousel__arrow property-carousel__arrow--prev"
                        aria-label="Previous photo"
                        onClick={step(-1)}
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        className="property-carousel__arrow property-carousel__arrow--next"
                        aria-label="Next photo"
                        onClick={step(1)}
                    >
                        ›
                    </button>
                    <span className="property-carousel__counter">{current + 1} / {urls.length}</span>
                </>
            )}
        </div>
    );
}

export default PropertyImageCarousel;
