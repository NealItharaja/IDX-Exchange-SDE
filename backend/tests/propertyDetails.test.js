const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");
const pool = require("../db/pool");
const { parseListingId } = require("../utils/propertyQuery");

let server;
let baseUrl;
let withOpenHouse;
let withoutOpenHouse;
let orphanOpenHouse;

async function get(path) {
    const res = await fetch(`${baseUrl}${path}`);
    return { status: res.status, body: await res.json() };
}

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://localhost:${server.address().port}`;

    const [[a]] = await pool.query(
        "SELECT p.L_ListingID AS id FROM rets_property p JOIN rets_openhouse o ON o.L_ListingID = p.L_ListingID LIMIT 1",
    );
    const [[b]] = await pool.query(
        `SELECT p.L_ListingID AS id FROM rets_property p
         LEFT JOIN rets_openhouse o ON o.L_ListingID = p.L_ListingID
         WHERE o.id IS NULL LIMIT 1`,
    );
    const [[c]] = await pool.query(
        `SELECT o.L_ListingID AS id FROM rets_openhouse o
         LEFT JOIN rets_property p ON p.L_ListingID = o.L_ListingID
         WHERE p.id IS NULL LIMIT 1`,
    );
    withOpenHouse = a.id;
    withoutOpenHouse = b.id;
    orphanOpenHouse = c.id;
});

after(async () => {
    server.close();
    await pool.end();
});

describe("parseListingId", () => {
    it("accepts a normal listing ID", () => {
        assert.deepEqual(parseListingId("1190952876"), { listingId: "1190952876" });
    });

    for (const raw of ["abc123", "12.5", "-1", "1 OR 1=1", "", "1".repeat(21)]) {
        it(`rejects "${raw.length > 25 ? `${raw.slice(0, 10)}...` : raw}"`, () => {
            assert.ok(parseListingId(raw).error);
        });
    }
});

describe("GET /api/properties/:id", () => {
    it("returns the full property object", async () => {
        const { status, body } = await get(`/api/properties/${withOpenHouse}`);
        assert.equal(status, 200);
        assert.equal(body.L_ListingID, withOpenHouse);
        assert.ok("L_Remarks" in body);
        assert.ok("L_Photos" in body);
    });

    it("returns 404 with a helpful message for an unknown ID", async () => {
        const { status, body } = await get("/api/properties/9999999999");
        assert.equal(status, 404);
        assert.match(body.error, /9999999999/);
    });

    for (const id of ["abc123", "12.5", "1".repeat(21), "%27%20OR%20%271%27%3D%271", "%E0%A4%A"]) {
        it(`returns 400 for /api/properties/${id}`, async () => {
            const { status, body } = await get(`/api/properties/${id}`);
            assert.equal(status, 400);
            assert.ok(body.error);
        });
    }
});

describe("GET /api/properties/:id/openhouses", () => {
    it("returns open houses for a property, ordered by date and start time", async () => {
        const { status, body } = await get(`/api/properties/${withOpenHouse}/openhouses`);
        assert.equal(status, 200);
        assert.ok(Array.isArray(body));
        assert.ok(body.length > 0);

        const keys = body.map((oh) => `${oh.date} ${oh.startTime}`);
        assert.deepEqual(keys, [...keys].sort());
        for (const openHouse of body) {
            assert.equal(openHouse.listingId, withOpenHouse);
            assert.match(openHouse.date, /^\d{4}-\d{2}-\d{2}$/);
            assert.equal(typeof openHouse.allData, "string");
        }
    });

    it("returns an empty array for a property with no open houses", async () => {
        const { status, body } = await get(`/api/properties/${withoutOpenHouse}/openhouses`);
        assert.equal(status, 200);
        assert.deepEqual(body, []);
    });

    it("returns 404 for open houses whose property doesn't exist", async () => {
        const { status } = await get(`/api/properties/${orphanOpenHouse}/openhouses`);
        assert.equal(status, 404);
    });

    it("returns 400 for a malformed ID", async () => {
        const { status } = await get("/api/properties/abc123/openhouses");
        assert.equal(status, 400);
    });

    it("can't query rets_openhouse with an ID latin1 can't represent", async () => {
        await assert.rejects(
            pool.execute("SELECT id FROM rets_openhouse WHERE L_ListingID = ?", ["１２３"]),
            { code: "ER_IMPOSSIBLE_STRING_CONVERSION" },
        );
    });

    for (const id of ["１２３", "😀"]) {
        it(`returns 400 instead of crashing for ${id}`, async () => {
            const { status } = await get(`/api/properties/${encodeURIComponent(id)}/openhouses`);
            assert.equal(status, 400);
        });
    }

    it("isn't swallowed by the /:id route", async () => {
        const { body } = await get(`/api/properties/${withOpenHouse}/openhouses`);
        assert.ok(Array.isArray(body));
        assert.equal(body.L_ListingID, undefined);
    });
});

describe("request logger", () => {
    it("prints method, URL, status code and duration for every request", async () => {
        const lines = [];
        const original = console.log;
        console.log = (...args) => lines.push(args.join(" "));
        try {
            await get("/api/properties/abc123");
            await get(`/api/properties/${withOpenHouse}`);
        } finally {
            console.log = original;
        }

        assert.ok(lines.some((line) => /^\[.+Z\] GET \/api\/properties\/abc123 400 \d+\.\d{2}ms$/.test(line)));
        assert.ok(lines.some((line) => new RegExp(`GET /api/properties/${withOpenHouse} 200 \\d+\\.\\d{2}ms$`).test(line)));
    });
});
