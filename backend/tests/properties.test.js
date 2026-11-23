const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");
const pool = require("../db/pool");
const { parsePropertyQuery, buildWhereClause, buildOrderBy } = require("../utils/propertyQuery");

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
    it("defaults to limit 20, offset 0 and no sort", () => {
        assert.deepEqual(parsePropertyQuery({}), { filters: {}, sort: null, limit: 20, offset: 0 });
    });

    it("parses sortBy and sortOrder (order defaults to asc)", () => {
        assert.deepEqual(parsePropertyQuery({ sortBy: "price", sortOrder: "DESC" }).sort, { sortBy: "price", sortOrder: "desc" });
        assert.deepEqual(parsePropertyQuery({ sortBy: "listDate" }).sort, { sortBy: "listDate", sortOrder: "asc" });
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
        ["sortBy=ListPrice (RESO name)", { sortBy: "ListPrice" }],
        ["sortBy=L_SystemPrice (raw column)", { sortBy: "L_SystemPrice" }],
        ["sortBy with SQL in it", { sortBy: "price; DROP TABLE rets_property" }],
        ["sortBy=toString (inherited property)", { sortBy: "toString" }],
        ["sortOrder=sideways", { sortBy: "price", sortOrder: "sideways" }],
        ["sortOrder without sortBy", { sortOrder: "desc" }],
    ];

    for (const [label, query] of invalid) {
        it(`rejects ${label}`, () => {
            const { errors } = parsePropertyQuery(query);
            assert.ok(errors && errors.length > 0);
        });
    }
});

describe("buildOrderBy", () => {
    it("keeps the original id order when no sort is given", () => {
        assert.equal(buildOrderBy(null), "ORDER BY id");
    });

    it("uses the real rets_property column with id as a same-direction tiebreaker", () => {
        assert.equal(buildOrderBy({ sortBy: "price", sortOrder: "desc" }), "ORDER BY L_SystemPrice DESC, id DESC");
        assert.equal(buildOrderBy({ sortBy: "listDate", sortOrder: "asc" }), "ORDER BY ListingContractDate ASC, id ASC");
    });

    it("puts missing values last for columns that can be NULL", () => {
        assert.equal(buildOrderBy({ sortBy: "sqft", sortOrder: "asc" }), "ORDER BY LM_Int2_3 IS NULL, LM_Int2_3 ASC, id ASC");
        assert.equal(buildOrderBy({ sortBy: "sqft", sortOrder: "desc" }), "ORDER BY LM_Int2_3 DESC, id DESC");
    });
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

describe("GET /api/properties sorting", () => {
    function assertSorted(values, order) {
        for (let i = 1; i < values.length; i++) {
            const ok = order === "asc" ? values[i - 1] <= values[i] : values[i - 1] >= values[i];
            assert.ok(ok, `not ${order} at index ${i}: ${values[i - 1]} then ${values[i]}`);
        }
    }

    it("sorts by price low to high", async () => {
        const { status, body } = await getProperties("?sortBy=price&sortOrder=asc&limit=100");
        assert.equal(status, 200);
        assertSorted(body.results.map((p) => p.price), "asc");

        const [[cheapest]] = await pool.execute("SELECT MIN(L_SystemPrice) AS price FROM rets_property");
        assert.equal(body.results[0].price, cheapest.price);
    });

    it("sorts by price high to low", async () => {
        const { body } = await getProperties("?sortBy=price&sortOrder=desc&limit=100");
        assertSorted(body.results.map((p) => p.price), "desc");

        const [[priciest]] = await pool.execute("SELECT MAX(L_SystemPrice) AS price FROM rets_property");
        assert.equal(body.results[0].price, priciest.price);
    });

    it("sorts by date listed, newest first", async () => {
        const { status, body } = await getProperties("?sortBy=listDate&sortOrder=desc&limit=100");
        assert.equal(status, 200);
        assertSorted(body.results.map((p) => p.listedDate), "desc");

        const [[newest]] = await pool.execute(
            "SELECT DATE_FORMAT(MAX(ListingContractDate), '%Y-%m-%d') AS listedDate FROM rets_property",
        );
        assert.equal(body.results[0].listedDate, newest.listedDate);
    });

    it("sorts within the filtered results", async () => {
        const { body } = await getProperties("?city=Irvine&beds=3&sortBy=price&sortOrder=desc&limit=100");
        assert.ok(body.total > 0);
        assertSorted(body.results.map((p) => p.price), "desc");
        for (const property of body.results) {
            assert.equal(property.city.trim().toLowerCase(), "irvine");
            assert.ok(property.beds >= 3);
        }
    });

    it("keeps the sort across pages with no overlap or gaps", async () => {
        const first60 = await getProperties("?sortBy=price&sortOrder=asc&limit=60");
        const page2 = await getProperties("?sortBy=price&sortOrder=asc&limit=20&offset=20");
        const page3 = await getProperties("?sortBy=price&sortOrder=asc&limit=20&offset=40");

        assert.deepEqual(
            [...page2.body.results, ...page3.body.results].map((p) => p.id),
            first60.body.results.slice(20, 60).map((p) => p.id),
        );
    });

    it("puts properties with no sqft at the end, even when sorting smallest first", async () => {
        const { body: smallest } = await getProperties("?sortBy=sqft&sortOrder=asc&limit=5");
        assert.ok(smallest.results.every((p) => p.sqft !== null));

        const { body: all } = await getProperties("?sortBy=sqft&sortOrder=asc&limit=1");
        const { body: last } = await getProperties(`?sortBy=sqft&sortOrder=asc&limit=1&offset=${all.total - 1}`);
        assert.equal(last.results[0].sqft, null);
    });

    it("puts properties with no sqft at the end when sorting largest first too", async () => {
        const { body: largest } = await getProperties("?sortBy=sqft&sortOrder=desc&limit=5");
        assert.ok(largest.results.every((p) => p.sqft !== null));

        const { body: last } = await getProperties(`?sortBy=sqft&sortOrder=desc&limit=1&offset=${largest.total - 1}`);
        assert.equal(last.results[0].sqft, null);
    });

    for (const query of ["?sortBy=ListPrice", "?sortBy=L_SystemPrice", "?sortBy=price&sortOrder=up", "?sortOrder=desc", "?sortBy=id%20DESC"]) {
        it(`returns 400 for ${query}`, async () => {
            const { status, body } = await getProperties(query);
            assert.equal(status, 400);
            assert.equal(body.error, "Invalid query parameters");
            assert.match(body.details.join(" "), /sort/);
        });
    }
});
