const priceFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

export function formatPrice(value) {
    const number = toNumber(value);
    return number === null ? "Price unavailable" : priceFormatter.format(number);
}

export function formatNumber(value, fallback = "—") {
    const number = toNumber(value);
    return number === null ? fallback : numberFormatter.format(number);
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
});

// "2026-10-17" -> "Saturday, October 17, 2026"
export function formatDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
    if (!match) return null;

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

// "13:00:00" -> "1:00 PM"
export function formatTime(value) {
    const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ""));
    if (!match) return null;

    const hours = Number(match[1]);
    if (hours > 23) return null;
    return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? "PM" : "AM"}`;
}

export function humanize(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .split(",")
        .map((part) => part.trim().replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2"))
        .filter(Boolean)
        .join(", ");
}
