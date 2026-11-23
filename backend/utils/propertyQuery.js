const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const ALLOWED_PARAMS = ["city", "zipcode", "minPrice", "maxPrice", "beds", "baths", "sortBy", "sortOrder", "limit", "offset"];

const SORT_COLUMNS = {
    price: { column: "L_SystemPrice", nullable: false },
    listDate: { column: "ListingContractDate", nullable: false },
    sqft: { column: "LM_Int2_3", nullable: true },
    beds: { column: "L_Keyword2", nullable: true },
};

const SORT_ORDERS = ["asc", "desc"];
const INTEGER = /^\d+$/;
const DECIMAL = /^\d+(\.\d+)?$/;
const ZIPCODE = /^\d{5}$/;
const LISTING_ID = /^\d{1,20}$/;

const RESULT_COLUMNS = `
    id,
    L_ListingID AS listingId,
    L_DisplayId AS mlsNumber,
    L_Address AS address,
    L_City AS city,
    L_State AS state,
    L_Zip AS zipcode,
    L_SystemPrice AS price,
    L_Keyword2 AS beds,
    LM_Dec_3 AS baths,
    LM_Int2_3 AS sqft,
    L_Type_ AS propertyType,
    L_Status AS status,
    YearBuilt AS yearBuilt,
    LMD_MP_Latitude AS latitude,
    LMD_MP_Longitude AS longitude,
    PhotoCount AS photoCount,
    L_Photos AS photos,
    DATE_FORMAT(ListingContractDate, '%Y-%m-%d') AS listedDate
`;

function parseInteger(errors, name, raw, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
    const value = Number(raw);
    if (!INTEGER.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) {
        errors.push(`${name} must be a whole number between ${min} and ${max} (got "${raw}")`);
        return undefined;
    }
    return value;
}

function parseDecimal(errors, name, raw) {
    if (!DECIMAL.test(raw)) {
        errors.push(`${name} must be a non-negative number (got "${raw}")`);
        return undefined;
    }
    return Number(raw);
}

// Returns { errors } if anything is invalid, otherwise { filters, limit, offset }.
function parsePropertyQuery(query) {
    const errors = [];

    for (const [key, raw] of Object.entries(query)) {
        if (!ALLOWED_PARAMS.includes(key)) {
            errors.push(`Unknown query parameter "${key}". Allowed parameters: ${ALLOWED_PARAMS.join(", ")}`);
        } else if (typeof raw !== "string") {
            errors.push(`${key} can only be provided once`);
        }
    }
    if (errors.length > 0) return { errors };

    const filters = {};

    if (query.city !== undefined) {
        const city = query.city.trim();
        if (city.length === 0 || city.length > 50) {
            errors.push("city must be between 1 and 50 characters");
        } else {
            filters.city = city;
        }
    }

    if (query.zipcode !== undefined) {
        if (!ZIPCODE.test(query.zipcode)) {
            errors.push(`zipcode must be a 5 digit zip code (got "${query.zipcode}")`);
        } else {
            filters.zipcode = query.zipcode;
        }
    }

    if (query.minPrice !== undefined) filters.minPrice = parseInteger(errors, "minPrice", query.minPrice);
    if (query.maxPrice !== undefined) filters.maxPrice = parseInteger(errors, "maxPrice", query.maxPrice);
    if (query.beds !== undefined) filters.beds = parseInteger(errors, "beds", query.beds, { max: 100 });
    if (query.baths !== undefined) filters.baths = parseDecimal(errors, "baths", query.baths);

    if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice) {
        errors.push("minPrice cannot be greater than maxPrice");
    }

    const sort = parseSort(errors, query.sortBy, query.sortOrder);
    const limit = query.limit === undefined ? DEFAULT_LIMIT : parseInteger(errors, "limit", query.limit, { min: 1, max: MAX_LIMIT });
    const offset = query.offset === undefined ? 0 : parseInteger(errors, "offset", query.offset);

    if (errors.length > 0) return { errors };
    return { filters, sort, limit, offset };
}

// Returns null when no sort was asked for, otherwise { sortBy, sortOrder }.
function parseSort(errors, sortBy, sortOrder) {
    if (sortBy === undefined) {
        if (sortOrder !== undefined) errors.push("sortOrder can only be used together with sortBy");
        return null;
    }
    if (!Object.hasOwn(SORT_COLUMNS, sortBy)) {
        errors.push(`sortBy must be one of: ${Object.keys(SORT_COLUMNS).join(", ")} (got "${sortBy.slice(0, 50)}")`);
        return null;
    }

    const order = sortOrder === undefined ? "asc" : sortOrder.toLowerCase();
    if (!SORT_ORDERS.includes(order)) {
        errors.push(`sortOrder must be asc or desc (got "${sortOrder.slice(0, 50)}")`);
        return null;
    }
    return { sortBy, sortOrder: order };
}

function buildOrderBy(sort) {
    if (!sort) return "ORDER BY id";

    const { column, nullable } = SORT_COLUMNS[sort.sortBy];
    const direction = sort.sortOrder === "desc" ? "DESC" : "ASC";
    const nullsLast = nullable && direction === "ASC" ? `${column} IS NULL, ` : "";
    return `ORDER BY ${nullsLast}${column} ${direction}, id ${direction}`;
}

// Each condition is pushed together with its value so the ? placeholders and the values array can never get out of order.
function buildWhereClause(filters) {
    const conditions = [];
    const values = [];

    if (filters.city !== undefined) {
        conditions.push("LOWER(TRIM(L_City)) = LOWER(TRIM(?))");
        values.push(filters.city);
    }
    if (filters.zipcode !== undefined) {
        // Prefix match so ZIP+4 values like "92618-1234" are included.
        conditions.push("L_Zip LIKE ?");
        values.push(`${filters.zipcode}%`);
    }
    if (filters.minPrice !== undefined) {
        conditions.push("L_SystemPrice >= ?");
        values.push(filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
        conditions.push("L_SystemPrice <= ?");
        values.push(filters.maxPrice);
    }
    if (filters.beds !== undefined) {
        conditions.push("L_Keyword2 >= ?");
        values.push(filters.beds);
    }
    if (filters.baths !== undefined) {
        conditions.push("LM_Dec_3 >= ?");
        values.push(filters.baths);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return { where, values };
}

function parseListingId(raw) {
    if (!LISTING_ID.test(raw)) {
        return { error: `Listing ID must be 1 to 20 digits (got "${raw.slice(0, 50)}")` };
    }
    return { listingId: raw };
}

function buildPropertyQueries({ filters, sort = null, limit, offset }) {
    const { where, values } = buildWhereClause(filters);

    return {
        count: {
            sql: `SELECT COUNT(*) AS total FROM rets_property ${where}`,
            values,
        },
        results: {
            sql: `SELECT ${RESULT_COLUMNS} FROM rets_property ${where} ${buildOrderBy(sort)} LIMIT ? OFFSET ?`,
            // mysql2 prepared statements need LIMIT/OFFSET sent as strings on MySQL 8.0.22+
            values: [...values, String(limit), String(offset)],
        },
    };
}

module.exports = {
    DEFAULT_LIMIT,
    MAX_LIMIT,
    SORT_COLUMNS,
    parsePropertyQuery,
    parseListingId,
    buildWhereClause,
    buildOrderBy,
    buildPropertyQueries,
};
