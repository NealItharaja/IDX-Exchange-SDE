export function parsePhotos(raw) {
    if (Array.isArray(raw)) return raw.filter(isPhotoUrl).map((url) => url.trim());
    if (typeof raw !== "string" || raw.trim() === "") return [];

    let parsed;

    try {
        parsed = JSON.parse(raw);
    } catch {
        return isPhotoUrl(raw) ? [raw.trim()] : [];
    }

    if (typeof parsed === "string") return isPhotoUrl(parsed) ? [parsed.trim()] : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPhotoUrl).map((url) => url.trim());
}

export function getFirstPhoto(raw) {
    return parsePhotos(raw)[0] ?? null;
}

function isPhotoUrl(value) {
    return typeof value === "string" && /^https?:\/\/\S+$/i.test(value.trim());
}
