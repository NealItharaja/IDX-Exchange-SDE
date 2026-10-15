const express = require("express");
const pool = require("../db/pool");
const { parsePropertyQuery, parseListingId, buildPropertyQueries } = require("../utils/propertyQuery");
const router = express.Router();

router.get("/", async (req, res) => {
    const parsed = parsePropertyQuery(req.query);
    if (parsed.errors) {
        return res.status(400).json({ error: "Invalid query parameters", details: parsed.errors });
    }

    const { count, results } = buildPropertyQueries(parsed);
    try {
        const [[countRows], [resultRows]] = await Promise.all([
            pool.execute(count.sql, count.values),
            pool.execute(results.sql, results.values),
        ]);

        res.json({
            total: countRows[0].total,
            limit: parsed.limit,
            offset: parsed.offset,
            results: resultRows,
        });
    } catch (err) {
        console.error("GET /api/properties failed:", err);
        res.status(500).json({ error: "Failed to fetch properties" });
    }
});

router.get("/:id/openhouses", async (req, res) => {
    const { listingId, error } = parseListingId(req.params.id);
    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const [properties] = await pool.execute(
            "SELECT id FROM rets_property WHERE L_ListingID = ? LIMIT 1",
            [listingId],
        );
        if (properties.length === 0) {
            return res.status(404).json({ error: `No property found with listing ID ${listingId}` });
        }

        const [openHouses] = await pool.execute(
            `SELECT
                id,
                L_ListingID AS listingId,
                DATE_FORMAT(OpenHouseDate, '%Y-%m-%d') AS date,
                OH_StartTime AS startTime,
                OH_EndTime AS endTime,
                all_data AS allData
            FROM rets_openhouse
            WHERE L_ListingID = ?
            ORDER BY OpenHouseDate, OH_StartTime`,
            [listingId],
        );

        res.json(openHouses);
    } catch (err) {
        console.error(`GET /api/properties/${listingId}/openhouses failed:`, err);
        res.status(500).json({ error: "Failed to fetch open houses" });
    }
});

router.get("/:id", async (req, res) => {
    const { listingId, error } = parseListingId(req.params.id);
    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const [properties] = await pool.execute(
            "SELECT * FROM rets_property WHERE L_ListingID = ? ORDER BY id LIMIT 1",
            [listingId],
        );
        if (properties.length === 0) {
            return res.status(404).json({ error: `No property found with listing ID ${listingId}` });
        }

        res.json(properties[0]);
    } catch (err) {
        console.error(`GET /api/properties/${listingId} failed:`, err);
        res.status(500).json({ error: "Failed to fetch property" });
    }
});

module.exports = router;
