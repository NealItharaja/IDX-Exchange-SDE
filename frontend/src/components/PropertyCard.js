import { useState } from "react";
import { getFirstPhoto } from "../utils/photos";
import { formatNumber, formatPrice } from "../utils/format";
import "./PropertyCard.css";

function PropertyCard({ property }) {
    const photo = getFirstPhoto(property.photos);
    const [photoFailed, setPhotoFailed] = useState(false);
    const location = [property.city, [property.state, property.zipcode].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ");

    return (
        <article className="property-card">
            <div className="property-card__photo">
                {photo && !photoFailed ? (
                    <img
                        src={photo}
                        alt={property.address || "Property photo"}
                        loading="lazy"
                        onError={() => setPhotoFailed(true)}
                    />
                ) : (
                    <div className="property-card__no-photo">No photo available</div>
                )}
            </div>

            <div className="property-card__body">
                <p className="property-card__price">{formatPrice(property.price)}</p>
                <p className="property-card__address">{property.address || "Address unavailable"}</p>
                <p className="property-card__location">{location}</p>
                <ul className="property-card__stats">
                    <li><strong>{formatNumber(property.beds)}</strong> bd</li>
                    <li><strong>{formatNumber(property.baths)}</strong> ba</li>
                    <li><strong>{formatNumber(property.sqft)}</strong> sqft</li>
                </ul>
            </div>
        </article>
    );
}

export default PropertyCard;
