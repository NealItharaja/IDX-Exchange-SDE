import "./PropertyMap.css";

export function toCoordinate(value, limit) {
    if (value === null || value === undefined || String(value).trim() === "") return null;

    const number = Number(value);
    return Number.isFinite(number) && number !== 0 && Math.abs(number) <= limit ? number : null;
}

export function getMapEmbedUrl(lat, lng, apiKey) {
    const place = `${lat},${lng}`;
    if (apiKey) {
        return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${place}&zoom=15`;
    }

    return `https://maps.google.com/maps?q=${place}&z=15&output=embed`;
}

function PropertyMap({ latitude, longitude, address }) {
    const lat = toCoordinate(latitude, 90);
    const lng = toCoordinate(longitude, 180);
    if (lat === null || lng === null) return null;

    const src = getMapEmbedUrl(lat, lng, process.env.REACT_APP_GOOGLE_MAPS_API_KEY);
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    return (
        <div className="property-map">
            <iframe
                className="property-map__frame"
                title={address ? `Map of ${address}` : "Property location map"}
                src={src}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
            />
            <a className="property-map__directions" href={directionsUrl} target="_blank" rel="noopener noreferrer">
                Get Directions
            </a>
        </div>
    );
}

export default PropertyMap;
