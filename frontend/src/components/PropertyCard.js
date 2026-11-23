import { Link, useNavigate } from "react-router-dom";
import PropertyImageCarousel from "./PropertyImageCarousel";
import { formatNumber, formatPrice, formatShortDate } from "../utils/format";
import "./PropertyCard.css";

function PropertyCard({ property }) {
    const navigate = useNavigate();
    const detailPath = `/property/${encodeURIComponent(property.listingId)}`;
    const location = [property.city, [property.state, property.zipcode].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ");
    const listedDate = formatShortDate(property.listedDate);

    // The whole card is clickable
    const handleClick = (event) => {
        if (event.defaultPrevented || event.target.closest("a")) return;
        navigate(detailPath);
    };

    return (
        <article className="property-card" onClick={handleClick}>
            <div className="property-card__photo">
                <PropertyImageCarousel photos={property.photos} alt={property.address || "Property photo"} />
            </div>

            <div className="property-card__body">
                <p className="property-card__price">{formatPrice(property.price)}</p>
                <Link to={detailPath} className="property-card__address">
                    {property.address || "Address unavailable"}
                </Link>
                <p className="property-card__location">{location}</p>
                <ul className="property-card__stats">
                    <li><strong>{formatNumber(property.beds)}</strong> bd</li>
                    <li><strong>{formatNumber(property.baths)}</strong> ba</li>
                    <li><strong>{formatNumber(property.sqft)}</strong> sqft</li>
                </ul>
                {listedDate && <p className="property-card__listed">Listed {listedDate}</p>}
            </div>
        </article>
    );
}

export default PropertyCard;
