import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./Lightbox.css";

function Lightbox({ photos, index, alt, onIndexChange, onClose }) {
    const dialogRef = useRef(null);
    const count = photos.length;

    useEffect(() => {
        const previouslyFocused = document.activeElement;
        const previousOverflow = document.body.style.overflow;

        dialogRef.current?.focus();
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, []);

    const go = (offset) => onIndexChange((index + offset + count) % count);

    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            onClose();
        } else if (event.key === "ArrowLeft" && count > 1) {
            event.preventDefault();
            go(-1);
        } else if (event.key === "ArrowRight" && count > 1) {
            event.preventDefault();
            go(1);
        }
    };

    const handleBackdropClick = (event) => {
        if (event.target === event.currentTarget) onClose();
    };

    return createPortal(
        <div
            ref={dialogRef}
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            onClick={handleBackdropClick}
        >
            <button type="button" className="lightbox__close" aria-label="Close photo viewer" onClick={onClose}>
                ×
            </button>

            {count > 1 && (
                <button
                    type="button"
                    className="lightbox__arrow lightbox__arrow--prev"
                    aria-label="Previous photo"
                    onClick={() => go(-1)}
                >
                    ‹
                </button>
            )}

            <figure className="lightbox__figure">
                <img className="lightbox__image" src={photos[index]} alt={`${alt} (photo ${index + 1} of ${count})`} />
                <figcaption className="lightbox__counter">{index + 1} / {count}</figcaption>
            </figure>

            {count > 1 && (
                <button
                    type="button"
                    className="lightbox__arrow lightbox__arrow--next"
                    aria-label="Next photo"
                    onClick={() => go(1)}
                >
                    ›
                </button>
            )}
        </div>,
        document.body,
    );
}

export default Lightbox;
