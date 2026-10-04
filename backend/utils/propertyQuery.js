const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const ALLOWED_PARAMS = ["city", "zipcode", "minPrice", "maxPrice", "beds", "baths", "limit", "offset"];

const INTEGER = /^\d+$/;
const DECIMAL = /^\d+(\.\d+)?$/;
const ZIPCODE = /^\d{5}$/;

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
    PhotoCount AS photoCount
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

    const limit = query.limit === undefined
        ? DEFAULT_LIMIT
        : parseInteger(errors, "limit", query.limit, { min: 1, max: MAX_LIMIT });
    const offset = query.offset === undefined
        ? 0
        : parseInteger(errors, "offset", query.offset);

    if (errors.length > 0) return { errors };
    return { filters, limit, offset };
}

// Each condition is pushed together with its value so the ? placeholders and the
// values array can never get out of order.
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

function buildPropertyQueries({ filters, limit, offset }) {
    const { where, values } = buildWhereClause(filters);

    return {
        count: {
            sql: `SELECT COUNT(*) AS total FROM rets_property ${where}`,
            values,
        },
        results: {
            sql: `SELECT ${RESULT_COLUMNS} FROM rets_property ${where} ORDER BY id LIMIT ? OFFSET ?`,
            // mysql2 prepared statements need LIMIT/OFFSET sent as strings on MySQL 8.0.22+
            values: [...values, String(limit), String(offset)],
        },
    };
}

module.exports = {
    DEFAULT_LIMIT,
    MAX_LIMIT,
    parsePropertyQuery,
    buildWhereClause,
    buildPropertyQueries,
};
