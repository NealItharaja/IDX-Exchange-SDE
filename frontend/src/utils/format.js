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
