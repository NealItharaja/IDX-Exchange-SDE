import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchOpenHouses, fetchPropertyDetail } from "../api/client";
import OpenHouseList from "../components/OpenHouseList";
import PropertyImageGallery from "../components/PropertyImageGallery";
import PropertyMap, { toCoordinate } from "../components/PropertyMap";
import { formatNumber, formatPrice, humanize } from "../utils/format";
import "./PropertyDetailPage.css";

function isPresent(value) {
    return value !== null && value !== undefined && String(value).trim() !== "";
}

function formatLotSize(property) {
    const acres = Number(property.LotSizeAcres);
    if (acres > 0) return `${formatNumber(acres)} ${acres === 1 ? "acre" : "acres"}`;

    const sqft = Number(property.LotSizeSquareFeet);
    return sqft > 0 ? `${formatNumber(sqft)} sqft` : null;
}

function getPropertyDetails(property) {
    const details = [
        ["Property type", humanize(property.L_Type_ || property.PropertySubTypeAdditional)],
        ["Status", property.L_Status || property.StandardStatus],
        ["MLS #", property.L_DisplayId],
        ["Lot size", formatLotSize(property)],
        ["Stories", property.StoriesTotal],
        ["Days on market", property.DaysOnMarket],
        ["Heating", humanize(property.Heating)],
        ["Cooling", humanize(property.Cooling)],
        ["View", humanize(property.View)],
        ["Pool", humanize(property.PoolFeatures)],
        ["Roof", humanize(property.Roof)],
        ["Water", humanize(property.WaterSource)],
        ["County", property.CountyOrParish],
        ["Listing agent", property.ListAgentFullName],
        ["Brokerage", property.LO1_OrganizationName],
    ];
    return details.filter(([, value]) => isPresent(value));
}

function getErrorTitle(error) {
    if (error.status === 404) return "Property not found";
    if (error.status === 400) return "Invalid listing ID";
    return "Couldn't load this property";
}

function PropertyDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openHouses, setOpenHouses] = useState(null);
    const [openHousesError, setOpenHousesError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        setLoading(true);
        setError(null);
        setProperty(null);
        setOpenHouses(null);
        setOpenHousesError(null);
        window.scrollTo(0, 0);

        fetchPropertyDetail(id, { signal })
            .then((body) => {
                if (!signal.aborted) setProperty(body);
            })
            .catch((err) => {
                if (err.name !== "AbortError") setError(err);
            })
            .finally(() => {
                if (!signal.aborted) setLoading(false);
            });

        fetchOpenHouses(id, { signal })
            .then((body) => {
                if (!signal.aborted) setOpenHouses(Array.isArray(body) ? body : []);
            })
            .catch((err) => {
                if (err.name !== "AbortError") setOpenHousesError(err.message);
            });

        return () => controller.abort();
    }, [id, reloadKey]);

    const goBack = () => {
        if (location.key !== "default") navigate(-1);
        else navigate("/");
    };

    const backButton = (
        <button type="button" className="property-detail__back" onClick={goBack}>
            ← Back to listings
        </button>
    );

    if (loading) {
        return (
            <main className="property-detail">
                {backButton}
                <div className="property-detail__status" role="status">
                    <span className="property-detail__spinner" aria-hidden="true" />
                    Loading property...
                </div>
            </main>
        );
    }

    if (error || !property) {
        return (
            <main className="property-detail">
                {backButton}
                <div className="property-detail__error" role="alert">
                    <h1>{error ? getErrorTitle(error) : "Property not found"}</h1>
                    <p>{error ? error.message : "This property couldn't be loaded."}</p>
                    <div className="property-detail__error-actions">
                        {error && error.status !== 400 && error.status !== 404 && (
                            <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
                                Try again
                            </button>
                        )}
                        <Link to="/">Browse all listings</Link>
                    </div>
                </div>
            </main>
        );
    }

    const address = property.L_Address || "Address unavailable";
    const cityLine = [property.L_City, [property.L_State, property.L_Zip].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ");
    const yearBuilt = Number(property.YearBuilt) > 0 ? String(property.YearBuilt) : "—";
    const details = getPropertyDetails(property);
    const hasCoordinates =
        toCoordinate(property.LMD_MP_Latitude, 90) !== null && toCoordinate(property.LMD_MP_Longitude, 180) !== null;

    return (
        <main className="property-detail">
            {backButton}

            <PropertyImageGallery photos={property.L_Photos} alt={address} />

            <div className="property-detail__layout">
                <div className="property-detail__main">
                    <header className="property-detail__header">
                        <p className="property-detail__price">{formatPrice(property.L_SystemPrice)}</p>
                        <h1 className="property-detail__address">{address}</h1>
                        <p className="property-detail__city">{cityLine}</p>
                    </header>

                    <ul className="property-detail__stats" aria-label="Property stats">
                        <li><strong>{formatNumber(property.L_Keyword2)}</strong> beds</li>
                        <li><strong>{formatNumber(property.LM_Dec_3)}</strong> baths</li>
                        <li><strong>{formatNumber(property.LM_Int2_3)}</strong> sqft</li>
                        <li><strong>{yearBuilt}</strong> year built</li>
                    </ul>

                    <section className="property-detail__section">
                        <h2>Description</h2>
                        <p className="property-detail__description">
                            {property.L_Remarks?.trim() || "No description provided."}
                        </p>
                    </section>

                    <section className="property-detail__section">
                        <h2>Property details</h2>
                        <dl className="property-detail__facts">
                            {details.map(([label, value]) => (
                                <div key={label} className="property-detail__fact">
                                    <dt>{label}</dt>
                                    <dd>{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                </div>

                <aside className="property-detail__side">
                    <section className="property-detail__section">
                        <h2>Open houses</h2>
                        {openHousesError ? (
                            <p className="property-detail__muted">Couldn't load open houses. {openHousesError}</p>
                        ) : openHouses === null ? (
                            <p className="property-detail__muted">Loading open houses...</p>
                        ) : (
                            <OpenHouseList openHouses={openHouses} />
                        )}
                    </section>

                    {hasCoordinates && (
                        <section className="property-detail__section">
                            <h2>Location</h2>
                            <PropertyMap
                                latitude={property.LMD_MP_Latitude}
                                longitude={property.LMD_MP_Longitude}
                                address={[address, cityLine].filter(Boolean).join(", ")}
                            />
                        </section>
                    )}
                </aside>
            </div>
        </main>
    );
}

export default PropertyDetailPage;
