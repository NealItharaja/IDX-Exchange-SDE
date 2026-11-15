import { useEffect, useMemo, useRef, useState } from "react";
import Lightbox from "./Lightbox";
import { parsePhotos } from "../utils/photos";
import "./PropertyImageGallery.css";

function PropertyImageGallery({ photos, alt = "Property photo" }) {
    const urls = useMemo(() => parsePhotos(photos), [photos]);
    const [index, setIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [failed, setFailed] = useState(() => new Set());
    const stripRef = useRef(null);
    const thumbRefs = useRef([]);

    // Keep the selected thumbnail centered in the strip
    useEffect(() => {
        const strip = stripRef.current;
        const thumb = thumbRefs.current[index];
        if (!strip || !thumb || typeof strip.scrollTo !== "function") return;

        strip.scrollTo({ left: thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2, behavior: "smooth" });
    }, [index]);

    if (urls.length === 0) {
        return <div className="gallery__empty">No photos available</div>;
    }

    const current = Math.min(index, urls.length - 1);
    const url = urls[current];
    const step = (offset) => setIndex((i) => (i + offset + urls.length) % urls.length);

    return (
        <section className="gallery" aria-label="Photos">
            <div className="gallery__stage">
                {failed.has(url) ? (
                    <div className="gallery__empty">Photo unavailable</div>
                ) : (
                    <button
                        type="button"
                        className="gallery__main"
                        aria-label="Open full-screen photo viewer"
                        onClick={() => setLightboxOpen(true)}
                    >
                        <img
                            src={url}
                            alt={`${alt} (photo ${current + 1} of ${urls.length})`}
                            onError={() => setFailed((prev) => new Set(prev).add(url))}
                        />
                    </button>
                )}

                {urls.length > 1 && (
                    <>
                        <button
                            type="button"
                            className="gallery__arrow gallery__arrow--prev"
                            aria-label="Previous photo"
                            onClick={() => step(-1)}
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            className="gallery__arrow gallery__arrow--next"
                            aria-label="Next photo"
                            onClick={() => step(1)}
                        >
                            ›
                        </button>
                    </>
                )}
                <span className="gallery__counter">{current + 1} / {urls.length}</span>
            </div>

            {urls.length > 1 && (
                <ul className="gallery__thumbs" ref={stripRef}>
                    {urls.map((thumbUrl, i) => (
                        <li key={i}>
                            <button
                                type="button"
                                ref={(el) => (thumbRefs.current[i] = el)}
                                className={`gallery__thumb${i === current ? " is-active" : ""}`}
                                aria-label={`Show photo ${i + 1}`}
                                aria-current={i === current ? "true" : undefined}
                                onClick={() => setIndex(i)}
                            >
                                <img src={thumbUrl} alt="" loading="lazy" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {lightboxOpen && (
                <Lightbox
                    photos={urls}
                    index={current}
                    alt={alt}
                    onIndexChange={setIndex}
                    onClose={() => setLightboxOpen(false)}
                />
            )}
        </section>
    );
}

export default PropertyImageGallery;
