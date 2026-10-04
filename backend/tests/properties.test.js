const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");
const pool = require("../db/pool");
const { parsePropertyQuery, buildWhereClause } = require("../utils/propertyQuery");

let server;
let baseUrl;

async function getProperties(query = "") {
    const res = await fetch(`${baseUrl}/api/properties${query}`);
    return { status: res.status, body: await res.json() };
}

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
    server.close();
    await pool.end();
});

describe("buildWhereClause", () => {
    it("returns an empty WHERE when there are no filters", () => {
        assert.deepEqual(buildWhereClause({}), { where: "", values: [] });
    });

    // Debug challenge: every ? must line up with the value at the same position; if values get pushed in a different order than conditions, this becomes L_SystemPrice >= 3 AND L_Keyword2 >= 300000 and the count is wrong.
    it("keeps minPrice and beds values in the same order as their placeholders", () => {
        const { where, values } = buildWhereClause({ minPrice: 300000, beds: 3 });
        assert.equal(where, "WHERE L_SystemPrice >= ? AND L_Keyword2 >= ?");
        assert.deepEqual(values, [300000, 3]);
    });

    it("has one value per placeholder with every filter applied", () => {
        const { where, values } = buildWhereClause({
            city: "Irvine",
            zipcode: "92618",
            minPrice: 300000,
            maxPrice: 900000,
            beds: 3,
            baths: 2.5,
        });
        assert.equal((where.match(/\?/g) || []).length, values.length);
        assert.deepEqual(values, ["Irvine", "92618%", 300000, 900000, 3, 2.5]);
    });
});

describe("parsePropertyQuery", () => {
    it("defaults to limit 20 and offset 0", () => {
        assert.deepEqual(parsePropertyQuery({}), { filters: {}, limit: 20, offset: 0 });
    });

    const invalid = [
        ["minPrice=abc", { minPrice: "abc" }],
        ["limit=0", { limit: "0" }],
        ["limit=200", { limit: "200" }],
        ["limit=abc", { limit: "abc" }],
        ["offset=-1", { offset: "-1" }],
        ["beds=2.5", { beds: "2.5" }],
        ["baths=two", { baths: "two" }],
        ["zipcode=abcde", { zipcode: "abcde" }],
        ["city=(blank)", { city: "   " }],
        ["minPrice > maxPrice", { minPrice: "900000", maxPrice: "100000" }],
        ["unknown param", { bedrooms: "3" }],
        ["repeated param", { city: ["Irvine", "Tustin"] }],
    ];

    for (const [label, query] of invalid) {
        it(`rejects ${label}`, () => {
            const { errors } = parsePropertyQuery(query);
            assert.ok(errors && errors.length > 0);
        });
    }
});

describe("GET /api/properties", () => {
    it("returns 20 properties by default with a total count", async () => {
        const { status, body } = await getProperties();
        assert.equal(status, 200);
        assert.equal(body.limit, 20);
        assert.equal(body.offset, 0);
        assert.equal(body.results.length, 20);
        assert.ok(body.total > 20);
    });

    it("?limit=10&offset=20 returns properties 21-30", async () => {
        const first30 = await getProperties("?limit=30");
        const page = await getProperties("?limit=10&offset=20");
        assert.equal(page.status, 200);
        assert.deepEqual(
            page.body.results.map((p) => p.id),
            first30.body.results.slice(20, 30).map((p) => p.id),
        );
    });

    it("?city=Irvine returns only Irvine properties", async () => {
        const { status, body } = await getProperties("?city=Irvine&limit=100");
        assert.equal(status, 200);
        assert.ok(body.total > 0);
        for (const property of body.results) {
            assert.equal(property.city.trim().toLowerCase(), "irvine");
        }
    });

    it("city matching ignores casing and whitespace", async () => {
        const normal = await getProperties("?city=Irvine");
        const messy = await getProperties("?city=%20%20iRVINE%20");
        assert.equal(messy.body.total, normal.body.total);
    });

    it("combines city, minPrice and beds", async () => {
        const { status, body } = await getProperties("?city=Irvine&minPrice=300000&beds=3&limit=100");
        assert.equal(status, 200);
        assert.ok(body.total > 0);
        for (const property of body.results) {
            assert.equal(property.city.trim().toLowerCase(), "irvine");
            assert.ok(property.price >= 300000);
            assert.ok(property.beds >= 3);
        }
    });

    // Compare against a count written by hand, independent of the query builder.
    it("total is correct when minPrice and beds are combined", async () => {
        const [[expected]] = await pool.execute(
            "SELECT COUNT(*) AS total FROM rets_property WHERE L_SystemPrice >= ? AND L_Keyword2 >= ?",
            [300000, 3],
        );
        const { body } = await getProperties("?minPrice=300000&beds=3");
        assert.ok(expected.total > 0);
        assert.equal(body.total, expected.total);
    });

    it("filters by zipcode, maxPrice and baths", async () => {
        const { status, body } = await getProperties("?zipcode=92618&maxPrice=1500000&baths=2&limit=100");
        assert.equal(status, 200);
        for (const property of body.results) {
            assert.ok(property.zipcode.startsWith("92618"));
            assert.ok(property.price <= 1500000);
            assert.ok(Number(property.baths) >= 2);
        }
    });

    for (const query of ["?minPrice=abc", "?limit=0", "?limit=200"]) {
        it(`returns 400 for ${query}`, async () => {
            const { status, body } = await getProperties(query);
            assert.equal(status, 400);
            assert.equal(body.error, "Invalid query parameters");
            assert.ok(body.details.length > 0);
        });
    }

    it("treats SQL in a filter as a plain value", async () => {
        const { status, body } = await getProperties(`?city=${encodeURIComponent("Irvine' OR '1'='1")}`);
        assert.equal(status, 200);
        assert.equal(body.total, 0);
    });
});
