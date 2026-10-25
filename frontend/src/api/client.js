// All requests go to /api/*, which the dev server proxies to the Express API
export class ApiError extends Error {
    constructor(message, status, details = []) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.details = details;
    }
}

function describeError(res, body) {
    if (body && body.error) {
        const details = Array.isArray(body.details) && body.details.length > 0 ? `: ${body.details.join("; ")}` : "";
        return `${body.error}${details}`;
    }

    if (res.status >= 500) {
        return "Couldn't reach the API server. Make sure the backend is running.";
    }

    return `Request failed with status ${res.status}`;
}

async function request(path, { signal } = {}) {
    let res;

    try {
        res = await fetch(path, { signal });
    } catch (err) {
        if (err.name === "AbortError") throw err;
        throw new ApiError("Couldn't reach the server. Check your connection and that the backend is running.", 0);
    }

    const body = await res.json().catch(() => null);

    if (!res.ok) {
        throw new ApiError(describeError(res, body), res.status, body?.details);
    }
    if (body === null) {
        throw new ApiError("The server sent back a response that wasn't valid JSON.", res.status);
    }
    return body;
}

// Empty values are left out so the API doesn't receive e.g. ?city= and reject it.
function toQueryString(params) {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || String(value).trim() === "") continue;
        search.append(key, String(value).trim());
    }

    const query = search.toString();
    return query ? `?${query}` : "";
}

// Resolves to { total, limit, offset, results }.
export function fetchProperties(params = {}, options = {}) {
    return request(`/api/properties${toQueryString(params)}`, options);
}

export function fetchPropertyDetail(id, options = {}) {
    return request(`/api/properties/${encodeURIComponent(id)}`, options);
}
